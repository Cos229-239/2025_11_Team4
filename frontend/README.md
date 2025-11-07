# OrderEasy Frontend

React + Vite app for a multi-restaurant reservation and dine-in ordering platform.

## Environment

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

## Scripts

- `npm install` — install deps
- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — production build
- `npm run preview` — preview production build

## Key Routes

- `/` — Landing (Home + Restaurants options)
- `/restaurants` — Browse restaurants (search, cuisine filters, Near Me)
- `/restaurant/:id` — Restaurant details (menu preview, reserve/menu)
- `/restaurant/:id/menu` — Restaurant menu (add to cart)
- `/reserve/:id` — Reservation flow (date/time/party, availability)
- `/cart` — Select a table if not set, then checkout at `/cart/:tableId`
- `/kitchen-login` + `/kitchen` — PIN-protected kitchen dashboard
- `/login` + `/signup` — Email/password auth (JWT)
- `/profile` — Manage your profile (requires login)
- `/my-reservations` — View/cancel your reservations (requires login)

## Design

- Dark theme with orange/lime accents
- Mobile-first: BottomNav highlights Browse → Restaurants
- Accessibility: buttons with labels, clear states
