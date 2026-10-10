# Dashboard Requirements

## Group Size: 2

- [x] **Required Services**: 3 minimum (6 implemented: OpenWeather, GitHub, CoinGecko, Twelve Data, YouTube, Ollama chatbot)
- [x] **Required Widgets**: 6 minimum (12 implemented, listed in `/about.json`)

## Core Features

- [x] **User Management**: Unauthenticated users can register. Administration section useful. (Registration frontend/backend connected; `/admin` page for administrators: search, filters, role, ban, sign-out and deletion, on Better Auth's admin plugin)
- [x] **Identity & Permissions**:
    - [x] Authentication (credentials or OIDC) to bind data to account. (GitHub OIDC & credentials implemented; emails verified by code before the first sign-in; forgotten password reset by code)
    - [x] Authorization (OAuth 2.0) to access external APIs. Link third-party to platform user (GitHub: several accounts per user, separate from GitHub sign-in).
- [x] **Service Subscriptions**:
    - [x] Authenticated users select services to subscribe to.
    - [x] OpenWeather subscription requires a verified, user-owned API key.
    - [x] CoinGecko subscription requires a verified, user-owned API key.
    - [x] Twelve Data subscription requires a verified, user-owned API key.
    - [x] Add OAuth linking for every remaining account-based service (GitHub done).
- [x] **Dashboard & Widgets**:
    - [x] Connect `about.json` dynamically to the frontend Configurator. (The configurator offers the services, widgets and params `/about.json` declares; `features/widgets/lib/registry.tsx` only says how to display them.)
    - [x] Sync Dashboard Grid layout with Postgres Database via PUT/POST routes. (`PUT /widgets/layout`, debounced from the grid)
    - [x] Add widget (select type, configure, set refresh rate).
    - [x] Reconfigure, move, delete widgets.
    - [x] Stock Market widget with searchable multi-symbol comparison, toggleable curves, and visible 1W/1M/1Y/5Y/ALL period choices.
    - [x] Single-company Stock Profile with an on-demand logo, latest price, daily change, and historical price chart.
    - [x] Quota-aware progressive stock loading, automatic retries, and retention of previously loaded charts.
    - [x] On-demand company logos in the multi-symbol stock comparison, shared with Stock Profile.
    - [x] YouTube video player and public channel watch without credentials. The watch uses its configured refresh timer; the player loads on demand without a timer.
    - [x] **Crucial**: Widget _must_ have configurable parameters.
    - [x] **Crucial**: Two instances of same widget with different configs display distinct info.
- [x] **Accessibility (a11y)**: WCAG 2.2 AA target, see [accessibility.md](accessibility.md). axe on every page in the e2e suite, Lighthouse accessibility 100.
    - [x] Full keyboard navigation support (skip link, focus return, widgets moved and resized with the arrow keys).
    - [x] Screen reader compatibility (ARIA labels, page titles, live regions).
    - [x] Accessibility settings: text size up to 200 %, high contrast, reduced motion, underlined links, text spacing, easy-to-read font.
- [x] **Timer**: Periodic refresh of widget data based on widget config.

## Legal & Compliance

- [x] **CGU (Terms of Service)**: Users must read and accept CGU during registration.
- [x] **RGPD (GDPR)**:
    - [x] Clear privacy policy. (`/privacy`, `docs/RGPD.md`)
    - [x] Account deletion (Right to be forgotten). (`POST /api/auth/delete-user`, needs a recent sign-in or the password; cascades checked against PostgreSQL)
    - [x] Data export (Right of access). (`GET /account/export`, without secrets)

## Security & Robustness

- [x] **API Security**: Encrypt widget parameters and user-owned service credentials in the database.
- [x] **Rate Limiting**: Protect authentication endpoints against brute-force attacks. (Auth and global limits shared by replicas through Redis)
- [x] **CORS**: Restrict API access to the frontend origin. (`CORS_ORIGINS`)
- [x] **Backend Cache**: Cache for external API calls to prevent rate-limiting/bans. (Redis shared by the replicas, in-memory fallback, TTL of 1 to 5 minutes)
- [x] **UI Error Boundaries**: Individual widget failures must not crash the entire dashboard. (one `ErrorBoundary` per widget)

## UX / UI Polish

- [x] **Dark / Light Mode**: Theme toggle saved in local storage.
- [x] **Responsive Design**: Dashboard grid must stack beautifully on mobile devices.
- [x] **Internationalization (i18n)**: UI and Legal texts available in English and French.
- [x] **Lighthouse 100/100**: Perfect score on Accessibility and Best Practices (performance 98, SEO 100), see [lighthouse.md](lighthouse.md).

## Bonus Features

- [ ] **PWA (Progressive Web App)**: Dashboard installable as a standalone app.
- [x] **Database Seeding**: Automated mock data (users + widgets) generation on startup for instant grading access. (`SEED_DEMO_DATA=true` in `docker-compose.yml` creates the missing demo accounts at startup; `prisma db seed` recreates them)
- [ ] **AI Chatbot with RAG**: Optional LLM integration widget. (Ollama chat widget implemented, without RAG)

## Technical Constraints

- [x] **Docker**: `docker-compose.yml` at root. Must support `docker-compose build` and `docker-compose up`.
- [x] **Server**: MUST run on port `8080`.
- [x] **Endpoint**: MUST respond to `GET http://localhost:8080/about.json`.
- [x] **Health Check**: MUST respond to `GET http://localhost:8080/health`.
- [x] **API Docs**: Swagger UI available at `http://localhost:8080/api-docs`.
- [ ] **Bonus**: All bonus files must be in `bonus/` directory. (No `bonus/` directory yet; bonus features live in the main code.)

## Deliverables & Documentation

- [x] **Source Code**: No binaries or temp files.
- [x] **README.md**:
    - [x] List of key features, services, and widgets.
    - [x] Precise steps to install and build.
    - [x] Overview of app purpose and use cases.
    - [x] Clear instructions to run and use.
    - [x] Description of technologies used and overall structure.
    - [x] Adapt communication to audience (users vs developers). (Users: [user-guide.md](user-guide.md); developers: README and the other docs)
- [ ] **Video Presentation**: Short video showcasing main features (to avoid disruptions during live demo).

## about.json Schema

```json
{
    "client": { "host": "IP_ADDRESS" },
    "server": {
        "current_time": 1531680780,
        "services": [
            {
                "name": "service_name",
                "widgets": [
                    {
                        "name": "widget_name",
                        "description": "widget description",
                        "params": [
                            {
                                "name": "param_name",
                                "type": "string | integer"
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
```
