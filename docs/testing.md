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

*Note: For tests requiring the database, ensure you mock Prisma or use a separate test database.*

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
