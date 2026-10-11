# Tech stack: choices and trade-offs

For each choice: what we use, why, what else we considered, and what it costs us.

## Overview

| Layer          | Choice                                 | Main reason                                           |
| -------------- | -------------------------------------- | ----------------------------------------------------- |
| Language       | TypeScript everywhere                  | One language, types shared by front and back          |
| Frontend       | React 19 + Vite                        | Widgets are components; huge ecosystem; fast dev      |
| Styling        | Tailwind CSS 4 + shadcn/ui             | Fast to build, accessible components we own           |
| Server state   | TanStack Query                         | Caching and timed refresh (widget timer) built in     |
| Dashboard grid | react-grid-layout                      | Drag, resize, responsive grid ready-made              |
| Translations   | i18next / react-i18next                | Standard, typed keys, plurals and formats             |
| Backend        | Node.js 24 + Express 5                 | Same language as the front, simple, well known        |
| Authentication | Better Auth                            | Sessions, email codes, OAuth, admin without rewriting |
| Validation     | Zod                                    | One schema, shared by front and back                  |
| Database       | PostgreSQL 15 + Prisma 7               | Relational data, safe migrations, typed queries       |
| Cache          | Redis 7                                | Shared by the 3 API replicas                          |
| Infrastructure | Docker Compose + Nginx                 | One command to run everything; load balancing         |
| Chatbot        | Ollama                                 | Local model: free, private, no API key                |
| Tests          | Vitest, Playwright, axe, Lighthouse CI | Fast unit tests, real browser tests, a11y and perf    |
| Code quality   | oxlint, Prettier, Husky, commitlint    | Fast checks on every commit                           |

## Language: TypeScript

- **Why**: errors caught before running; the `shared` workspace gives the same types and Zod
  schemas to the frontend and the backend (a field renamed on one side breaks the build on the
  other).
- **Alternatives**: plain JavaScript (no setup, but errors show up at runtime); Python for the
  backend (FastAPI is good, but two languages and no shared types).
- **Cost**: some setup and type errors to fix. Node 24 runs `.ts` files directly, so there is
  no build step on the backend; `tsc` only checks types in CI.

## Frontend

### React + Vite

- **Why React**: a widget is a component, which fits the project exactly. Biggest ecosystem
  (grid layout, charts, accessible components), the team already knew it.
- **Why Vite**: instant dev server, fast builds, code splitting (each page and widget is loaded
  only when needed).
- **Alternatives**: Vue (simpler learning curve, smaller ecosystem for dashboards); Angular
  (complete but heavy, slow to learn); Next.js (server rendering is useless here: everything is
  behind a login, and the subject asks for a separate API on port 8080).
- **Cost**: React leaves many choices to us (routing, state, forms).

### Tailwind CSS 4 + shadcn/ui

- **Why**: styles written next to the markup, dark mode with one class, no CSS files to name.
  shadcn/ui copies the components into our code (we can change them) and builds them on
  Radix/Base UI, which handle keyboard, focus and ARIA.
- **Alternatives**: Material UI (complete, but heavy and hard to restyle); plain CSS modules
  (full control, much slower to write).
- **Cost**: long class lists in the markup.

### TanStack Query

- **Why**: fetches, caches and refreshes server data. `refetchInterval` is our widget timer;
  it also retries, dedupes requests and keeps the last data during a refresh.
- **Alternatives**: `useEffect` + `fetch` (simple at first, then we rewrite caching, errors and
  timers by hand); Redux Toolkit Query (similar, but brings Redux for nothing).
- **Cost**: one more concept to learn (query keys, invalidation).

### react-grid-layout

- **Why**: drag, resize and a responsive grid out of the box.
- **Alternatives**: dnd-kit (more flexible, but the grid logic is ours to write); Gridstack
  (not React-first).
- **Cost**: no keyboard support built in, so we added our own (arrow keys move and resize).

### i18next

- **Why**: the standard for React translations: namespaces per feature, typed keys (a missing
  key fails the build), plurals, language detection.
- **Alternatives**: FormatJS / react-intl (good for formats, heavier syntax); our own JSON
  lookup (small, but no plurals or detection).

## Backend

### Node.js + Express 5

- **Why**: same language as the frontend; Express is minimal and known by everyone; Express 5
  handles `async` errors by itself.
- **Alternatives**: NestJS (clean structure, but a lot of boilerplate and a steep learning
  curve for a small API); Fastify (faster, but the speed gain does not matter here, Express is
  better known); Python/FastAPI (excellent, but a second language).
- **Cost**: Express gives no structure; we keep it with `routes/`, `controllers/`,
  `services/`.

