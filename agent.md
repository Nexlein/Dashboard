# Agent Context

**Project**: Dashboard (B-DEV-500)
**Group Size**: 2

## Core Objective

Build a web dashboard (React/Express/PostgreSQL) allowing users to configure and view widgets connected to external services.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS + `react-grid-layout`
- **Backend**: Node.js (Express), Prisma ORM
- **Database**: PostgreSQL (Containerized)
- **Deployment**: Docker Compose (`server` on 8080, `client` on 8081)

## Agent Rules & Guidelines

1. **Tests**: Whenever adding or modifying an API route, you MUST update/add Jest tests in `backend/tests/`. Read `docs/testing.md`.
2. **Database**: We use an iterative schema approach via Prisma. Update `backend/prisma/schema.prisma` and run `npx prisma format` when data structures change. Read `docs/db_schema.md`.
3. **Docs**: Keep `docs/api.md` and `docs/requirements.md` up to date when delivering epics.
4. **Constraints**: Follow all requirements strictly (e.g., `about.json`, port 8080, Docker compatibility).

## Relevant Documentation

- [Requirements](docs/requirements.md)
- [API Routes](docs/api.md)
- [DB Schema](docs/db_schema.md)
- [Testing Guidelines](docs/testing.md)
