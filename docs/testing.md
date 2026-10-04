# Testing Guidelines

## Overview

| Layer    | Tools                          | Location                         |
| -------- | ------------------------------ | -------------------------------- |
| Shared   | Vitest                         | `shared/tests/`                  |
| Backend  | Jest, Supertest                | `backend/tests/`                 |
| Frontend | Vitest, React Testing Library  | next to components (`*.test.tsx`)|
| E2E      | Playwright, axe-core           | `e2e/tests/`                     |
| Load     | k6                             | `backend/tests/k6/`              |

The CI pipeline runs all of them except k6 on every PR and push to `main`.

## Rule for Developers

**If you add a new route, you MUST write a test for it.**
**If you modify a route, you MUST update its test.**

This ensures our API stays reliable and does not break existing integrations (like the frontend or external services).

## How to Run Tests

From the repository root:

```bash
npm test                 # shared, backend and frontend unit tests
npm test -w backend      # a single workspace
npm run test:e2e         # end-to-end (see below)
```

Unit tests mock Prisma and external providers; they need no database. The root
`npm test` and `npm run test:e2e` scripts build `shared` and generate the Prisma client
first; when running a single workspace, run `npm run db:generate -w backend` once.

## Structure

All backend tests are located in `backend/tests/`.

- `api.test.js`: Core tests for endpoints (`/health`, `/about.json`, `/auth/*`, `/widgets/*`
  including id validation, update payloads, ownership and chat forwarding).
- `env.test.js`: environment validation (defaults, empty values, invalid input).
- `contract/api.contract.test.js`: the API rejects payloads the shared Zod schemas reject.
- `oauth.test.js`: GitHub redirects, browser cookie binding, state expiration and
  replay protection, token persistence and error handling. GitHub and Prisma are
  mocked; these tests require no real credentials or running database.
- `crypto.test.js`: CoinGecko credential verification, normalized price and
  historical responses, caching, multi-asset limits, supported periods, provider
  errors, and legacy full-history fallback. All CoinGecko calls are mocked.
- `redisCache.test.js`: Validates graceful fallback to local memory maps when Redis is unavailable.

*Note: For tests requiring the database, ensure you mock Prisma or use a separate test database.*

## Load & Performance Testing

The backend includes a **K6** testing suite in `backend/tests/k6/` to guarantee load balancing and rate limiting stability:
- `load.js`: Verifies sustained traffic processing capabilities.
- `stress.js`: Pushes the Nginx and Redis boundaries to determine breaking points.
- `spike.js`: Simulates sudden surges to ensure replicas can absorb viral traffic without cascading failures.

## Frontend Tests

The frontend uses **Vitest** and **React Testing Library**.

- `npm test -w frontend` runs the frontend test suite in `happy-dom`.
- Component tests are located alongside components (e.g. `Navbar.test.tsx`).
  `src/test-utils.tsx` renders components inside the Query client, theme and router providers.
- `features/widgets/lib/widgets.test.ts` covers the API-to-dashboard widget mapping (titles, sizes, refresh rate).
- `WidgetRenderer.test.tsx` covers crypto price rendering, multiple comparison
  curves, curve toggling, logos, and persisted period changes.
- `WidgetParameterField.test.tsx` covers arbitrary CoinGecko IDs and removing
  selected assets from the widget configuration.
- Global mocks (like `ResizeObserver` for the grid layout) are configured in `frontend/src/test/setup.ts`.
- Hooks that call the API (`features/widgets/hooks/useWidgets.ts`, `features/services/hooks/useServices.ts`) are mocked with `vi.mock` in component tests.

## GDPR regression coverage

- `gdpr.test.js`: profile validation, OAuth email editing and stable GitHub login identity, readable exports
  without credentials, failed exports, account deletion errors, and age/terms
  checks on password and GitHub registration (including callback tampering).
- `tokenEncryption.test.js`: shared key derivation, arbitrary secret lengths,
  missing/wrong keys, tamper rejection, multi-batch migration, initial PR format
  compatibility, idempotence, and concurrent refresh protection.
- `PrivacyActions.test.tsx` and `AuthPage.test.tsx`: successful/failed downloads and
  deletions, cancellation, editable OAuth profiles and both registration checkboxes.

Run frontend tests with Node 24 (the frontend dependency versions require it).
CI runs the frontend tests, type-check/build and lint, the backend unit tests,
and the GDPR integration check against a disposable PostgreSQL service.

For real PostgreSQL validation, prepare an **isolated, disposable** database:

```bash
cd backend
# Set TEST_DATABASE_URL to that disposable database only.
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm run test:gdpr-integration
```

The integration check creates temporary users, starts a backend on a temporary
port, verifies automatic token migration, exports, OAuth email editing and
foreign-key cascades, then removes its fixtures and stops the server. It also tests
GitHub account creation, the age gate, an email change and subsequent login using
real PostgreSQL and simulated GitHub responses. Startup
migration visits all OAuth rows in that database, so never target a real database.
The test does not contact GitHub: a subprocess-only fixture supplies provider
responses. Unit tests additionally cover provider and database failures.

## End-to-End Tests

Playwright tests in `e2e/tests/` drive the real frontend and backend:

- `auth.spec.ts`: redirect of anonymous visitors, register / sign in / sign out
  through the UI, wrong-password error.
- `widgets.spec.ts`: add a widget through the configurator and delete one, both
  checked after a reload. Only the Ollama model listing is stubbed.
- `a11y.spec.ts`: axe scans of `/login`, `/register` and the dashboard with every
  rule enabled, and the light theme on public pages under a dark OS scheme.

Run them with the database up and `backend/.env` configured:

```bash
docker compose up -d db redis
npm run db:deploy -w backend
npm exec -w e2e -- playwright install chromium   # first time only
npm run test:e2e
```

Playwright starts both dev servers and raises `AUTH_RATE_LIMIT_MAX` for the backend
it starts, since every test registers a new user.
