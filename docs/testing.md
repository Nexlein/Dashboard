# Testing Guidelines

## Overview

| Layer    | Tools                          | Location                         |
| -------- | ------------------------------ | -------------------------------- |
| Shared   | Vitest                         | `shared/tests/`                  |
| Backend  | Vitest, Supertest              | `backend/tests/`                 |
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

All backend tests are located in `backend/tests/` and are type-checked with the sources
(`npm run typecheck -w backend`). There are two suites:

- **Unit tests** (`npm test -w backend`, no database). Prisma is mocked with
  `vi.mock('../src/utils/prisma.ts')` returning a hoisted object of `vi.fn()` stubs, and Better
  Auth with a stand-in (`tests/setup.ts`): `signedInAs(userId)` from `helpers.ts` chooses who is
  signed in. `helpers.ts` also provides `stubFetch`.
- **Integration tests** (`tests/integration/`, `npm run test:integration -w backend`): the real
  app, Better Auth and Prisma against a disposable PostgreSQL database; only GitHub is faked
  (`fakeGitHub` in `tests/integration/helpers.ts`) and emails are captured (`lastCode` reads
  the codes). They cover every authentication rule: sign-up declarations and the shared
  schema, email verification codes (wrong, expired, attempts, hashed storage), password
  reset, email change, cookie attributes, the token kept out of JSON
  responses, sign-out and expiry revoking sessions, CSRF, GitHub sign-up/sign-in/linking
  (browser binding, state replay, refusals, unverified emails, no takeover of email accounts,
  encrypted tokens used by the widgets), GDPR export and deletion, and the admin plugin.

Unit test files:

- `api.test.ts`: Core tests for endpoints (`/health`, `/about.json`, `/widgets/*` including id
  validation, update payloads, ownership and chat forwarding, `/services`) and the sign-in
  rate limit.
- `account.test.ts`: `/account/*`, the session and Origin checks of the API routes, GitHub as a
  service (linked or not, unlinking).
- `env.test.ts`: environment validation (defaults, empty values, invalid input, SMTP
  required in production).
- `mailer.test.ts`: SMTP sending, the development fallback and the code emails.
- `crypto.test.ts`: CoinGecko credential verification, normalized price and
  historical responses, caching, multi-asset limits, supported periods, provider
  errors, and legacy full-history fallback. All CoinGecko calls are mocked.
- `redisCache.test.ts`: Validates graceful fallback to local memory maps when Redis is unavailable.
- `stocks.test.ts`: Twelve Data histories including ALL and 5Y, company logos, shared provider credit budgets, deferred retries, and partial symbol failures. API tests cover authenticated stock search, local configuration validation, and retry headers; stock component tests cover comparison curves, profiles, period controls, and retention of cached charts during provider cooldowns.

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
- Tests are type-checked like the app (`tsconfig.test.json`, part of `tsc -b`). Build test
  data with `makeWidget`, `makeUser` and `makeService` from `frontend/src/test/fixtures.ts`
  so fixtures keep the real shapes; `makeWidget` goes through the same API mapping as the app.
- Prefer `mockApi({ 'GET /widgets': { body: [...] } })` over mocking modules: it stubs
  `fetch` per route and fails on any unexpected request, so the test runs through the real
  API client, React Query hooks and components.
- Routing is tested through `AppRoutes` inside a `MemoryRouter` (see `App.test.tsx`).
- Hooks that call the API (`features/widgets/hooks/useWidgets.ts`, `features/services/hooks/useServices.ts`) are mocked with `vi.mock` in component tests.

## GDPR regression coverage

- `tests/integration/account.test.ts`: readable exports without passwords, tokens or API keys,
  profile edits, account deletion (cascades, recent sign-in or password, CSRF).
- `tests/integration/auth.test.ts` and `github.test.ts`: CGU and age declarations on email and
  GitHub registration, including declarations missing from the OAuth state.
- `account.test.ts`: failed exports when stored data cannot be decrypted, profile validation.
- `encryption.test.ts`: key derivation from `ENCRYPTION_KEY` / `BETTER_AUTH_SECRET`, JSON
  round trips, tamper and wrong-key rejection, and ciphertexts written by the previous
  implementation that must stay readable.
- `PrivacyActions.test.tsx` and `AuthPage.test.tsx`: successful/failed downloads and
  deletions, cancellation, editable OAuth profiles and both registration checkboxes.

Run frontend tests with Node 24 (the frontend dependency versions require it).
CI runs the frontend tests, type-check/build and lint, the backend unit tests,
and the integration tests against a disposable PostgreSQL service.

For real PostgreSQL validation, prepare an **isolated, disposable** database:

```bash
cd backend
# Set TEST_DATABASE_URL to that disposable database only.
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm run test:integration
```

The integration tests create users with random emails and never send requests to GitHub.
They write and delete users, so never target a real database.
The test does not contact GitHub: a subprocess-only fixture supplies provider
responses. Unit tests additionally cover provider and database failures.

## End-to-End Tests

Playwright tests in `e2e/tests/` drive the real frontend and backend:

- `auth.spec.ts`: redirect of anonymous visitors, register (with the emailed code) /
  sign in / sign out through the UI, wrong-password error, forgotten password reset, and
  the session token kept from page scripts. Codes are read from Mailpit's API.
- `widgets.spec.ts`: add a widget through the configurator and delete one, both
  checked after a reload. Only the Ollama model listing is stubbed.
- `a11y.spec.ts`: axe scans of `/login`, `/register` and the dashboard with every
  rule enabled, and the light theme on public pages under a dark OS scheme.

Run them with the database and Mailpit (a test inbox, started only for these tests) up. The
backend Playwright starts sends its emails to Mailpit whatever `backend/.env` says, so the
tests never email real addresses. Stop any backend already running on port 8080 first:
Playwright would reuse it.

```bash
docker compose up -d db redis
docker compose --profile e2e up -d mailpit
npm run db:deploy -w backend
npm exec -w e2e -- playwright install chromium   # first time only
npm run test:e2e
```

Playwright starts both dev servers and raises `AUTH_RATE_LIMIT_MAX` for the backend
it starts, since every test registers a new user.