### Better Auth

- **Why**: email/password, email codes, GitHub OAuth, several linked accounts, sessions in a
  database and an admin API, all secure by default. We first wrote our own JWT auth: Better
  Auth removed that code and its risks.
- **Alternatives**: our own JWT code (full control, but every security detail is on us);
  Passport.js (only strategies, sessions and accounts still to write); Auth0/Clerk (hosted,
  paid past a quota, user data at a third party, against our GDPR goals).
- **Cost**: we follow its database tables and hooks.
- **Sessions vs JWT**: sessions in PostgreSQL behind an httpOnly cookie can be revoked at once
  (sign-out, ban, deletion); a JWT stays valid until it expires and a script could read it from
  `localStorage`.

### Zod

- **Why**: one schema validates the request and gives the TypeScript type; shared with the
  frontend forms. Also checks the environment at startup (the server refuses to start with a
  bad config).
- **Alternatives**: Joi (no TypeScript types from the schema); class-validator (needs classes
  and decorators).

## Data

### PostgreSQL

- **Why**: users, widgets, linked accounts and connections are relational (a user owns widgets
  and connections); constraints and transactions protect them. Free and standard.
- **Alternatives**: MongoDB (flexible documents, but our data has relations and needs
  integrity); SQLite (simple file, but not shared by 3 replicas in containers).

### Prisma 7

- **Why**: typed queries generated from the schema, versioned SQL migrations applied at
  startup, readable schema file.
- **Alternatives**: TypeORM (decorators, weaker types); Drizzle (lighter, closer to SQL, less
  mature tooling when we started); raw SQL (full control, no types).
- **Cost**: a generation step (`prisma generate`) after each schema change.

### Redis

- **Why**: the 3 API replicas share one cache and one rate limiter. When Redis is down, the
  cache falls back to memory and rate limiting is skipped, so the API keeps working.
- **Alternatives**: `node-cache` (in memory: each replica would have its own cache and its own
  rate-limit counters, so 3 times the API calls and 3 times the allowed sign-in attempts);
  caching in PostgreSQL (works, but slower and wears the main database).

## Infrastructure

### Docker Compose

- **Why**: the subject requires it; one command (`docker compose up --build`) starts
  everything with the same versions on every machine.
- **Alternatives**: Kubernetes (scaling and self-healing, far too heavy for this project);
  running services by hand (each developer installs PostgreSQL, Redis… in different versions).

### Nginx + 3 API replicas

- **Why**: Nginx receives port 8080 and spreads requests over 3 identical API containers (Docker
  DNS round robin). One replica can crash without taking the API down, and it shows the API is
  stateless: sessions in PostgreSQL, cache and limits in Redis.
- **Alternatives**: one API container (simpler, but a single point of failure); Traefik or
  HAProxy (good, but Nginx is the most documented).
- **Cost**: anything kept in memory is per replica, so everything shared goes to Redis or
  PostgreSQL.

### Ollama

- **Why**: runs the chatbot model locally: free, no key, conversations stay on our server.
- **Alternatives**: OpenAI or Anthropic APIs (better answers, but paid, need a key and send the
  conversations to a third party).
- **Cost**: needs RAM and CPU; small models answer less well.

## External providers

| Service | Provider    | Why this one                                       | Alternative not taken                   |
| ------- | ----------- | -------------------------------------------------- | --------------------------------------- |
| Weather | OpenWeather | Free key, current weather and 5-day forecast       | WeatherAPI (similar, smaller free tier) |
| Crypto  | CoinGecko   | Free demo key, prices and history for every coin   | Binance API (only coins listed there)   |
| Stocks  | Twelve Data | Free key, search, quotes, history, logos           | Alpha Vantage (25 calls a day for free) |
| GitHub  | GitHub API  | OAuth: private repositories of the user's accounts | Public API only (no private data)       |
| YouTube | Public RSS  | No key or Google account needed                    | YouTube Data API (OAuth, daily quota)   |

Each user brings their own API key: our quotas are not shared between users, and keys are
verified, then encrypted in the database.

## Tests and quality

- **Vitest**: same config as Vite, runs TypeScript directly, fast. Jest needed extra setup for
  TypeScript and ES modules.
- **Playwright**: tests in a real Chromium, waits automatically, traces on failure. Cypress is
  similar but slower and limited to one tab.
- **axe + Lighthouse CI**: accessibility, performance and SEO checked on every pull request
  (see [lighthouse.md](lighthouse.md)).
- **oxlint + Prettier**: oxlint is written in Rust and is much faster than ESLint; Prettier
  ends formatting debates. **Husky + commitlint** check each commit before it is created.
