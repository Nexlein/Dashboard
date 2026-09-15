# Dashboard Requirements

## Group Size: 2

- [ ] **Required Services**: 3 (1 + 2)
- [ ] **Required Widgets**: 6 (3 * 2)

## Core Features

- [x] **User Management**: Unauthenticated users can register. Administration section useful.
- [ ] **Identity & Permissions**:
  - [x] Authentication (credentials or OIDC) to bind data to account.
  - [ ] Authorization (OAuth 2.0) to access external APIs. Link third-party to platform user.
- [ ] **Service Subscriptions**:
  - [ ] Authenticated users select services to subscribe to.
  - [ ] Subscribing requires credentials or OAuth linking.
  - [ ] Some services (e.g., weather) available by default without external account.
- [ ] **Dashboard & Widgets**:
  - [ ] Add widget (select type, configure, set refresh rate).
  - [ ] Reconfigure, move, delete widgets.
  - [ ] **Crucial**: Widget _must_ have configurable parameters.
  - [ ] **Crucial**: Two instances of same widget with different configs must display distinct info.
- [ ] **Timer**: Periodic refresh of widget data based on widget config.

## Technical Constraints

- [x] **Docker**: `docker-compose.yml` at root. Must support `docker-compose build` and `docker-compose up`.
- [x] **Server**: MUST run on port `8080`.
- [x] **Endpoint**: MUST respond to `GET http://localhost:8080/about.json`.
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
