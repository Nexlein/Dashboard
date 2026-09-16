# API Documentation

## System

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
  "name": "John Doe"
}
```

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

### `PUT /widgets/:id`

Update an existing widget's parameters, refresh rate, or layout.

**Request Body (Partial updates allowed):**

```json
{
  "layout": { "x": 2, "y": 0, "w": 2, "h": 2 }
}
```

**Response (200 OK):** Returns the updated widget object.

### `DELETE /widgets/:id`

Delete a widget.

**Response (204 No Content)**
**Response (200 OK):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

## GitHub account linking

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
