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

Returns the application's supported services and widgets in the format required by Epitech grading,
and only the fields of that format. Public (no session). The frontend widget configurator is built
from it: it offers these services, widgets and params.

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

**Rate limit.** `/api/auth/sign-in/*`, `/api/auth/sign-up/*`, `/api/auth/email-otp/*` and
`/api/auth/forget-password/*` share a limit of `AUTH_RATE_LIMIT_MAX` requests per IP every
15 minutes (`429`), counted in Redis by every replica.

**Emailed codes.** Email verification, password reset and email change use 6-digit codes
(Better Auth's emailOTP plugin), sent by SMTP (`SMTP_*` variables). A code expires after
5 minutes, allows 3 attempts and is stored hashed. Sign-in by code is not offered.

### `POST /api/auth/sign-up/email`

Creates an account and emails it a verification code. The account cannot sign in until
the code is entered (`POST /api/auth/email-otp/verify-email`), which signs it in.

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
message. An email already registered gets the same `200` answer and nothing changes, so
sign-up cannot be used to find out who has an account. The acceptance date is stored in
`cguAcceptedAt`. `role` and `cguAcceptedAt` cannot be set by the client.

### `POST /api/auth/email-otp/verify-email`

`{ "email", "otp" }`. Verifies the address and signs in (session cookie). `400` for a wrong
or expired code; after 3 wrong attempts the code is invalidated and a new one is needed:
`POST /api/auth/email-otp/send-verification-otp` with
`{ "email", "type": "email-verification" }`.

### `POST /api/auth/sign-in/email`

`{ "email", "password" }`. `401` on wrong credentials. `403 EMAIL_NOT_VERIFIED` while the
email is not verified (a new code is emailed), `403` for a banned account.

### Forgotten password

1. `POST /api/auth/email-otp/request-password-reset` with `{ "email" }` emails a code. The
   answer is `200` whether or not the address has an account.
2. `POST /api/auth/email-otp/reset-password` with `{ "email", "otp", "password" }` sets the
   new password, signs every session out, and marks the email verified (whoever receives the
   codes owns the address).

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

The signed-in user's own data. `/account/*` is authenticated by the session cookie; the
profile endpoints are Better Auth's.

### `GET /account/export`

GDPR export: profile, widgets with readable parameters, connected-service metadata, sign-in
methods (`credential`, `github`) and sessions (dates, IP, user agent). Never includes
passwords, tokens or API keys. `Cache-Control: no-store`. Returns `500` if stored widget
parameters cannot be decrypted, `404` if the account no longer exists.

### Profile

- Display name: `POST /api/auth/update-user` with `{ "name" }` (trimmed, at most 50
  characters, shared `profileSchema`). The email and the role cannot be changed there.
- Email: `POST /api/auth/email-otp/request-email-change` with `{ "newEmail" }` emails a code
  to the new address (nothing is sent, with the same answer, if another account uses it);
  `POST /api/auth/email-otp/change-email` with `{ "newEmail", "otp" }` applies it, verified.
  GitHub sign-in is bound to the GitHub account id, not to the email, so it keeps working.

## Administration

Better Auth's admin plugin, under `/api/auth/admin/*`, for users whose `role` is `admin`
(others get `403`). The routes offered: `GET list-users`, `GET get-user`, `POST remove-user`,
`POST ban-user`, `POST unban-user`, `POST set-role` and `POST revoke-user-sessions`. A ban
revokes the user's sessions and blocks sign-in. Administrators cannot remove their own account
this way.

The plugin's other routes answer `404` (`disabledPaths` in `backend/src/auth.ts`):
impersonation (`impersonate-user`, `stop-impersonating`), `list-user-sessions` and
`revoke-user-session` (they handle session tokens), `set-user-password`, `create-user` (it would
skip the CGU and age declarations), `update-user` and `has-permission`.

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
Creating a crypto widget similarly requires a verified CoinGecko connection. A stock widget requires a verified Twelve Data connection.

CoinGecko widgets use the following parameters:

- `crypto_price`: `coin` (CoinGecko asset ID) and `currency`.
- `crypto_chart`: `coins` (comma-separated CoinGecko asset IDs), `currency`,
  and `days` (`7`, `30`, `90`, or `365`). The comparison accepts one to eight assets.

Twelve Data uses `stock_market` with `symbols` (one to eight comma-separated stock tickers) and `period` (`1W`, `1M`, `1Y`, `5Y`, or `ALL`).

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
belong to the authenticated user. Weather, CoinGecko and Twelve Data responses are cached per user connection. Twelve Data quotes are cached for at least five minutes to leave credits available for new history periods, while histories and logos use longer period-aware caches to protect provider quotas. Provider credentials
are decrypted only for the outgoing request and are never exposed to the client.

Current weather widgets return the resolved location, temperature, perceived
temperature, humidity, wind and condition. Forecast widgets return five daily
entries aggregated from OpenWeather's three-hour forecast.

`crypto_price` returns the selected asset's current price, market cap, 24-hour
volume, 24-hour change, and provider update time. `crypto_chart` returns
historical price series, current prices, period changes, symbols, and secure
CoinGecko logo URLs. The frontend normalizes each curve to percentage change so
assets with different price scales can be compared.

`stock_profile` accepts the same period choices and exactly one ticker in `symbols`. It returns a single-company price series and fetches its optional logo on demand, cached for seven days (missing logos are cached for one hour). Both stock widgets share the same per-company logo cache and use visible period buttons in their configuration. Logo requests only cover selected tickers, happen after prices are fetched, and cannot prevent prices from being displayed when branding is unavailable. A shared provider session across API replicas reads the provider credit headers and defers work that exceeds the remaining budget. A `429` data response includes `retryAfter` in seconds and a `Retry-After` header; the frontend automatically retries and retains any previously loaded chart with its actual period identified. Stock creation validates the configuration locally and loads data afterwards, avoiding a duplicate initial provider request. A rejected individual symbol does not hide the other companies: the response includes an optional `unavailable` array of `{ symbol, message }` entries, displayed separately above the comparison.

`stock_market` returns current prices, daily percentage changes, company names, logos, and historical series for every selected ticker. The frontend compares normalized performance and lets each curve be toggled independently.

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
request before it is encrypted and stored. For `stocks`, a Twelve Data key is checked with an AAPL price request. API keys belong to the authenticated
user and are never read from the project `.env`.
Invalid or inactive keys return `400 Bad Request` and are not saved.

### `GET /services/:serviceName/search?q=query`

Searches provider instruments with the authenticated user's encrypted connection. Currently supported by `stocks`; returns up to eight common-stock symbols from Twelve Data. Returns `409` when Twelve Data is not connected.

### `DELETE /services/:serviceName/connection`

Disconnects the service for the authenticated user. Existing widgets are preserved and display
a connection-required message until the service is connected again.

**Response (204 No Content)**

## GitHub: sign-in and the GitHub service

GitHub plays two separate roles, with two Better Auth providers:

| | Sign-in (`github`) | GitHub service (`github-service`) |
| --- | --- | --- |
| Used for | identity: register and sign in | the GitHub widgets |
| Scope | `read:user user:email` | `read:user user:email repo` |
| Per user | one | several (one per GitHub account) |
| Can sign in | yes | never (`400 NOT_A_SIGN_IN_PROVIDER`) |

Both use `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (the service can use another GitHub OAuth
App with `GITHUB_SERVICE_CLIENT_ID` / `GITHUB_SERVICE_CLIENT_SECRET`). GitHub requires each
`redirect_uri` to match a registered callback URL exactly, so the OAuth App lists both:
`<BETTER_AUTH_URL>/api/auth/callback/github` and `<BETTER_AUTH_URL>/api/auth/callback/github-service`
(with a second app, each app lists its own). Better Auth binds each flow to the
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
- A GitHub email that matches an existing email/password account signs into it only when both
  emails are verified (GitHub's, and the account's own, by code). Otherwise
  `?error=account_not_linked`: sign in with the password first.
- Success sets the session cookie and redirects to `callbackURL`; no token appears in any URL.

### The GitHub service: connecting accounts

`POST /api/auth/link-social` (signed in) with
`{ "provider": "github-service", "callbackURL", "errorCallbackURL", "disableRedirect": true }`
returns `{ "url" }`. Repeat it to connect several GitHub accounts; their emails may differ from
the Dashboard account's or be unverified. A GitHub account cannot be connected to two Dashboard
users (`?error=account_already_linked_to_different_user`).

- `GET /services`: the `github` entry lists `accounts: [{ "id", "login", "avatarUrl" }]`
  (`login` is `null` when GitHub no longer accepts the account).
- Each GitHub widget names its account in the `account` parameter (an `id` above). With one
  account connected it may omit it; with several, `400 Choose which GitHub account to use`.
  An account of another user is never used (`409`). A token GitHub no longer accepts gives
  `502`: reconnect the account.
- `DELETE /services/github/accounts/:id` removes one account; `DELETE /services/github/connection`
  removes them all. Neither touches the GitHub account used to sign in.

Tokens are stored encrypted (`account.encryptOAuthTokens`), read through Better Auth on the
server (which refreshes them when they expire) and never returned to the page.


### YouTube widgets and connected accounts

Connect YouTube through `POST /api/auth/link-social` with `provider: "youtube-service"`
while signed in, using trusted `callbackURL` and `errorCallbackURL` values and
`disableRedirect: true`. Register `<BETTER_AUTH_URL>/api/auth/callback/youtube-service`
in the Google OAuth web client. Set `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`;
the old `YOUTUBE_CALLBACK_URL` and `/auth/youtube` endpoints are no longer used.
Better Auth handles OAuth state, encrypted Account tokens and token refresh.
YouTube service accounts cannot sign in or create Dashboard accounts.

`GET /services` lists YouTube's connected accounts. Widgets accept an `account`
parameter with the selected account ID (optional when only one is connected).
`DELETE /services/youtube/accounts/:id` disconnects one account;
`DELETE /services/youtube/connection` disconnects all YouTube accounts.

Exactly three widget types are accepted for `serviceName: "youtube"`:

| `widgetName` | Required target parameter | Data |
| --- | --- | --- |
| `channel_stats` | `channel_id` | `channelId`, `channelTitle`, `subscriberCount` |
| `latest_videos` | `channel_id` | `channelId`, `channelTitle`, `videos: [{ videoId, title, publishedAt }]` |
| `video_stats` | `video_id` | `videoId`, `title`, `channelTitle`, `viewCount`, `likeCount`, `commentCount` |

Channel IDs start with `UC` followed by 22 ID characters; video IDs have 11 ID
characters. Invalid IDs return `400`. Latest Videos reads up to five uploads,
filters unavailable/private entries and can return an empty list. Missing resources
return `404`. Unavailable likes/comments are `null`, not zero. Hidden subscriber
counts or revoked YouTube access return `409`; upstream/quota errors return `502`.
Results are cached separately by connected account, widget type and target ID,
for 60 seconds to five minutes according to the refresh rate. Subscriber counts
are YouTube's rounded public counts.
