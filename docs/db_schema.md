# Database Schema

This document outlines the PostgreSQL database schema managed by Prisma.
It supports the core Dashboard features: User Identity, OAuth Linking, and Widget Configuration.

## Models

### 1. User

The core entity representing a registered user on the platform.

| Field           | Type      | Description                                                   |
| --------------- | --------- | ------------------------------------------------------------- |
| `id`            | Int       | Primary Key                                                   |
| `githubId`      | String?   | Unique stable GitHub account ID, independent of the editable email |
| `email`         | String    | Unique email address                                          |
| `displayName`   | String?   | Optional display name used to personalize the interface       |
| `password`      | String?   | Hashed password (Nullable if logged in exclusively via OAuth) |
| `isAdmin`       | Boolean   | Flag for administrative privileges                            |
| `cguAcceptedAt` | DateTime? | Timestamp when user accepted CGU                              |
| `language`      | String    | User's i18n preference (`en` or `fr`), defaults to `en`       |
| `theme`         | String    | User's theme preference (`light`, `dark`, or `system`)        |
| `createdAt`     | DateTime  | Timestamp of creation                                         |
| `updatedAt`     | DateTime  | Timestamp of last update                                      |

**Relations:**

- `widgets`: One-to-Many with `WidgetConfig`
- `tokens`: One-to-Many with `OAuthToken`
- `serviceConnections`: One-to-Many with `ServiceConnection`

---

### 2. OAuthToken

Stores OAuth 2.0 access and refresh tokens for 3rd party services linked to a User account.

| Field         | Type      | Description                              |
| ------------- | --------- | ---------------------------------------- |
| `id`          | Int       | Primary Key                              |
| `userId`      | Int       | Foreign Key to `User`                    |
| `provider`    | String    | Provider name (e.g., `github`, `google`) |
| `accessToken` | String    | AES-256-GCM encrypted OAuth access token                   |
| `refreshToken` | String?   | Encrypted optional refresh token                   |
| `expiresAt`   | DateTime? | Token expiration timestamp               |

**Relations:**

- `user`: Belongs to `User`. Cascades on delete.

---

### 3. WidgetConfig

Stores a widget instance configured by a user. Supports multiple instances of the same widget with distinct parameters.

| Field        | Type   | Description                                            |
| ------------ | ------ | ------------------------------------------------------ |
| `id`         | Int    | Primary Key                                            |
| `userId`     | Int    | Foreign Key to `User`                                  |
| `serviceName | String | Name of the service (e.g., `weather` or `crypto`)      |
| `widgetName` | String | Name of the widget (e.g., `current_weather`)            |
| `params`     | Json   | Configurable parameters stored as JSON                 |
| `refreshRate | Int    | Refresh interval in seconds                            |
| `layout`     | Json   | Grid coordinates for UI rendering (`x`, `y`, `w`, `h`) |

**Relations:**

- `user`: Belongs to `User`. Cascades on delete.

---

### 4. ServiceConnection

Stores one user-owned credential set for a configurable external service.

| Field                  | Type     | Description                                    |
| ---------------------- | -------- | ---------------------------------------------- |
| `id`                   | Int      | Primary key                                    |
| `userId`               | Int      | Owner of the connection                        |
| `serviceName`          | String   | Registry service name, such as `weather` or `crypto` |
| `encryptedCredentials` | Json     | AES-256-GCM encrypted provider credentials     |
| `keyHint`              | String?  | Last four characters shown in the UI           |
| `verifiedAt`           | DateTime | Last successful provider verification          |
| `createdAt`            | DateTime | Timestamp of creation                          |
| `updatedAt`            | DateTime | Timestamp of the latest credential replacement |

`userId` and `serviceName` are unique together. Deleting the user deletes all
their service connections.
