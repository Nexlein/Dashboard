# Tech Stack Decisions

## Frontend: React (Vite)

- **Component-Based**: Perfect for isolated widgets.
- **Ecosystem**: Access to `react-grid-layout` for drag-and-drop dashboard grids.
- **TypeScript**: Typed components and API contracts; types for auth payloads come from the `shared` workspace.
- **Server State**: TanStack Query fetches, caches and refreshes widgets and services (`refetchInterval` drives widget auto-refresh). The theme preference is a small React context.
- **UI Components**: `shadcn/ui` (Radix / Base UI primitives) for accessible, unstyled building blocks.
- **Vite**: Fast dev server and builds, with route-level code splitting (`React.lazy`).
- **Tailwind CSS**: Rapid UI development and native Dark/Light mode support.

## Backend: Node.js (Express, TypeScript)

- **TypeScript without a build step**: Node 24 runs the `.ts` sources directly (type stripping), so development, tests and the Docker image execute the same files. `tsc` type-checks in CI; Prisma generates the database types.
- **Security & Caching**: `helmet` headers, `express-rate-limit` (global and authentication limits backed by Redis so they hold across replicas), and Redis to cache external API responses.
- **Validation**: Zod validates request bodies and the environment at boot. Auth schemas live in the `shared` workspace so backend and frontend agree on them.
- **OAuth2 Support**: A dedicated GitHub OAuth flow (state cookie binding, encrypted token storage) without an extra auth framework.
- **JSON Native**: Makes serving the required `about.json` and API routes trivial.
- **Port 8080**: Replicas sit behind an Nginx reverse proxy.

## Database: PostgreSQL

- **Relational Data**: Maps well to `User -> Dashboard -> Widgets -> Configuration`.
- **Reliability**: Strong data integrity for user credentials and OAuth tokens.

## ORM: Prisma

- **Type Safety**: Auto-generates client. Catch DB errors at compile time.
- **Migrations**: Prisma Migrate keeps a versioned SQL history in `backend/prisma/migrations/`, applied automatically when the server starts.
- **Connection**: Bridges Node.js Express backend directly to PostgreSQL container.

## Infrastructure: Docker Compose

- Orchestrates the full stateless architecture with dedicated containers for:
  - Frontend (React/Vite)
  - Backend API Replicas (x3)
  - Nginx Load Balancer
  - Redis Cache
  - PostgreSQL Database
  - Ollama (local LLM for the chatbot widget)
