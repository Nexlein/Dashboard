# Epitech Dashboard

## Overview

A customizable web dashboard that allows authenticated users to monitor digital content through interactive widgets. Users can subscribe to various services, configure personalized widgets, and organize them on a drag-and-drop grid.

## Key Features

- **User Authentication**: [Better Auth](https://www.better-auth.com): email/password with an emailed verification code, forgotten-password reset by code, or GitHub sign-in; revocable sessions in an httpOnly cookie, CSRF protection, and an admin API.
- **Service Integration**: personal API keys (verified, then encrypted) and GitHub OAuth with several accounts per user.
- **Dynamic Widgets**:
  - Each widget has configurable parameters.
  - Multiple instances of the same widget can display distinct data.
- **Auto-Refresh Engine**: Widget data updates automatically based on a configured timer (60 s minimum), with a shared Redis cache.
- **Administration**: administrators manage roles, bans, sessions and account deletion.
- **French and English**, light and dark themes, and accessibility settings (WCAG 2.2 AA, Lighthouse 100 in accessibility).
- **GDPR**: data export and account deletion from the account menu.

### Included Services

1. **Weather**: Current Temperature, 5-Day Forecast.
2. **GitHub**: Repository Stats, Latest Commits, User Profile. (Also supports GitHub Login / Account Creation)
3. **CoinGecko**: Cryptocurrency Price & Market Stats, Crypto Market Comparison Chart.
4. **Twelve Data**: Stock comparison and single-company profiles with searchable symbols and historical periods.
5. **YouTube**: Video Player, Channel Watch (no API key).
6. **Chatbot**: Ollama Chat, a local AI model (no API key).

6 services and 12 widgets in total, listed with their parameters in `about.json`.

Twelve Data, CoinGecko and OpenWeather use a personal API key entered by each authenticated
user from the **Services** page. These keys are verified before storage,
encrypted in PostgreSQL, and never exposed to the frontend after connection.

The Crypto Market widget supports one to eight CoinGecko assets, EUR/USD/GBP,
individually toggleable normalized curves, and 1W, 1M, 3M, and 1Y periods.
The Stock Market widget searches Twelve Data symbols, compares up to eight stocks
with individually toggleable normalized curves, and supports 1W, 1M, 1Y, 5Y, and ALL.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS, shadcn/ui, React-Grid-Layout, TanStack Query
- **Backend**: Node.js, Express, TypeScript, Zod
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: Docker & Docker Compose, Nginx (Load Balancer), Redis (Shared Cache), Ollama (local LLM)
- **Tooling**: npm workspaces, Vitest, Playwright, axe, Lighthouse CI, oxlint, Prettier, Husky

## Repository Layout

npm workspaces sharing one root `package-lock.json`:

| Path        | Content                                                          |
| ----------- | ---------------------------------------------------------------- |
| `frontend/` | React + Vite client                                              |
| `backend/`  | Express API, Prisma schema, service integrations                 |
| `shared/`   | Zod schemas and TypeScript types used by backend and frontend    |
| `e2e/`      | Playwright end-to-end and accessibility tests                    |
| `docs/`     | Architecture, API, database, testing and compliance documents    |

Requirements: Node.js 24 (see `.nvmrc`, `nvm use`) and Docker with Docker Compose.

## Documentation

- [System Architecture](docs/architecture.md)
- [Project Requirements & Constraints](docs/requirements.md)
- [Database Schema](docs/db_schema.md)
- [API Reference](docs/api.md)
- [Testing Guidelines](docs/testing.md)
- [Tooling & CI](docs/tooling.md)
- [Tech Stack Decisions](docs/tech_stack.md)
- [User Guide](docs/user-guide.md)
- [How It Works](docs/how-it-works.md)
- [Accessibility](docs/accessibility.md)
- [Lighthouse Results](docs/lighthouse.md)
- [Translations](docs/i18n/README.md)
- [GDPR](docs/RGPD.md), [Terms of Use](docs/CGU.md), [Data Breach Plan](docs/DATA_BREACH_PLAN.md)

## Installation & Usage

1. **Configure the Backend**

   Copy the example once, keeping any existing local configuration:

   ```bash
   cp -n backend/.env.example backend/.env
   ```

   Set `BETTER_AUTH_SECRET` in `backend/.env` to a long random value. You can generate
   one with `openssl rand -hex 32`. `BETTER_AUTH_URL` is the API's public URL
   (`http://localhost:8080` by default). Fill in `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET` to enable GitHub sign-in and the GitHub service (widgets, with
   several GitHub accounts per user), and register both callback URLs in your GitHub OAuth
   App (GitHub matches them exactly): `http://localhost:8080/api/auth/callback/github` and
   `http://localhost:8080/api/auth/callback/github-service`. To use a separate OAuth App for
   the GitHub service, set `GITHUB_SERVICE_CLIENT_ID` and `GITHUB_SERVICE_CLIENT_SECRET`
   (they default to the sign-in app).
   YouTube needs no setup: add the Video Player widget and paste a video link
   (`youtube.com/watch`, `youtu.be`, Shorts, live or embed links).
   No API key, Google account linking or public website is needed. The player loads
   directly in the browser and has no refresh timer. Playback depends on the video's
   availability and whether its owner permits embedding.
   The Channel Watch widget follows up to five public channels from their links or
   `@handles`, merging their recent publications without an API key. Its refresh
   timer is configurable; public feeds are cached for ten minutes. Filter by
   channel, refresh manually, or mark publications as seen.
   Prefer a `/channel/UC…` URL or channel ID for reliable lookup: resolving an
   `@handle` depends on YouTube's public HTML and may break if that page changes.
   `CORS_ORIGINS` lists the frontend origins allowed to call the API; the example
   includes Vite on ports 5173/5174 and the Docker frontend on port 8081.
   `SMTP_*` configure the emails (verification and reset codes). With Gmail: turn on
   2-Step Verification on the Google account, create an app password at
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), then set
   `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER` (the Gmail
   address, also the sender) and `SMTP_PASSWORD` (the app password). Gmail sends about 500
   emails a day. `MAIL_FROM` changes the sender (default: `SMTP_USER`). With `SMTP_HOST` empty, a backend started with `npm run dev` prints the
   emails and their codes in its console; the Docker server (production mode) refuses to
   start without it.
   `AUTH_RATE_LIMIT_MAX` caps sign-in, sign-up and code requests per IP every 15 minutes
   (default 20) and `GLOBAL_RATE_LIMIT_MAX` all requests per IP (default 1000); with
   Redis the counters are shared by every backend replica. The backend validates these variables at startup and exits with
   an explicit message when one is invalid; empty values count as unset.
   Keep `backend/.env` private; commit only the example file.

