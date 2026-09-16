# Project Roadmap & Tickets

## Epic: Frontend Authentication & User Flow
- [ ] **Ticket #60: Frontend Auth UI** - Build Login and Register screens. Connect to backend `/auth/login` and `/auth/register`.
- [ ] **Ticket #61: JWT State Management** - Store JWT in Zustand/LocalStorage. Protect dashboard route so only logged-in users can view it.

## Epic: Backend Data Layer & Integration
- [ ] **Ticket #62: External API Fetchers** - Implement actual data fetching logic in `backend/services/` for GitHub, Weather, etc.
- [ ] **Ticket #63: Widget Data Route** - Build `GET /widgets/:id/data` in the backend to serve real-time widget statistics.

## Epic: Frontend <-> Backend Synchronization
- [ ] **Ticket #64: Dynamic Configurator** - Fetch `GET /about.json` from the backend to dynamically populate the Services and Widget Types in the Configurator modal, instead of hardcoding.
- [ ] **Ticket #65: Postgres Layout Sync** - Connect Zustand's `onLayoutChange` and `addWidget` to backend `PUT /widgets/:id` and `POST /widgets` to permanently save dashboard layouts to Postgres.

## Epic: The Timer Loop
- [ ] **Ticket #57: Auto-Refresh Timer** - Build a generic `<Widget>` wrapper component. Use `useEffect` and `setInterval` based on the widget's `refreshTimer` to continuously poll the `GET /widgets/:id/data` backend route.
