# Dashboard Requirements

## Group Size: 2 (Nexlein & Friend)

- [ ] **Required Services**: 3 (1 + 2)
- [ ] **Required Widgets**: 6 (3 * 2)

## 1. Authentication & Users

- [ ] **Registration**: Unauthenticated users can register via email/password.
- [ ] **Login**: Users must authenticate before accessing the dashboard.
- [ ] **OIDC / OAuth 2.0**: Users can authenticate or link third-party accounts (e.g. GitHub OAuth).
- [ ] **Administration**: An administration section to manage site users.

## 2. Services & Subscriptions

- [ ] **Service Subscription**: Authenticated users must explicitly subscribe to services (except default ones like Weather).
- [ ] **OAuth Linking**: Subscribing to certain services requires linking via OAuth 2.0.

## 3. Dashboard & Widgets

- [x] **Grid Layout**: A responsive dashboard that stacks beautifully on mobile.
- [ ] **Widget Configurator Modal**: UI to add a new widget instance. (UI Built, needs dynamic schema fetch).
- [ ] **Select Widget Type**: Choose service and widget type.
- [x] **Configure Widget**: Widget MUST have configurable parameters.
- [ ] **Set Refresh Rate**: User sets a custom timer for the widget.
- [x] **Move Widgets**: Drag and drop widgets on the dashboard.
- [ ] **Reconfigure Widgets**: Edit an existing widget's parameters.
- [ ] **Delete Widgets**: Remove a widget from the dashboard.
- [ ] **Distinct Instances**: Two instances of the SAME widget with DIFFERENT configs MUST display distinct information simultaneously.

## 4. The Timer Mechanism

- [ ] **Auto-Refresh**: A timer mechanism that periodically fetches new data for each widget based on its configured refresh rate.

## 5. Technical Constraints

- [x] **Docker Compose**: `docker-compose.yml` at the root.
- [x] **Build**: Must support `docker-compose build`.
- [x] **Run**: Must support `docker-compose up`.
- [x] **Port Requirement**: Server MUST run on port `8080`.
- [ ] **about.json**: Server MUST respond to `GET http://localhost:8080/about.json`.
  - [ ] Returns `client.host` (IP of client).
  - [ ] Returns `server.current_time` (Epoch).
  - [ ] Returns `server.services` (List of services, widgets, and param types).

## 6. Deliverables & Documentation

- [x] **Source Code**: No binaries or temp files.
- [ ] **README.md**:
  - [ ] List of key features, services, and widgets.
  - [ ] Precise steps to install and build.
  - [ ] Overview of app purpose and use cases.
  - [ ] Clear instructions to run and use.
  - [ ] Description of technologies used and overall structure.
- [ ] **Video Presentation**: Short video showcasing main features.

## 7. Custom Ideas & Polish (Bonus)

- [x] **Dark / Light Mode**: Theme toggle.
- [ ] **Data Persistence**: Save dashboard layouts in the database so they survive a refresh.

## 8. Extra Ideas & Bonus Points (Not in PDF)
- [ ] **Accessibility (a11y)**: Full keyboard navigation and screen reader support (ARIA labels).
- [ ] **Lighthouse 100/100**: Perfect score on Accessibility and Best Practices.
- [ ] **Legal & Compliance**:
  - [ ] **CGU (Terms of Service)**: Users must accept CGU during registration.
  - [ ] **RGPD (GDPR)**: Account deletion and data export.
- [ ] **Security**: Encrypt sensitive widget parameters (like API keys) in the database.
- [ ] **Rate Limiting**: Protect authentication endpoints against brute-force attacks.
- [ ] **UI Error Boundaries**: Individual widget failures must not crash the entire dashboard.
- [ ] **Database Seeding**: Automated mock data generation on startup for instant grading access.
