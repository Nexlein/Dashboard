# Tech Stack Decisions

## Frontend: React (Vite)

- **Component-Based**: Perfect for isolated widgets.
- **Ecosystem**: Access to `react-grid-layout` for drag-and-drop dashboard grids and charting libraries.
- **Vite**: Fast build times and HMR.

## Backend: Node.js (Express)

- **OAuth2 Support**: Passport.js simplifies integration with external services (Google, GitHub, etc.).
- **JSON Native**: Makes serving the required `about.json` and API routes trivial.
- **Port 8080**: Easy to isolate and map in Docker.

## Database: PostgreSQL

- **Relational Data**: Maps well to `User -> Dashboard -> Widgets -> Configuration`.
- **Reliability**: Strong data integrity for user credentials and OAuth tokens.

## ORM: Prisma

- **Type Safety**: Auto-generates client. Catch DB errors at compile time.
- **Speed**: Schema syntax defines tables quickly. Easy migrations (`prisma migrate dev`).
- **Connection**: Bridges Node.js Express backend directly to PostgreSQL container.

## Infrastructure: Docker Compose

- Separates frontend, backend, and database into distinct containers.
- Meets Epitech grading requirements.
