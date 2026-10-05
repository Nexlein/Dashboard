# API Documentation

## System

### `GET /health`

Returns the health status of the API, including database connection status and server uptime.

**Response (200 OK):**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-09-28T15:00:00.000Z"
}
```

**Response (503 Service Unavailable):**
If database connection fails.

### `GET /api-docs`

Serves the Swagger UI documentation for all endpoints.

### `GET /about.json`

Returns the application's supported services and widgets in the format required by Epitech grading.

**Response (200 OK):**

```json
{
  "client": { "host": "127.0.0.1" },
  "server": {
    "current_time": 1690000000,
    "services": [
      {
        "name": "weather",
        "widgets": [ ... ]
      }
    ]
  }
}
```

## Authentication

Authentication is [Better Auth](https://www.better-auth.com/docs), configured in
`backend/src/auth.ts` and served under **`/api/auth/*`**. The frontend calls it through
Better Auth's client (`frontend/src/lib/auth.ts`). This section lists what the project uses
and the rules it adds; Better Auth's documentation describes every endpoint.

**Session.** Signing in sets the httpOnly cookie `dashboard.session_token` (`SameSite=Lax`,
`Secure` when `BETTER_AUTH_URL` uses https). Sessions are stored in PostgreSQL: they last
7 days, are extended while in use, and stop working at once on sign-out, account deletion or
ban. Page scripts cannot read the cookie, and the project removes the session token from the
JSON responses of `get-session`, `sign-in/email` and `sign-up/email`.

**CSRF.** Better Auth refuses state-changing requests whose `Origin` is not in
`CORS_ORIGINS`. The project's own routes apply the same rule: `POST`, `PUT` and `DELETE`
need an allowed `Origin` (or the API's own, for Swagger UI), otherwise `403 Request origin
not allowed`.

**Rate limit.** `POST /api/auth/sign-in/*` and `/api/auth/sign-up/*` share a limit of
`AUTH_RATE_LIMIT_MAX` attempts per IP every 15 minutes (`429`), counted in Redis by every
replica.

### `POST /api/auth/sign-up/email`

Creates an account and signs it in.

```json
{
    "email": "user@example.com",
    "password": "supersecret123",
    "name": "John Doe",
    "cguAccepted": true,
    "is16OrOlder": true
}
```

The project checks the body with the shared `registerSchema` first: `cguAccepted` and
`is16OrOlder` must both be `true` (a self-declaration of the 16+ threshold, not identity
verification), `name` is at most 50 characters (may be empty), the email is trimmed and
lowercased, passwords have 8 to 128 characters. Failures return `400` with the schema's
message; an email already registered returns `422`. The acceptance date is stored in
`cguAcceptedAt`. `role` and `cguAcceptedAt` cannot be set by the client.

### `POST /api/auth/sign-in/email`

`{ "email", "password" }`. `401` on wrong credentials, `403` for a banned account.

### `POST /api/auth/sign-out`

Revokes the session and clears the cookie.

### `GET /api/auth/get-session`

`{ "user": { "id", "email", "name", "role", ... }, "session": { ... } }`, or `null` when
signed out. The frontend uses it to know who is signed in.

### `POST /api/auth/delete-user`

Deletes the account and everything stored about it (widgets, service connections, sign-in
methods, sessions). Requires a session created less than a day ago, or `{ "password" }`;
otherwise `400 SESSION_EXPIRED`, and the user signs in again.

## Account

The signed-in user's own data. Authenticated by the session cookie.

### `GET /account/export`

GDPR export: profile, widgets with readable parameters, connected-service metadata, sign-in
methods (`credential`, `github`) and sessions (dates, IP, user agent). Never includes
passwords, tokens or API keys. `Cache-Control: no-store`. Returns `500` if stored widget
parameters cannot be decrypted, `404` if the account no longer exists.

### `PUT /account/profile`

Optional `name` (at most 50 characters) and `email` (trimmed, lowercased). A changed email is
marked unverified. GitHub sign-in is bound to the GitHub account id, not to the email, so it
keeps working after the change. `409 Email already taken` if another account uses the email.

```json
{ "id": 1, "email": "new@example.com", "name": "John" }
```

## Administration

Better Auth's admin plugin, under `/api/auth/admin/*`, for users whose `role` is `admin`
(others get `403`). Among others: `GET list-users`, `POST remove-user`, `POST ban-user`,
`POST set-role`. A ban revokes the user's sessions and blocks sign-in. Administrators cannot
remove their own account this way.

## Widgets

All `/widgets` endpoints are authenticated (session cookie, see [Authentication](#authentication)).

### `GET /widgets`

Returns all widgets belonging to the authenticated user.

**Response (200 OK):**

```json
[
    {
        "id": 1,
        "serviceName": "weather",
        "widgetName": "current_weather",
        "params": { "city": "Paris" },
        "refreshRate": 60,
        "layout": { "x": 0, "y": 0, "w": 2, "h": 2 }
    }
]
```

### `POST /widgets`

Create a new widget for the dashboard.

**Request Body:**

```json
{
    "serviceName": "weather",
    "widgetName": "current_weather",
    "params": { "city": "Paris" },
    "refreshRate": 60,
    "layout": { "x": 0, "y": 0, "w": 2, "h": 2 }
}
```

**Response (201 Created):** Returns the created widget object.

`refreshRate` is expressed in seconds and must be an integer greater than or equal to `60`.
Weather responses are cached for at most the configured refresh interval, so the next scheduled
refresh can request fresh provider data.
Creating a weather widget returns `409 Conflict` until the authenticated user has connected
OpenWeather through `/services/weather/connection`.
Creating a crypto widget similarly requires a verified CoinGecko connection.

CoinGecko widgets use the following parameters:

- `crypto_price`: `coin` (CoinGecko asset ID) and `currency`.
- `crypto_chart`: `coins` (comma-separated CoinGecko asset IDs), `currency`,
  and `days` (`7`, `30`, `90`, or `365`). The comparison accepts one to eight assets.

### `PUT /widgets/:id`

Update an existing widget's parameters, refresh rate, or layout.
When supplied, `params` must be an object, `refreshRate` an integer greater than or
equal to `60`, and `layout` an object of integers `x`, `y`, `w`, `h`.

**Request Body (Partial updates allowed):**

```json
{
    "params": {
        "repository": "Nexlein/Dashboard"
    },
    "refreshRate": 120,
    "layout": { "x": 2, "y": 0, "w": 2, "h": 2 }
}
```

**Response (200 OK):** Returns the updated widget object.

- `400 Bad Request` for an invalid id or body.
- `403 Forbidden` when the widget belongs to another user.
- `404 Not Found` when the widget does not exist.

Widget ids in every `/widgets/:id` route must be positive integers written with
digits only; anything else (`abc`, `0`, `1.5`) returns `400 Bad Request` with
`{ "error": "Invalid widget id" }`.

### `DELETE /widgets/:id`

Delete a widget.

**Response (204 No Content)**

- `400 Bad Request` for an invalid id.
- `403 Forbidden` when the widget belongs to another user.
- `404 Not Found` when the widget does not exist.

### `GET /widgets/:id/data`

Executes a saved widget and returns its normalized service data. The widget must
belong to the authenticated user. Weather and CoinGecko responses are cached in memory per
user connection and never beyond the widget refresh interval. Provider credentials
are decrypted only for the outgoing request and are never exposed to the client.

Current weather widgets return the resolved location, temperature, perceived
temperature, humidity, wind and condition. Forecast widgets return five daily
entries aggregated from OpenWeather's three-hour forecast.

`crypto_price` returns the selected asset's current price, market cap, 24-hour
volume, 24-hour change, and provider update time. `crypto_chart` returns
historical price series, current prices, period changes, symbols, and secure
CoinGecko logo URLs. The frontend normalizes each curve to percentage change so
assets with different price scales can be compared.

- `400 Bad Request` for an invalid id or unsupported widget.
- `403 Forbidden` when the widget belongs to another user.
- `404 Not Found` when the widget or requested city does not exist.
- `409 Conflict` when the widget owner has not connected the required provider.
- `502 Bad Gateway` when an external provider cannot answer.
- `503 Service Unavailable` when a provider rejects requests temporarily or reaches its limit.

### `POST /widgets/:id/chat`

Sends the conversation to the Ollama model saved in the `ai_chat` widget's `model`
parameter (the `ollama` Docker Compose service). `messages` must be a non-empty array
of `{ role, content }` objects with `role` among `system`, `user`, `assistant`.

**Request Body:**

```json
{
    "messages": [
        { "role": "user", "content": "Hello!" }
    ]
}
```

**Response (200 OK):**

```json
{
    "reply": "Hello! How can I help you today?"
}
```

- `400 Bad Request` for an invalid id or payload, or a widget that is not a chatbot.
- `403 Forbidden` when the widget belongs to another user.
- `404 Not Found` when the widget does not exist, or Ollama's status when it rejects
  the request (for example a model that is not installed).
- `502 Bad Gateway` when Ollama cannot be reached.

## Service connections

All `/services` endpoints are authenticated (session cookie, see [Authentication](#authentication)).

### `GET /services`

Lists registry services and the authenticated user's connection status. The response contains
only safe metadata such as `connected`, `keyHint`, and `verifiedAt`; credentials are never returned.

### `PUT /services/:serviceName/connection`

Verifies and creates or replaces the authenticated user's provider credentials.

```json
{
    "apiKey": "user-owned-provider-key"
}
```

For `weather`, the key is checked against OpenWeather before it is encrypted and stored.
For `crypto`, a CoinGecko Demo API key is checked with a simple Bitcoin price
request before it is encrypted and stored. API keys belong to the authenticated
user and are never read from the project `.env`.
Invalid or inactive keys return `400 Bad Request` and are not saved.

### `DELETE /services/:serviceName/connection`

Disconnects the service for the authenticated user. Existing widgets are preserved and display
a connection-required message until the service is connected again.

**Response (204 No Content)**

## GitHub sign-in and account linking

GitHub is a Better Auth social provider (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`). The
GitHub OAuth App's callback URL is `<BETTER_AUTH_URL>/api/auth/callback/github`
(`http://localhost:8080/api/auth/callback/github` locally). Better Auth binds each flow to the
browser that started it (signed state cookie, PKCE), accepts a state only once and expires it.

### Sign-in and sign-up: `POST /api/auth/sign-in/social`

`{ "provider": "github", "callbackURL", "errorCallbackURL", "disableRedirect": true }` returns
`{ "url" }`, the GitHub page to open. `callbackURL` and `errorCallbackURL` must be on a trusted
origin (`CORS_ORIGINS`).

- From the sign-in page, a GitHub account with no Dashboard account is refused:
  `errorCallbackURL?error=signup_disabled`.
- The registration page adds `"requestSignUp": true` and
  `"additionalData": { "cguAccepted": true, "is16OrOlder": true }`. Without both declarations:
  `?error=REGISTRATION_REQUIREMENTS`. A GitHub account whose primary email is not verified:
  `?error=EMAIL_NOT_VERIFIED`.
- A GitHub email that matches an existing email/password account is not signed in
  automatically (`?error=account_not_linked`): those emails are never verified, so the
  account could belong to someone else. Sign in with the password, then link GitHub.
- Success sets the session cookie and redirects to `callbackURL`; no token appears in any URL.

### Linking: `POST /api/auth/link-social`

Signed in. `{ "provider": "github", "callbackURL", "errorCallbackURL" }` returns `{ "url" }`.
The GitHub account may use another email than the Dashboard account; it cannot be linked to
two Dashboard accounts (`?error=account_already_linked_to_different_user`).

The GitHub widgets use this linked account. Its access token is stored encrypted
(`account.encryptOAuthTokens`), read back through Better Auth (which refreshes it when it
expires) and never returned to the page. `DELETE /services/github/connection` unlinks it,
except when GitHub is the account's only sign-in method (`409`).
