# OrderEasy — Multi-Restaurant Reservations + Dine‑In Ordering

OrderEasy is a full‑stack web app for browsing restaurants, reserving tables, and placing dine‑in orders from the table. It includes a PIN‑protected Kitchen Dashboard for real‑time order management.

## Monorepo Layout

```
frontend/   # React + Vite app (dark theme, Restaurants flow, cart)
backend/    # Node.js + Express + Socket.IO API (Postgres)
```

Key READMEs:
- Frontend: `frontend/README.md`
- Backend: `backend/README.md`

## Features

- Multi‑restaurant browsing with search, cuisine filters, and optional “Near Me” (geolocation)
- Restaurant details with menu preview and reservation CTA
- Reservations: date/time/party selection, availability check, table selection, confirmation
- Dine‑in ordering: add to cart, select table at checkout if not set
- Kitchen Dashboard: real‑time active orders (PIN‑protected)

## Quick Start

1) Backend env (Supabase/Railway/local Postgres)

Create `backend/.env`:

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
```

2) Initialize database schema + seeds

Run the contents of `backend/schema.sql` in your SQL editor (idempotent), or locally:

```
cd backend
npm install
node setup-database.js
```

3) Start backend

```
cd backend
npm run dev
```

4) Frontend env + dev server

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

Then run:

```
cd frontend
npm install
npm run dev
```

Frontend dev server runs at http://localhost:5173

## Notable Backend Behavior

- Reservation overlap protection at DB level (90‑minute window per table) — exclusion constraint via btree_gist
- Setting reservation to `seated` marks table `occupied`; completing/cancelling/no‑show frees table when safe
- Creating a dine‑in order is blocked (409) if there’s an imminent reservation on the same table (within 90 minutes)
- GET `/api/restaurants` supports `lat`,`lng`,`radius_km` for proximity filtering

## Primary Routes

Frontend
- `/` — Landing
- `/restaurants` — Browse restaurants
- `/restaurant/:id` — Restaurant details
- `/restaurant/:id/menu` — Restaurant menu
- `/reserve/:id` — Reservations flow
- `/cart` → `/cart/:tableId` — Select table + checkout
- `/kitchen-login` + `/kitchen` — Kitchen Dashboard (PIN)

Backend (see backend/README.md for full list)
- `/api/restaurants`, `/api/restaurants/:id`, `/api/restaurants/:id/menu`
- `/api/restaurants/:id/availability?date&time&partySize`
- `/api/reservations` (+ status updates)
- `/api/orders` (+ active, status updates)

## Housekeeping

- Only three READMEs are kept: this root README.md, plus frontend/README.md and backend/README.md.
- To remove screenshots:
  - PowerShell: `Remove-Item -Recurse -Force .\ScreenShots`

