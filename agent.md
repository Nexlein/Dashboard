# Agent Context

**Project**: Dashboard (B-DEV-500)
**Group Size**: 2

## Core Objective

Build a web dashboard (React/Express/PostgreSQL) allowing users to configure and view widgets connected to external services.

## Tech Stack

- **Frontend**: React (Vite, TypeScript) + Tailwind CSS + `shadcn/ui` + TanStack Query + `react-grid-layout`
- **Backend**: Node.js (Express, TypeScript run directly by Node), Prisma ORM, Zod
- **Shared**: `shared/` workspace with Zod schemas and types used by both apps
- **Tooling**: npm workspaces (run `npm ci`, `npm test`, `npm run lint` from the root), Node 24
- **Database**: PostgreSQL (Containerized)
- **Deployment**: Docker Compose (`server` on 8080, `client` on 8081)

## Agent Rules & Guidelines

1. **Tests**: Whenever adding or modifying an API route, you MUST update/add Vitest tests in `backend/tests/`. Read `docs/testing.md`.
2. **Database**: Schema changes go through Prisma Migrate. Edit `backend/prisma/schema.prisma`, run `npm run db:migrate -w backend -- --name <change>`, and commit the migration folder with the schema. Never edit a merged migration. Read `docs/db_schema.md`.
3. **Docs**: Keep `docs/api.md` and `docs/requirements.md` up to date when delivering epics.
4. **Constraints**: Follow all requirements strictly (e.g., `about.json`, port 8080, Docker compatibility).
5. **Checks**: Before committing, `npm test`, `npm run lint` and `npm run typecheck -w backend` must pass; user-facing flows are covered by Playwright in `e2e/`. Commit messages follow Conventional Commits.

## Relevant Documentation

- [System Architecture](docs/architecture.md)
- [Requirements](docs/requirements.md)
- [API Routes](docs/api.md)
- [DB Schema](docs/db_schema.md)
- [Testing Guidelines](docs/testing.md)
