# Epitech Dashboard

## Overview

A customizable web dashboard that allows authenticated users to monitor digital content through interactive widgets. Users can subscribe to various services, configure personalized widgets, and organize them on a drag-and-drop grid.

## Key Features

- **User Authentication**: Secure register and login via JWT & bcrypt.
- **Service Integration**: Supports OAuth 2.0 linking for 3rd-party platforms.
- **Dynamic Widgets**:
  - Each widget has configurable parameters.
  - Multiple instances of the same widget can display distinct data.
- **Auto-Refresh Engine**: Widget data updates automatically based on a configured timer.

### Included Services

1. **Weather**: Current Temperature, 5-Day Forecast.
2. **GitHub**: Repository Stats, Latest Commits, User Profile. (Also supports GitHub Login / Account Creation)
3. **CoinGecko**: Cryptocurrency Price & Market Stats, Crypto Market Comparison Chart.

CoinGecko and OpenWeather use a personal API key entered by each authenticated
user from the **Services** page. These keys are verified before storage,
encrypted in PostgreSQL, and never exposed to the frontend after connection.

The Crypto Market widget supports one to eight CoinGecko assets, EUR/USD/GBP,
individually toggleable normalized curves, and 1W, 1M, 3M, and 1Y periods.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, shadcn/ui, React-Grid-Layout, Zustand
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: Docker & Docker Compose, Nginx (Load Balancer), Redis (Shared Cache)

## Documentation

- [System Architecture](docs/architecture.md)
- [Project Requirements & Constraints](docs/requirements.md)
- [Database Schema](docs/db_schema.md)
- [API Reference](docs/api.md)
- [Testing Guidelines](docs/testing.md)

## Installation & Usage

1. **Configure the Backend**

   Copy the example once, keeping any existing local configuration:

   ```bash
   cp -n backend/.env.example backend/.env
   ```

   Set `JWT_SECRET` in `backend/.env` to a long random value. You can generate one
   with `openssl rand -hex 32`. Fill in `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   and `GITHUB_CALLBACK_URL` to enable GitHub linking. Register this callback in
   your GitHub OAuth App: `http://localhost:8080/auth/github/callback`.
   `CORS_ORIGINS` lists the frontend origins allowed to call the API; the example
   includes Vite on ports 5173/5174 and the Docker frontend on port 8081.
   Keep `backend/.env` private; commit only the example file.

2. **Run with Docker**

   Prepare the database schema once, then start the stack:

   ```bash
   docker compose up -d db
   docker compose exec db pg_isready -U user -d dashboard
   # Wait for "accepting connections" before applying the schema.
   docker compose run --rm --build --no-deps server npx prisma db push
   docker compose up --build
   ```

3. **Database Seeding (Test Data)**

   To populate the database with mock accounts and widgets for testing, run the Prisma seeder from within the backend container:

   ```bash
   docker compose exec server npx prisma db seed
   ```

   **Available Test Accounts:**
   - **Admin:** `admin@dashboard.local` / `admin`
   - **User:** `user@dashboard.local` / `user` (comes pre-configured with a Weather and GitHub widget)

4. **Access the Application**
   - Frontend: [http://localhost:8081](http://localhost:8081)
   - Backend API: [http://localhost:8080](http://localhost:8080)
   - `about.json`: [http://localhost:8080/about.json](http://localhost:8080/about.json)

*The schema must exist before backend startup. OAuth token data is migrated automatically before the API accepts requests.*

### Run the backend outside Docker

After configuring `backend/.env` as above, keep `localhost:5433` in its
`DATABASE_URL`. Docker Compose overrides this with `db:5432` when the backend
itself runs inside Docker.

```bash
docker compose up -d db
docker compose exec db pg_isready -U user -d dashboard
cd backend
npm ci
npx prisma db push
node index.js
```

On the first database start, wait until `pg_isready` reports `accepting connections`
before running `prisma db push`. Run either the Docker backend or the local backend
on port 8080, not both at once.

See the [manual browser flow](docs/api.md#manual-browser-flow) to test GitHub
linking without a frontend. Run backend tests with `npm test` from `backend/`
and frontend tests with `npm test` from `frontend/`. Provider tests mock remote
APIs and do not require real OpenWeather, GitHub, or CoinGecko credentials.

### OAuth encryption and upgrades

OAuth tokens, widget parameters and API credentials use the same secret derivation
(AES-256-GCM with scrypt). `ENCRYPTION_KEY` may be a long random string such as the
64-character output of `openssl rand -hex 32`; when empty, the configured
`JWT_SECRET` is used. There is no public fallback key for new encrypted data.

Keep the chosen secret stable across restarts and identical across replicas.
Changing it without re-encrypting existing data makes that data unreadable. If
upgrading an existing installation that uses the JWT secret for encryption, keep
that configuration during the upgrade rather than introducing a new key.

Back up the database and stop old backend versions before upgrading. Every backend
startup migrates existing plaintext access and refresh tokens to the versioned
format before listening. It also upgrades tokens from the initial PR's unversioned
ciphertext, using the original key for decryption only. The migration is batched,
idempotent, and does not overwrite a concurrent refresh by another new replica.
A wrong key or damaged token stops startup without deleting or replacing that token.
Earlier successfully migrated batches remain valid and are skipped on retry.

To run the same migration explicitly after applying the schema:

```bash
cd backend
npm run migrate:oauth-tokens
```

This release adds a nullable, unique `User.githubId` column. For an existing
database, apply the additive, repeatable upgrade before starting the new backend:

```bash
cd backend
npm run migrate:github-identity
npx prisma generate
```

For Docker, use `docker compose run --rm --build --no-deps server npm run migrate:github-identity`
after stopping old backend instances. This adds only the nullable column and its
unique index; it does not delete data or require `--accept-data-loss`. Fresh databases
can use `npx prisma db push` as in the installation steps above. Existing accounts
acquire their GitHub ID on their next GitHub login/linking or before changing their
email. The OAuth token encryption migration itself does not change the schema.
Retained database backups may still contain old plaintext tokens; handle their
access and retention separately.
