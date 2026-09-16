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

*Note: For tests requiring the database, ensure you mock Prisma or use a separate test database.*