2. **Run with Docker**

   ```bash
   docker compose up --build
   ```

   The server waits for PostgreSQL to be healthy and applies pending database
   migrations before accepting requests. Emails use the `SMTP_*` settings of
   `backend/.env`.

3. **Demo accounts (created at startup)**

   `docker compose up` creates these accounts the first time the server starts
   (`SEED_DEMO_DATA=true` in `docker-compose.yml`), already verified:
   - **Admin:** `admin@dashboard.local` / `admin1234` (opens **Administration**)
   - **User:** `user@dashboard.local` / `user1234`, with four widgets: YouTube Channel
     Watch and Video Player (they work at once), Weather and GitHub (they show how to
     connect a service in **Services**).

   Restarts keep them as they are. To recreate them with their original widgets:

   ```bash
   docker compose exec server npx prisma db seed
   ```

   Their passwords are public: remove `SEED_DEMO_DATA` on a real deployment. A new account
   signs in after entering the code emailed at registration.

4. **Access the Application**
   - Frontend: [http://localhost:8081](http://localhost:8081)
   - Backend API: [http://localhost:8080](http://localhost:8080)
   - `about.json`: [http://localhost:8080/about.json](http://localhost:8080/about.json)
   - API reference (Swagger): [http://localhost:8080/api-docs](http://localhost:8080/api-docs)

   Nginx listens on port 8080 and spreads requests over 3 API replicas.

*Database migrations run automatically before the API accepts requests.*

### Run the backend outside Docker

After configuring `backend/.env` as above, keep `localhost:5433` in its
`DATABASE_URL`. Docker Compose overrides this with `db:5432` when the backend
itself runs inside Docker.

```bash
docker compose up -d db redis
npm ci                          # from the repository root: installs every workspace
npm run build -w shared
npm run db:deploy -w backend    # apply database migrations
npm run dev -w backend          # API on http://localhost:8080
npm run dev -w frontend         # client on http://localhost:5173
```

On the first database start, wait a few seconds for PostgreSQL to accept connections
before applying migrations. Run either the Docker backend or the local backend on
port 8080, not both at once.

See the [manual browser flow](docs/api.md#manual-browser-flow) to test GitHub
linking without a frontend.

## Development

Run from the repository root:

```bash
npm test           # shared, backend and frontend unit tests
npm run lint       # oxlint + Prettier check
npm run build      # shared package and frontend production build
npm run test:e2e   # Playwright; needs the database, Mailpit (docker compose --profile e2e up -d mailpit)
                   # and backend/.env; starts both dev servers
npm run lighthouse # Lighthouse CI on the production build, see docs/lighthouse.md
```

Provider tests mock remote APIs and do not require real OpenWeather, GitHub, CoinGecko, or Twelve Data credentials. See [Testing Guidelines](docs/testing.md) for details.

To change the database, edit `backend/prisma/schema.prisma`, then create and apply a
migration and commit the generated folder (CI fails when the schema and the migrations
disagree):

```bash
npm run db:migrate -w backend -- --name add_widget_color
npm run db:generate -w backend   # Prisma 7 no longer regenerates the client on migrate
```

See [Database Schema](docs/db_schema.md#migrations) for the full workflow.

Commits follow [Conventional Commits](https://www.conventionalcommits.org)
(`feat:`, `fix:`, `test:`...), checked by commitlint. The pre-commit hook runs
oxlint and Prettier on staged files. See [Tooling](docs/tooling.md).

### Encryption at rest

Widget parameters and service API keys are encrypted with AES-256-GCM
(`backend/src/utils/encryption.ts`). The key is derived with scrypt from `ENCRYPTION_KEY`,
or from `BETTER_AUTH_SECRET` when `ENCRYPTION_KEY` is empty. GitHub tokens are encrypted by
Better Auth with a key derived from `BETTER_AUTH_SECRET`. Use a long random value such as
the output of `openssl rand -hex 32`.

Keep the secret stable across restarts and identical across replicas: changing it
makes existing encrypted data unreadable. Database backups contain the encrypted
values; protect the secret separately from them.

### Databases created before migrations

Databases created with `prisma db push` have no migration history, so
`migrate deploy` would try to create existing tables. If the schema is up to date,
mark the baseline migration as applied once:

```bash
cd backend
npx prisma migrate resolve --applied 20261004000000_init
```

For disposable development data, `npm run db:reset -w backend` drops the database
and recreates it from the migrations instead.
