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

### `POST /auth/register`

Register a new user account.

**Request Body:**

```json
{
    "email": "user@example.com",
    "password": "securepassword",
    "displayName": "John Doe",
    "cguAccepted": true,
    "is16OrOlder": true
}
```

`displayName` is optional and limited to 50 characters. Both `cguAccepted` and
`is16OrOlder` must be the boolean `true` for the account to be created. Missing,
false or string-valued declarations are rejected with `400`. Email addresses are trimmed and stored in
lowercase. Passwords must contain between 8 and 72 characters.

**Response (201 Created):**

```json
{
    "message": "User registered successfully",
    "userId": 1
}
```

### `POST /auth/login`

Authenticate an existing user.

**Request Body:**

```json
{
    "email": "user@example.com",
    "password": "securepassword"
}
```

**Response (200 OK):**

```json
{
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

Registration and login share a limit of 20 attempts per IP address every 15
minutes. Further requests return `429 Too Many Requests`.

### `GET /auth/me`

Returns the authenticated user's public profile. Requires the
`Authorization: Bearer <token>` header. Password hashes are never returned.

```json
{
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe"
}
```

### `PUT /auth/me`

Requires authentication. Accepts optional `displayName` (string, at most 50
characters after trimming) and `email` (valid address, at most 254 characters).
An empty name clears it. Emails are trimmed and lowercased. Returns the updated
public profile. Both password and GitHub-only users can change their name and
email. GitHub authentication uses a stable `githubId`, so editing the Dashboard
email does not create a different account on the next login.

For older linked accounts without a stored GitHub ID, an email change first
verifies the existing GitHub token and binds that identity. If the token is expired
or unavailable, the server returns `409` asking the user to sign in/reconnect GitHub
before retrying; the old email stays intact. Returns `400` for invalid input, `404`
for a missing user and `409` for an email/identity uniqueness conflict.

### `GET /auth/download-data`

Requires authentication. Returns the user's profile, preferences, timestamps,
widgets (with **decrypted** parameters), API-service connection metadata and OAuth
provider metadata as JSON, with `Cache-Control: no-store`. Password hashes,
access/refresh tokens and provider API keys are deliberately excluded. Data is
scoped to the authenticated user; there is no user ID parameter. Returns `404` for
a missing user and `500` if any stored widget parameters cannot be decrypted,
rather than returning a partial or unreadable export.

### `DELETE /auth/delete-account`

Requires authentication. Deletes the authenticated user and cascades deletion to
widgets, OAuth tokens and service connections in PostgreSQL. Returns `200` after
the deletion succeeds, `404` if the user no longer exists, and `500` on a database
failure. The UI only logs out on a successful response and displays an error on
HTTP/network failure. It does not delete data held by external providers or backups.

## Administration

All `/admin` endpoints require the `Authorization: Bearer <token>` header. The
authenticated user must currently have `isAdmin` set to `true` in the database.
Missing or invalid authentication returns `401 Unauthorized`; an authenticated
non-admin user receives `403 Forbidden`.

### `GET /admin/users`

Returns all users without exposing password hashes or OAuth tokens.

**Response (200 OK):**

```json
[
    {
        "id": 2,
        "email": "user@example.com",
        "displayName": "John Doe",
        "isAdmin": false,
        "cguAcceptedAt": "2026-09-16T10:00:00.000Z",
        "language": "en",
        "theme": "system",
        "createdAt": "2026-09-16T10:00:00.000Z",
        "updatedAt": "2026-09-16T10:00:00.000Z"
    }
]
```

### `DELETE /admin/users/:id`

Deletes another user. Related widgets and OAuth tokens are deleted through the
database cascade. An administrator cannot delete their own account.

**Response (204 No Content)**

- `400 Bad Request` if `id` is not a positive integer.
- `403 Forbidden` when attempting to delete the authenticated admin account.
- `404 Not Found` if the user does not exist.

## Widgets

All `/widgets` endpoints require the `Authorization: Bearer <token>` header.

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
When supplied, `refreshRate` must be an integer greater than or equal to `60`.

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

### `DELETE /widgets/:id`

Delete a widget.

**Response (204 No Content)**

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

Executes a chat completion request for the `ai_chat` widget, proxying the payload to the configured LLM API (e.g. OpenAI, Ollama). 

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

## Service connections

All `/services` endpoints require the `Authorization: Bearer <token>` header.

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

## GitHub Authentication & Account linking

### `GET /auth/github/login`

Starts the GitHub OAuth login flow and redirects to GitHub. Existing users are
looked up by their stable GitHub ID first, with a verified GitHub email fallback only for legacy
accounts that do not yet have that identity. Unverified addresses cannot bind an account. The GitHub ID is saved on successful
login/linking and is unique per Dashboard account. Existing users can log in
without repeating registration declarations. For a **new account**, the
registration page must send `?cguAccepted=true&is16OrOlder=true`. These declarations
are stored server-side with the temporary, browser-bound OAuth state; adding them
to the callback cannot bypass the check. This is a self-declaration of the project's
16+ threshold, not identity or birth-date verification.

### `GET /auth/github/callback`

The same callback handles login and service linking. For a new user without both
registration declarations, it redirects to `/register?error=github_registration_requirements`
on the configured frontend without creating a user or saving tokens. After the user
accepts both checkboxes, they can restart GitHub registration. Successful login
redirects to `/login/oauth?token=...`. Linking retains its authenticated flow.

### Manual browser flow

Obtain a Dashboard JWT from `POST /auth/login`. Open
`http://localhost:8080/about.json`, then open the browser's developer console.
Run the following snippet and paste the Dashboard JWT into the prompt. The
browser starts the request, receives its cookie and navigates to GitHub.

