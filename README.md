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

### Included Services (Planned)

1. **Weather**: Current Temperature, 5-Day Forecast.
2. **GitHub**: Repository Stats, Latest Commits.
3. **YouTube**: Video Stats, Channel Subscribers.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, React-Grid-Layout
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: Docker & Docker Compose

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
   Keep `backend/.env` private; commit only the example file.

2. **Build the Application**

   ```bash
   docker compose build
   ```

3. **Start the Services**

   ```bash
   docker compose up -d
   ```

4. **Access the Application**
   - Frontend: [http://localhost:8081](http://localhost:8081)
   - Backend API: [http://localhost:8080](http://localhost:8080)
   - `about.json`: [http://localhost:8080/about.json](http://localhost:8080/about.json)

*Note: The backend will automatically apply the database schema on startup.*

### Run the backend outside Docker

After configuring `backend/.env` as above, keep `localhost:5432` in its
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
linking without a frontend. Run backend tests with `npm test` from `backend/`;
the OAuth tests mock GitHub and Prisma and do not require real credentials or a database.
