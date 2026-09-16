# Dashboard Requirements

## Group Size: 2

- [ ] **Required Services**: 3 (1 + 2)
- [ ] **Required Widgets**: 6 (3 * 2)

## Core Features

- [x] **User Management**: Unauthenticated users can register. Administration section useful.
- [ ] **Identity & Permissions**:
  - [x] Authentication (credentials or OIDC) to bind data to account.
  - [x] Authorization (OAuth 2.0) to access external APIs. Link third-party to platform user.
- [ ] **Service Subscriptions**:
  - [ ] Authenticated users select services to subscribe to.
  - [ ] Subscribing requires credentials or OAuth linking.
  - [ ] Some services (e.g., weather) available by default without external account.
- [ ] **Dashboard & Widgets**:
  - [ ] Add widget (select type, configure, set refresh rate).
  - [ ] Reconfigure, move, delete widgets.
  - [ ] **Crucial**: Widget _must_ have configurable parameters.
  - [ ] **Crucial**: Two instances of same widget with different configs must display distinct info.
- [ ] **Accessibility (a11y)**:
  - [ ] Full keyboard navigation support.
  - [ ] Screen reader compatibility (ARIA labels).
- [ ] **Timer**: Periodic refresh of widget data based on widget config.

## Legal & Compliance

- [x] **CGU (Terms of Service)**: Users must read and accept CGU during registration.
- [ ] **RGPD (GDPR)**:
  - [ ] Clear privacy policy.
  - [ ] Account deletion (Right to be forgotten).
  - [ ] Data export (Right of access).

## Security & Robustness

- [ ] **API Security**: Encrypt sensitive widget parameters (like API keys) in the database.
- [ ] **Rate Limiting**: Protect authentication endpoints against brute-force attacks.
- [ ] **CORS**: Restrict API access to the frontend origin.
- [ ] **Backend Cache**: In-memory cache for external API calls to prevent rate-limiting/bans.
- [ ] **UI Error Boundaries**: Individual widget failures must not crash the entire dashboard.

## UX / UI Polish

- [x] **Dark / Light Mode**: Theme toggle saved in local storage.
- [ ] **Responsive Design**: Dashboard grid must stack beautifully on mobile devices.
- [ ] **Internationalization (i18n)**: UI and Legal texts available in English and French.
- [ ] **Lighthouse 100/100**: Perfect score on Accessibility and Best Practices.

## Bonus Features

- [ ] **PWA (Progressive Web App)**: Dashboard installable as a standalone app.
- [ ] **Database Seeding**: Automated mock data (users + widgets) generation on startup for instant grading access.
- [ ] **AI Chatbot with RAG**: Optional LLM integration widget.

## Technical Constraints

- [x] **Docker**: `docker-compose.yml` at root. Must support `docker-compose build` and `docker-compose up`.
- [x] **Server**: MUST run on port `8080`.
- [x] **Endpoint**: MUST respond to `GET http://localhost:8080/about.json`.
- [ ] **Health Check**: MUST respond to `GET http://localhost:8080/health`.
- [ ] **API Docs**: Swagger UI available at `http://localhost:8080/api-docs`.
- [x] **Bonus**: All bonus files must be in `bonus/` directory.

## Deliverables & Documentation

- [x] **Source Code**: No binaries or temp files.
- [ ] **README.md**:
  - [ ] List of key features, services, and widgets.
  - [ ] Precise steps to install and build.
  - [ ] Overview of app purpose and use cases.
  - [ ] Clear instructions to run and use.
  - [ ] Description of technologies used and overall structure.
  - [ ] Adapt communication to audience (users vs developers).

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
