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

1. **Build the Application**

   ```bash
   docker-compose build
   ```

### 1. Configure Environment
Before starting the project, you must set up the environment variables:
```bash
cp .env.example ./backend/.env
```
*(Fill in the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `./backend/.env` if you want to test OAuth linking).*

### 2. Run with Docker
Start the entire stack (Frontend, Backend, Database) using Docker Compose:
```bash
docker-compose up --build
```

3. **Access the Application**
   - Frontend: [http://localhost:8081](http://localhost:8081)
   - Backend API: [http://localhost:8080](http://localhost:8080)
   - `about.json`: [http://localhost:8080/about.json](http://localhost:8080/about.json)

*Note: The backend will automatically apply the database schema on startup.*
