# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

No test runner is configured in this project.

## Environment

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend URL. The production backend runs on Railway at `https://digitalpicking-production.up.railway.app`.

## Architecture

**Stack:** React 19 + React Router 7 + Vite. No Redux or Zustand — state is managed via `useState`, Context API, and `localStorage`.

**Entry points:**
- [src/App.jsx](src/App.jsx) — route definitions and guards
- [src/main.jsx](src/main.jsx) — React DOM render

### Routing & Auth Guards

Two route guard components protect pages:
- **`PrivateRoute`** — validates JWT expiry and trial status; redirects to `/upgrade` on `trial_expired` 403
- **`RoleRoute`** — checks `role` from JWT payload against allowed roles; redirects to `/orders` if unauthorized

JWT is stored in `localStorage` as `app_token` and decoded client-side (in [src/utils/auth.js](src/utils/auth.js)) to extract `role`, `plan`, `trialEndsAt`, and `exp`.

### API Layer

All HTTP calls go through [src/services/api.js](src/services/api.js). It reads `VITE_API_URL` from the environment and attaches `Authorization: Bearer <token>` from `localStorage`. The `apiFetch` wrapper in `auth.js` intercepts 401 (→ `/login`) and 403 `trial_expired` (→ `/upgrade`).

### State & Theming

- `SidebarContext` (in [src/App.jsx](src/App.jsx)) manages sidebar collapse/mobile drawer state across Layout
- Theme (`picking_theme`) is persisted in `localStorage` and applied as `data-theme` on `document.documentElement`
- Each page component manages its own fetch, filter, and loading state locally

### User Roles

| Role | Access |
|---|---|
| ADMIN | Everything including `/settings`, `/admin` |
| SUPERVISOR | `/assign-delivery`, `/packing-log` |
| PICKER | `/orders`, `/scan`, `/order-history` |
| DELIVERY | `/my-deliveries` |

### Key Features

- **Barcode scanning** ([src/pages/ScanOrder.jsx](src/pages/ScanOrder.jsx), [src/components/CameraScanner.jsx](src/components/CameraScanner.jsx)): global keyboard listener differentiates hardware scanner input (fast, <50ms between chars) from manual typing; ZXing for camera-based scanning
- **PDF reports** ([src/utils/reports.js](src/utils/reports.js)): generated with jsPDF + jspdf-autotable
- **Mercado Libre integration**: orders synced via backend; OAuth callback handled at `/auth/success`

### Styling

Plain CSS files co-located with components/pages (e.g., `Orders.css` next to `Orders.jsx`). No CSS framework. Custom properties used for dark/light theming.
