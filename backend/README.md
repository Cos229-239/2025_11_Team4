# OrderEasy Backend

Backend server for OrderEasy restaurant ordering application built with Node.js, Express, and Socket.IO.

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **PostgreSQL** - Database (via pg driver)
- **dotenv** - Environment variable management
- **CORS** - Cross-origin resource sharing

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ordereasy
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d
SEND_EMAILS=false
EMAIL_FROM="OrderEasy <no-reply@ordereasy.app>"
# Reservation policy: hours before start to allow cancel/refund for confirmed
CANCELLATION_WINDOW_HOURS=12
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 5000).

## Quick Start (Supabase/Railway)

1) Set `backend/.env` with a single `DATABASE_URL` and CORS origin

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
SEND_EMAILS=false
EMAIL_FROM="OrderEasy <no-reply@ordereasy.app>"
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d
```

2) Initialize schema + seeds (restaurants, menus, tables, reservations, orders)

Run `schema.sql` in your SQL editor (idempotent), or locally:

```
node scripts/setup-database.js
```

3) Start server

```
npm run dev
```

## Project Structure

```
backend/
├── config/          # Configuration files (database, etc.)
├── controllers/     # Route controllers
├── models/          # Database models
├── routes/          # API routes
├── sockets/         # Socket.IO event handlers
├── utils/           # Utility functions and helpers
├── server.js        # Main server file
├── .env             # Environment variables (not in git)
├── .env.example     # Environment variables template
└── package.json     # Dependencies and scripts
```

## API Endpoints

### Health Check
- `GET /` - Server status
- `GET /health` - Health check

### Restaurants
- `GET /api/restaurants` — list (filters: `status`, `cuisine`, `lat`,`lng`,`radius_km`)
- `GET /api/restaurants/:id` — details
- `GET /api/restaurants/:id/menu` — menu items (filters: `category`, `available`)
- `GET /api/restaurants/:id/menu/categories` — categories
- `GET /api/restaurants/:id/tables` — tables (filters: `status`, `capacity`)
- `GET /api/restaurants/:id/availability?date=YYYY-MM-DD&time=HH:MM&partySize=N` - available tables (90-min window)
- `GET /api/restaurants/:id/availability?date=YYYY-MM-DD&time=HH:MM&partySize=N` - available tables (window = `RESERVATION_DURATION_MINUTES`)

### Reservations
- `POST /api/reservations` - create (conflict detection on time range)
- `GET /api/reservations/:id` - details
- `GET /api/reservations` - list with filters (supports `user_id`)
- `PATCH /api/reservations/:id/status` - seat/complete/cancel/no-show (seating marks table occupied; complete/cancel frees if safe)
- `GET /api/reservations/restaurant/:restaurant_id/today` - today's reservations

### Payments
- `POST /api/payments/create-intent` – create payment intent (extends tentative hold)
- `POST /api/payments/confirm` – confirm a payment and reservation
- `POST /api/payments/refund` – refund and cancel reservation (policy enforced)
- `POST /api/payments/webhook` – Square webhook (raw body; signature verified)

### Orders
- `POST /api/orders` — create dine‑in order (guarded against imminent reservation on same table)
- `GET /api/orders/active` — active orders (kitchen)
- `GET /api/orders/:id` — details
- `PATCH /api/orders/:id/status` — update

## Socket.IO Events

### Client → Server Events

- `join-table` - Join a table-specific room
  ```js
  socket.emit('join-table', tableId);
  ```

- `join-kitchen` - Join the kitchen room
  ```js
  socket.emit('join-kitchen');
  ```

- `join-admin` - Join the admin room
  ```js
  socket.emit('join-admin');
  ```

- `new-order` - Submit a new order
  ```js
  socket.emit('new-order', orderData);
  ```

- `update-order-status` - Update order status
  ```js
  socket.emit('update-order-status', { orderId, status, tableId });
  ```

### Server → Client Events

- `order-created` - New order created (to kitchen & admin)
- `order-status-changed` - Order status updated (to table & admin)
- `order-cancelled` - Order cancelled (to kitchen, admin & table)
- `item-ready` - Item is ready (to table & admin)

## Database Notes

- `schema.sql` creates restaurants (with lat/lng), tables per restaurant, menu_items, orders (+ items), and reservations.
- Seeds include three demo restaurants, menus, tables, reservations (today/tomorrow), and orders across statuses.
- Overlap protection: exclusion constraint blocks overlapping active reservations for the same table.
- Seating logic: setting reservation to `seated` marks the table `occupied`; completing/cancelling/no‑show frees it if no other seated reservations remain.
- Users table for basic profiles; reservations optionally link to `user_id`.

### Cleanup Job (single runner)
- The cron job that expires tentative reservations runs in-process and uses a Postgres advisory lock (`CLEANUP_ADVISORY_LOCK_KEY`) so only one instance performs updates across multiple app instances.

### Square Webhook
- Mounted at `/api/payments/webhook` before the JSON body parser to keep the raw body for HMAC verification.
- Set `SQUARE_WEBHOOK_SIGNATURE_KEY` to your Square Webhook Signature Key; set `SQUARE_WEBHOOK_ENABLED=true` to enable.
- The handler confirms reservations on `payment.created/updated` with `status=COMPLETED` by deriving `reservationId` from `payment.reference_id`, `metadata.reservation_id`, or `note` (e.g., `reservation:123`).

## Email (stub)

This repo includes a lightweight email service stub:

- Files: `utils/email.service.js`, `utils/email.templates.js`, `utils/ics.js`
- On reservation creation, if `customer_email` is provided, a confirmation email is sent when `SEND_EMAILS=true` and SMTP is configured; otherwise it is logged.
- Configure SMTP via env vars above. For secure ports, set `SMTP_SECURE=true` (e.g., port 465).
- Provider integration uses Nodemailer; install deps with `npm install` in `backend/`.
- iCalendar attachment: reservation confirmation includes an `.ics` file (90‑minute event) customers can add to their calendars.

## Development

- Add new routes in the `routes/` folder
- Add corresponding controllers in the `controllers/` folder
- Socket event handlers go in the `sockets/` folder
- Database queries and models go in the `models/` folder
- Utility functions go in the `utils/` folder

## Error Handling

The server includes global error handling middleware. All errors are caught and returned in a consistent format:

```json
{
  "error": "Error message",
  "stack": "Stack trace (only in development)"
}
```

## CORS Configuration

CORS is configured to allow requests from the frontend URL specified in the `.env` file. Update `FRONTEND_URL` to match your frontend application URL.

## Tables & QR Codes

OrderEasy supports table management with QR codes that link directly to the customer menu for a given table.

- Base URL encoded in QR:
  - Development: `http://localhost:5173/menu/{tableId}`
  - Production: `https://ordereasy.app/menu/{tableId}`
  - Can be overridden with `FRONTEND_URL`.

### Endpoints

- `GET /api/tables` — List all tables.
- `GET /api/tables/:id` — Get one table.
- `POST /api/tables` — Create a table and generate its QR code.
  - Body example:
    ```json
    { "table_number": 1, "capacity": 4, "status": "available" }
    ```
- `DELETE /api/tables/:id` — Delete a table (blocked if active orders exist).
- `GET /api/tables/:id/qrcode?format=png|dataurl` — Fetch QR (PNG image by default; `dataurl` returns base64 in JSON).
- `POST /api/tables/:id/qrcode/regenerate` — Regenerate QR and update the record.

### Admin UI

- Frontend route: `/admin/tables` shows a Table Management page to:
  - List tables, create new tables, view QR, download QR (PNG), and delete tables.

## License

ISC
### Users (Profiles)
- `POST /api/users` — create profile (name, phone, email)
- `GET /api/users?email=...` — fetch profile by email
- `GET /api/users/:id` — fetch by id
- `PUT /api/users/:id` — update profile

### Auth
- `POST /api/auth/signup` — create account (email/password); returns JWT + user
- `POST /api/auth/login` — sign in (email/password); returns JWT + user
