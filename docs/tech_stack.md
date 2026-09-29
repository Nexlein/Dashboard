# Tech Stack Decisions

## Frontend: React (Vite)

- **Component-Based**: Perfect for isolated widgets.
- **Ecosystem**: Access to `react-grid-layout` for drag-and-drop dashboard grids.
- **State Management**: `zustand` for lightweight, predictable global state (user auth, widget layout).
- **UI Components**: `shadcn/ui` (Radix Primitives) for accessible, unstyled building blocks.
- **Vite & PWA**: Fast build times with `vite-plugin-pwa` for standalone app installation.
- **Tailwind CSS**: Rapid UI development and native Dark/Light mode support.
- **i18n**: `react-i18next` for English/French translations.

## Backend: Node.js (Express)

- **Security & Caching**: `express-rate-limit` (backed by Redis) to prevent attacks, and Redis to protect external APIs.
- **OAuth2 Support**: Passport.js simplifies integration with external services.
- **JSON Native**: Makes serving the required `about.json` and API routes trivial.
- **Port 8080**: Replicas sit behind an Nginx reverse proxy.

## Database: PostgreSQL

- **Relational Data**: Maps well to `User -> Dashboard -> Widgets -> Configuration`.
- **Reliability**: Strong data integrity for user credentials and OAuth tokens.

## ORM: Prisma

- **Type Safety**: Auto-generates client. Catch DB errors at compile time.
- **Speed**: Schema syntax defines tables quickly. Easy migrations (`prisma migrate dev`).
- **Connection**: Bridges Node.js Express backend directly to PostgreSQL container.

## Infrastructure: Docker Compose

- Orchestrates the full stateless architecture with dedicated containers for:
  - Frontend (React/Vite)
  - Backend API Replicas (x3)
  - Nginx Load Balancer
  - Redis Cache
  - PostgreSQL Database
