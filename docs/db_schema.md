# Database Schema

This document outlines the PostgreSQL database schema managed by Prisma.
It supports the core Dashboard features: User Identity, OAuth Linking, and Widget Configuration.
The schema lives in `backend/prisma/schema.prisma` and its history in
`backend/prisma/migrations/` (see [Migrations](#migrations)).

## Models

### 1. User

The core entity representing a registered user. `User`, `Session`, `Account` and
`Verification` follow [Better Auth's schema](https://www.better-auth.com/docs/concepts/database)
(`backend/src/auth.ts`), with integer ids (`generateId: "serial"`).

| Field                               | Type      | Description                                                    |
| ----------------------------------- | --------- | -------------------------------------------------------------- |
| `id`                                | Int       | Primary Key                                                    |
| `name`                              | String    | Display name; empty when the user did not give one             |
| `email`                             | String    | Unique email address                                           |
| `emailVerified`                     | Boolean   | `true` after the emailed code, or when GitHub verified it      |
| `image`                             | String?   | Avatar URL (GitHub)                                            |
| `role`                              | String?   | `user` or `admin` (admin plugin)                               |
| `banned`, `banReason`, `banExpires` |           | Ban state (admin plugin)                                       |
| `cguAcceptedAt`                     | DateTime? | When the user accepted the CGU and confirmed being 16 or older |
| `language`                          | String    | User's i18n preference (`en` or `fr`), defaults to `en`        |
| `theme`                             | String    | User's theme preference (`light`, `dark`, or `system`)         |
| `createdAt`                         | DateTime  | Timestamp of creation                                          |
| `updatedAt`                         | DateTime  | Timestamp of last update                                       |

**Relations:** `sessions`, `accounts`, `widgets`, `serviceConnections` (One-to-Many, each
cascades on delete).

---

### 2. Account, Session and Verification (Better Auth)

**Account**: one row per sign-in method or connected GitHub account of a user.

| Field                                                    | Type    | Description                                                           |
| -------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `providerId`                                             | String  | `credential` (email/password), `github` (sign-in) or `github-service` |
| `accountId`                                              | String  | The GitHub user id, or the user id for `credential`                   |
| `password`                                               | String? | Password hash (scrypt), `credential` only                             |
| `accessToken`, `refreshToken`, `idToken`                 | String? | GitHub tokens, encrypted (AES-256-GCM)                                |
| `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope` |         | Token metadata                                                        |

`(providerId, accountId)` is unique: a GitHub account belongs to one Dashboard account.

**Session**: `token` (unique, the value of the session cookie), `expiresAt`, `ipAddress`,
`userAgent`, `impersonatedBy` (admin plugin), `userId`.

**Verification**: short-lived values (`identifier`, `value`, `expiresAt`): OAuth states and
the emailed 6-digit codes (hashed, with their attempt count).

---

### 3. WidgetConfig

Stores a widget instance configured by a user. Supports multiple instances of the same widget with distinct parameters.

| Field         | Type   | Description                                            |
| ------------- | ------ | ------------------------------------------------------ |
| `id`          | Int    | Primary Key                                            |
| `userId`      | Int    | Foreign Key to `User`                                  |
| `serviceName` | String | Name of the service (e.g., `weather` or `crypto`)      |
| `widgetName`  | String | Name of the widget (e.g., `current_weather`)           |
| `params`      | Json   | Configurable parameters stored as JSON                 |
| `refreshRate` | Int    | Refresh interval in seconds                            |
| `layout`      | Json   | Grid coordinates for UI rendering (`x`, `y`, `w`, `h`) |

`userId` is indexed: the dashboard loads widgets by owner on every visit.

**Relations:**

- `user`: Belongs to `User`. Cascades on delete.

---

### 4. ServiceConnection

Stores one user-owned credential set for a configurable external service.

| Field                  | Type     | Description                                          |
| ---------------------- | -------- | ---------------------------------------------------- |
| `id`                   | Int      | Primary key                                          |
| `userId`               | Int      | Owner of the connection                              |
| `serviceName`          | String   | Registry service name, such as `weather` or `crypto` |
| `encryptedCredentials` | Json     | AES-256-GCM encrypted provider credentials           |
| `keyHint`              | String?  | Last four characters shown in the UI                 |
| `verifiedAt`           | DateTime | Last successful provider verification                |
| `createdAt`            | DateTime | Timestamp of creation                                |
| `updatedAt`            | DateTime | Timestamp of the latest credential replacement       |

`userId` and `serviceName` are unique together. Deleting the user deletes all
their service connections.

## Prisma setup

- `backend/prisma.config.ts` gives the CLI the database URL (`DATABASE_URL`, read from
  `backend/.env` when present), the migrations folder and the seed command.
- `prisma generate` writes the client to `backend/src/generated/prisma` (gitignored). Import
  models and types from there; the app uses the single instance in `src/utils/prisma.ts`,
  which connects through the `pg` driver adapter (`@prisma/adapter-pg`).

## Migrations

Schema changes are versioned with Prisma Migrate. Each folder in
`backend/prisma/migrations/` holds the SQL for one change and is applied once, in order.

| Command (from the repository root)                 | Use                                                         |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `npm run db:migrate -w backend -- --name <change>` | After editing `schema.prisma`: create and apply a migration |
| `npm run db:deploy -w backend`                     | Apply pending migrations (CI, local setup)                  |
| `npm run db:reset -w backend`                      | Drop the development database and replay every migration    |
| `npm run db:generate -w backend`                   | Regenerate the Prisma Client after a schema change          |

- Since Prisma 7, migrate commands neither regenerate the client nor seed: run
  `db:generate` after a schema change, and `npx prisma db seed` (from `backend/`) to recreate
  the demo accounts. With `SEED_DEMO_DATA=true` (set in `docker-compose.yml`) the server
  creates the missing ones at startup (`src/utils/demoData.ts`), under a database lock so
  replicas starting together create each account once.
- Commit the generated migration folder together with the schema change. CI fails
  when `schema.prisma` differs from the migrated database.
- Never edit a migration that has been merged; add a new one instead.
- The Docker server applies pending migrations at startup (`prisma migrate deploy`).
  Replicas starting together are safe: Prisma takes a database lock.
- `20261004000000_init` is the baseline matching the schema when migrations were
  introduced. Databases created earlier with `prisma db push` mark it as applied with
  `npx prisma migrate resolve --applied 20261004000000_init` (from `backend/`).
- `20261005125900_better_auth` moves authentication to Better Auth's tables. It removes the
  accounts created before it (their passwords and GitHub tokens used other formats) with
  their widgets and connections; the demo accounts come back at the next startup (or run
  `npx prisma db seed`).