```js
(async () => {
    const token = prompt('Dashboard token');
    if (!token) return;
    const response = await fetch('/auth/github?format=json', {
        headers: { Authorization: `Bearer ${token.trim()}` },
        credentials: 'same-origin',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    window.location.assign(data.authorizationUrl);
})();
```

Approve the requested access on GitHub. The callback returns
`GitHub account linked` once the token has been saved in `OAuthToken`.

Use the same hostname throughout: the configured `GITHUB_CALLBACK_URL` must
return to the host that started linking. For local development, use
`http://localhost:8080/auth/github/callback`. Production requires HTTPS and
`NODE_ENV=production` for secure cookies behind a proxy.

### `GET /auth/github`

Requires `Authorization: Bearer <Dashboard JWT>`. Returns a `302` redirect to
GitHub. For a browser frontend, use `/auth/github?format=json` to receive
`{ "authorizationUrl": "https://github.com/login/oauth/authorize?..." }`, then
navigate to that URL. The manual console example uses same-origin requests.

Both modes set a random `HttpOnly`, `SameSite=Lax` cookie, scoped to the callback,
with a ten-minute lifetime. It is marked `Secure` on HTTPS or in production.
The cookie secret is separate from the `state` in the URL. A different cookie
name per request supports multiple tabs. Responses are not cached.

Do not start with `curl` and paste its redirect into a browser: they do not share
the cookie required to finish the request.

### `GET /auth/github/callback`

Receives GitHub's `state` and `code` (or authorization error). It checks the
pending request, its expiration and the browser cookie **before** exchanging
the code or writing to the database. A missing or incorrect cookie returns
`403` without consuming the legitimate browser's pending request. Invalid,
expired or reused state returns `400`.

After a valid browser check, the state is consumed and the cookie cleared, even
if GitHub refused access or the exchange later fails. Start a new request from
the browser console to retry. Abandoned requests are automatically removed after ten minutes;
server restarts discard pending requests. Saved OAuth tokens remain in PostgreSQL.

Successful callbacks create or update the `(userId, provider)` token record and
return only `{ "message": "GitHub account linked", "userId": 1 }`. Tokens and
client secrets are never returned to the page.
