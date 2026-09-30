# Testing Guidelines

## Overview

We use **Jest** and **Supertest** to verify our backend API routes. The CI pipeline runs these tests automatically on every PR and push to `main`.

## Rule for Developers

**If you add a new route, you MUST write a test for it.**
**If you modify a route, you MUST update its test.**

This ensures our API stays reliable and does not break existing integrations (like the frontend or external services).

## How to Run Tests

1. Ensure your database is running via `docker-compose up db -d` (if your test interacts with DB).
2. Go to the `backend/` folder.
3. Run `npm test`.

## Structure

All backend tests are located in `backend/tests/`.

- `api.test.js`: Core tests for endpoints (`/about.json`, `/auth/*`).
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

- `npm test` runs the frontend test suite in `jsdom`.
- Component tests are located alongside components (e.g. `Navbar.test.jsx`).
- `WidgetRenderer.test.jsx` covers crypto price rendering, multiple comparison
  curves, curve toggling, logos, and persisted period changes.
- `WidgetParameterField.test.jsx` covers arbitrary CoinGecko IDs and removing
  selected assets from the widget configuration.
- Global mocks (like `ResizeObserver` for the grid layout) are configured in `frontend/src/test/setup.js`.
- Ensure the store (Zustand) is reset before each test if mocked state is required.

## GDPR regression coverage

- `gdpr.test.js`: profile validation, OAuth email editing and stable GitHub login identity, readable exports
  without credentials, failed exports, account deletion errors, and age/terms
  checks on password and GitHub registration (including callback tampering).
- `tokenEncryption.test.js`: shared key derivation, arbitrary secret lengths,
  missing/wrong keys, tamper rejection, multi-batch migration, initial PR format
  compatibility, idempotence, and concurrent refresh protection.
- `PrivacyActions.test.jsx` and `AuthPage.test.tsx`: successful/failed downloads and
  deletions, cancellation, editable OAuth profiles and both registration checkboxes.

Run frontend tests with Node 24 (the frontend dependency versions require it).
CI runs the frontend tests, type-check/build and lint, the backend unit tests,
and the GDPR integration check against a disposable PostgreSQL service.

For real PostgreSQL validation, prepare an **isolated, disposable** database:

```bash
cd backend
# Set TEST_DATABASE_URL to that disposable database only.
DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push
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
