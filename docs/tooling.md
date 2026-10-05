# Project Tooling & Automation

## 1. Workspaces & Node version

- **npm workspaces**: `shared`, `backend`, `frontend` and `e2e` install together from the root with one `package-lock.json`. Run `npm ci` at the root, never inside a package.
- **Node.js 24**: pinned in `.nvmrc` and used by CI and the Docker images (`engines` accepts >= 22.18, the first release that runs TypeScript without a flag).
- **Install scripts**: `allowScripts` in the root `package.json` approves the packages that must run install scripts (bcrypt, Prisma).

## 2. Git Hooks (Husky, lint-staged & commitlint)

- **pre-commit**: lint-staged runs oxlint and Prettier on staged files only. If either fails, the commit stops.
- **commit-msg**: commitlint enforces [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `test:`, `docs:`, `build:`, `ci:`...).

## 3. Linting & Formatting

- **oxlint** (`.oxlintrc.json`): one config for the whole repository. `any` is rejected in TypeScript (`typescript/no-explicit-any`); use `unknown` and narrow it. It also enforces package boundaries: `frontend` may not import `backend` or `e2e` code, and `shared` may not import either app.
- **Prettier** (`.prettierrc`): 4 spaces, single quotes, 100 columns. `.editorconfig` mirrors the basics for editors.
- `npm run lint` runs both checks, as CI does. oxlint runs with `--deny-warnings`, so a warning fails the build; disable a rule for specific files in `.oxlintrc.json` overrides rather than leaving warnings.

## 4. GitHub Actions (CI/CD)

- **CI Pipeline (`.github/workflows/ci.yml`)**, on pushes and pull requests to `main`:
  - `lint`: oxlint and Prettier.
  - `test-shared`, `test-backend` (with PostgreSQL: migrations applied and checked against the schema, then the GDPR integration check), `test-frontend` (with coverage).
  - `test-e2e`: Playwright against the dev servers and a PostgreSQL service.
  - `docker`: builds both images with Docker Compose.
- **Mirror Pipeline (`.github/workflows/mirror.yml`)**: Automatically pushes your code to the Epitech grading repository when you push to `main`. Requires the `SSH_PRIVATE_KEY` secret in GitHub.
- **Dependabot (`.github/dependabot.yml`)**: weekly updates for npm (root lockfile, minor/patch grouped), the Dockerfiles and GitHub Actions.

## 5. Docker Compose

- **docker-compose.yml**: Orchestrates the entire app. Images build with the repository root as context; the root `.dockerignore` keeps `.env` files and build output out of them.
  - `client`: React Vite frontend served by nginx (port 8081). `frontend/nginx/default.conf.template` adds security headers (Content-Security-Policy, `X-Frame-Options`, `nosniff`, `Referrer-Policy`), gzip, and long-term caching of hashed assets. Set `API_ORIGIN` to the backend URL the browser calls; the CSP only allows requests to it.
  - `nginx`: Load balancer for backend replicas (port 8080).
  - `server`: Express Node.js backend replicas (internal).
  - `redis`: Centralized caching and state store (port 6379).
  - `db`: PostgreSQL 15 database (port 5433).
  - `ollama`: local LLM server for the chatbot widget (port 11434).

## 6. Testing

- **Vitest & React Testing Library**: Frontend unit and component testing.

- **Vitest & Supertest**: Backend unit and API tests (`backend/tests/`). Ensures routes like `/auth/login` and `/about.json` function correctly.

- **TypeScript**: the backend is written in TypeScript and Node runs the `.ts` sources directly (type stripping), in development and in the Docker image. `tsc` only type-checks (`npm run typecheck -w backend`, run by CI); see `backend/tsconfig.json` for the syntax limits this implies.

- **Playwright & axe-core**: End-to-end and accessibility tests (`e2e/`).

- **K6**: Used for backend load, stress, and spike testing (`backend/tests/k6/`). Ensures Nginx routing and Redis caching remain stable under extreme concurrency.
