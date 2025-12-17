# OrderEasy Backend

Backend server for the OrderEasy restaurant ordering application. Built with Node.js, Express, Socket.IO, and PostgreSQL.

## 🛠️ Tech Stack

- **Runtime:** Node.js v18+
- **Framework:** Express 4
- **Database:** PostgreSQL 14+ (via `pg` driver)
- **Real-Time:** Socket.IO 4.8
- **Authentication:** JWT with bcrypt password hashing
- **Security:** Helmet, CORS, rate limiting
- **Email:** Nodemailer with SMTP support
- **QR Codes:** qrcode library
- **Utilities:** dotenv, compression, node-cron

## 📦 Dependencies

### Production
```json
{
  "bcryptjs": "^2.4.3",           // Password hashing
  "compression": "^1.7.4",        // Response compression
  "cors": "^2.8.5",               // Cross-origin resource sharing
  "dotenv": "^17.2.3",            // Environment variables
  "express": "^4.21.2",           // Web framework
  "express-rate-limit": "^8.2.1", // Rate limiting
  "helmet": "^7.1.0",             // Security headers
  "jsonwebtoken": "^9.0.2",       // JWT authentication
  "node-cron": "^4.2.1",          // Scheduled tasks
  "nodemailer": "^7.0.10",        // Email service
  "pg": "^8.16.3",                // PostgreSQL client
  "qrcode": "^1.5.4",             // QR code generation
  "socket.io": "^4.8.1"           // Real-time bidirectional communication
}
```

### Development
```json
{
  "nodemon": "^3.1.10"            // Auto-restart on changes
}
```

## 🚀 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Generate Secure JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Update `.env` File

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration (choose one)
# Option 1: Individual credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ordereasy
DB_USER=postgres
DB_PASSWORD=your_password

# Option 2: Connection URL (Supabase/Railway)
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require

# Authentication
JWT_SECRET=<paste-generated-secret-here>
JWT_EXPIRES_IN=7d

# Email Configuration
SEND_EMAILS=false
EMAIL_FROM="OrderEasy <no-reply@ordereasy.app>"
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# Reservation Policy
CANCELLATION_WINDOW_HOURS=12
RESERVATION_DURATION_MINUTES=90
```

### 5. Initialize Database
```bash
# Run schema.sql in your PostgreSQL database
psql -U postgres -d ordereasy -f schema.sql

# Or use the setup script
node scripts/setup-database.js
```

## 🏃 Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will start on `http://localhost:5000` (or the port specified in `.env`).

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js         # PostgreSQL connection pool
├── controllers/
│   ├── menu.controller.js       # Menu item operations
│   ├── table.controller.js      # Table & QR code management  
│   └── reservation.controller.js # Reservation logic
├── middleware/
│   ├── auth.middleware.js       # JWT verification
│   ├── rateLimit.middleware.js  # Rate limiting
│   └── rbac.middleware.js       # Role-based access control
├── models/
│   ├── menu.model.js       # Menu database queries
│   ├── table.model.js      # Table database queries
│   └── reservation.model.js # Reservation database queries
├── routes/
│   ├── auth.routes.js      # Authentication endpoints
│   ├── restaurants.routes.js    # Restaurant endpoints
│   ├── menu.routes.js      # Menu endpoints
│   ├── tables.routes.js    # Table management endpoints
│   ├── reservations.routes.js   # Reservation endpoints
│   ├── orders.routes.js    # Order endpoints
│   ├── payments.routes.js  # Payment integration
│   ├── users.routes.js     # User profile endpoints
│   └── admin.routes.js     # Admin endpoints
├── sockets/
│   └── orderSocket.js      # Socket.IO event handlers
├── utils/
│   ├── qrcode.util.js      # QR code generation
│   ├── email.service.js    # Email sending
│   ├── email.templates.js  # Email templates
│   └── ics.js              # iCalendar file generation
├── jobs/
│   └── reservationCleanup.js    # Cron job for expired reservations
├── scripts/
│   ├── setup-database.js   # Database initialization
│   ├── check_tables.js     # Table verification
│   ├── debug_tables.js     # Detailed table inspection
│   ├── check-restaurants.js # Verify restaurant data
│   ├── check_users.js      # Verify user data
│   └── add_timezone_to_restaurants.js # Schema migration utility
├── schema.sql              # Database schema + seed data
├── server.js               # Main application entry point
├── .env.example            # Environment template
└── package.json            # Dependencies & scripts
```

## 🌐 API Endpoints

### Health & Status
- `GET /` - Server status
- `GET /health` - Health check

### Authentication
- `POST /api/auth/signup` - Create account (email/password)
  - **Body:** `{ "email": "user@example.com", "password": "securepass", "name": "John Doe" }`
  - **Returns:** JWT token + user object
- `POST /api/auth/login` - Sign in (email/password)
  - **Body:** `{ "email": "user@example.com", "password": "securepass" }`
  - **Returns:** JWT token + user object

### Restaurants
- `GET /api/restaurants` - List all restaurants
  - **Query params:** `status`, `cuisine`, `lat`, `lng`, `radius_km`
  - **Example:** `/api/restaurants?lat=37.7749&lng=-122.4194&radius_km=5`
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu
  - **Query params:** `category`, `available`
- `GET /api/restaurants/:id/menu/categories` - Get menu categories
- `GET /api/restaurants/:id/tables` - Get restaurant tables
  - **Query params:** `status`, `capacity`
- `GET /api/restaurants/:id/availability` - Check table availability
  - **Required params:** `date` (YYYY-MM-DD), `time` (HH:MM), `partySize` (number)
  - **Example:** `/api/restaurants/1/availability?date=2025-12-20&time=19:00&partySize=4`

### Reservations
- `POST /api/reservations` - Create reservation
  - **Body:** `{ "restaurant_id": 1, "table_id": 3, "customer_name": "John Doe", "customer_email": "john@example.com", "party_size": 4, "reservation_date": "2025-12-20", "reservation_time": "19:00", "special_requests": "Window seat" }`
  - **Note:** Conflict detection prevents overlapping reservations
- `GET /api/reservations/:id` - Get reservation details
- `GET /api/reservations` - List reservations
  - **Query params:** `user_id`, `status`, `restaurant_id`
- `PATCH /api/reservations/:id/status` - Update reservation status
  - **Body:** `{ "status": "seated" }` (seated, completed, cancelled, no-show)
  - **Note:** Setting to "seated" marks table as occupied
- `GET /api/reservations/restaurant/:restaurant_id/today` - Get today's reservations

### Orders
- `POST /api/orders` - Create dine-in order
  - **Body:** `{ "restaurant_id": 1, "table_id": 5, "items": [{ "menu_item_id": 10, "quantity": 2, "special_instructions": "No onions" }], "customer_notes": "Extra napkins" }`
  - **Note:** Blocked if imminent reservation exists on table (within 90 min)
- `GET /api/orders/active` - Get active orders (for kitchen dashboard)
  - **Returns:** Orders with status 'pending', 'preparing', or 'ready'
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status
  - **Body:** `{ "status": "preparing" }` (pending, preparing, ready, completed, cancelled)

### Tables
- `GET /api/tables` - List all tables
  - **Note:** Frontend filters by `restaurant_id` client-side
- `GET /api/tables/:id` - Get single table
- `POST /api/tables` - Create table with QR code
  - **Body:** `{ "restaurant_id": 1, "table_number": 10, "capacity": 4, "status": "available" }`
  - **Returns:** Table object with auto-generated QR code
- `PATCH /api/tables/:id` - Update table
  - **Body:** `{ "capacity": 6, "status": "out-of-service" }`
- `DELETE /api/tables/:id` - Delete table
  - **Note:** Blocked if active orders exist
- `GET /api/tables/:id/qrcode` - Get QR code image
  - **Query param:** `format=png` (default) or `format=dataurl`
- `POST /api/tables/:id/qrcode/regenerate` - Regenerate QR code

### Users
- `POST /api/users` - Create user profile
  - **Body:** `{ "name": "Jane Doe", "phone": "555-1234", "email": "jane@example.com" }`
- `GET /api/users?email=...` - Get user by email
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Payments (Stub)
- `POST /api/payments/create-intent` - Create payment intent (extends tentative hold)
- `POST /api/payments/confirm` - Confirm payment and reservation
- `POST /api/payments/refund` - Refund and cancel reservation (policy enforced)
- `POST /api/payments/webhook` - Square webhook (signature verified)

### Admin
- `GET /api/admin/stats` - Get dashboard statistics (requires owner+ role)

## 🔌 Socket.IO Events

### Client → Server

#### Kitchen Dashboard
```javascript
// Join kitchen room to receive order updates
socket.emit('join-kitchen');

// Update order status from kitchen
socket.emit('update-order-status', {
  orderId: 123,
  status: 'preparing',
  tableId: 5
});
```

#### Customer Orders
```javascript
// Join table-specific room for order updates
socket.emit('join-table', tableId);

// Submit new order
socket.emit('new-order', {
  restaurant_id: 1,
  table_id: 5,
  items: [
    { menu_item_id: 10, quantity: 2, special_instructions: 'No onions' }
  ],
  customer_notes: 'Extra napkins'
});
```

#### Admin Panel
```javascript
// Join admin room for all updates
socket.emit('join-admin');
```

### Server → Client

```javascript
// New order created (sent to kitchen & admin)
socket.on('order-created', (order) => {
  console.log('New order:', order);
});

// Order status changed (sent to table & admin)
socket.on('order-status-changed', ({ orderId, status, tableId }) => {
  console.log(`Order ${orderId} is now ${status}`);
});

// Order cancelled (sent to kitchen, admin, & table)
socket.on('order-cancelled', ({ orderId, tableId }) => {
  console.log(`Order ${orderId} cancelled`);
});

// Item ready notification (sent to table & admin)
socket.on('item-ready', ({ orderId, itemName, tableId }) => {
  console.log(`${itemName} is ready for table ${tableId}`);
});
```

## 🗄️ Database Schema

### Core Tables
- **restaurants** - Restaurant details with geolocation
- **users** - User accounts and profiles
- **roles** & **user_roles** - RBAC implementation
- **user_restaurants** - Scoped restaurant access
- **menu_items** - Menu items per restaurant
- **tables** - Physical tables with QR codes
- **reservations** - Table reservations with time slots
- **orders** & **order_items** - Customer orders
- **reservation_settings** - Per-restaurant policies
- **webhook_events** - Payment webhook deduplication

### Key Features
- **Multi-Restaurant Support** - All data scoped by `restaurant_id`
- **Reservation Overlap Prevention** - GIST exclusion constraint
  ```sql
  EXCLUDE USING GIST (table_id WITH =, active_window WITH &&)
  ```
- **Row Level Security (RLS)** - Enabled on all tables with public read policies
- **Computed Columns** - `reservation_start`, `reservation_end`, `active_window`
- **Seed Data** - 3 demo restaurants with menus, tables, and sample reservations

### Functions
- `check_reservation_conflicts()` - Validate reservation time slots
- `cleanup_expired_reservations()` - Expire tentative reservations
- `seed_developer()` - Helper to assign developer role

See [`schema.sql`](file:///c:/Users/zplnd/StudioProjects/2025_11_Team4/backend/schema.sql) for complete schema.

## 🔐 Security

### Authentication & Authorization
- **JWT Tokens** - Secure, stateless authentication
- **Password Hashing** - bcrypt with salt rounds
- **RBAC** - Four roles: developer, owner, employee, customer
- **Route Protection** - Middleware validates JWT and checks roles

### Rate Limiting
- **General API:** 100 requests per 15 minutes per IP
- **Auth Endpoints:** 5 attempts per 15 minutes per IP
- **Window Reset:** Sliding window

### Data Protection
- **Parameterized Queries** - All database operations use prepared statements
- **CORS Whitelist** - Configured via `FRONTEND_URL` environment variable
- **Helmet.js** - Security headers (CSP, XSS protection, etc.)
- **Environment Variables** - Sensitive data stored in `.env` (not in git)

### Known Limitations
- ⚠️ No CSRF protection (planned)
- ⚠️ Requires HTTPS in production

## 📧 Email Service

Reservation confirmations are sent automatically when `SEND_EMAILS=true` and SMTP is configured.

### Features
- **Nodemailer Integration** - SMTP email sending
- **iCalendar Attachments** - `.ics` files for calendar apps
- **Email Templates** - HTML and plain text versions
- **Graceful Fallback** - Logs email content if SMTP fails

### Configuration
```env
SEND_EMAILS=true
EMAIL_FROM="OrderEasy <no-reply@ordereasy.app>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

## ⚙️ Background Jobs

### Reservation Cleanup (Cron)
- **Schedule:** Runs every 5 minutes
- **Function:** Expires tentative reservations that are past their `expires_at` time
- **Concurrency:** Uses PostgreSQL advisory lock to prevent duplicate execution
- **Lock Key:** `CLEANUP_ADVISORY_LOCK_KEY` environment variable

```javascript
// jobs/reservationCleanup.js
cron.schedule('*/5 * * * *', async () => {
  // Acquire lock, cleanup, release
});
```

## 🎯 Business Logic

### Reservation Lifecycle
1. **Tentative** - Initial state, payment pending, expires in 15 mins
2. **Confirmed** - Payment completed
3. **Seated** - Customer arrived, table marked as occupied
4. **Completed** - Meal finished, table freed
5. **Cancelled** - Customer cancelled within window
6. **No-Show** - Customer didn't arrive, table freed after window
7. **Expired** - Payment not completed in time

### Table Status Management
- **Available** - Ready for use
- **Reserved** - Has active reservation
- **Occupied** - Currently in use (seated reservation or active order)
- **Out-of-Service** - Temporarily unavailable

**Note:** Setting reservation to `seated` automatically marks table as `occupied`. Completing/cancelling/no-show frees the table if no other seated reservations exist.

### Order & Reservation Conflicts
- Creating a dine-in order is **blocked (409 Conflict)** if there's a confirmed reservation on the same table within 90 minutes.
- This prevents customers from ordering at a table that's about to be reserved.

## 🧑‍💻 Development

### Adding New Endpoints
1. Create route handler in `routes/`
2. Implement controller logic in `controllers/`
3. Add database queries in `models/`
4. Update this README with endpoint documentation

### Database Migrations
- Manual migrations: Add new SQL to `schema.sql` with idempotent checks
- Run: `psql -U postgres -d ordereasy -f schema.sql`

### Testing Scripts
```bash
# Verify table data
node scripts/check_tables.js

# Detailed table inspection
node scripts/debug_tables.js

# Reinitialize database (CAUTION: destructive)
node scripts/setup-database.js
```

## 🐛 Debugging

### Enable Verbose Logging
```env
NODE_ENV=development
```

### Common Issues

**Database Connection Errors:**
- Verify PostgreSQL is running: `psql -U postgres -l`
- Check firewall rules and connection credentials
- Ensure database exists: `CREATE DATABASE ordereasy;`

**Socket.IO Not Connecting:**
- Verify `FRONTEND_URL` in `.env` matches frontend origin
- Check CORS policy in `server.js`
- Ensure Socket.IO client version matches server version

**QR Codes Not Generating:**
- Verify `qrcode` package is installed
- Check file permissions for QR code storage
- Ensure `FRONTEND_URL` is set correctly (used in QR code URLs)

## 📜 License

ISC

## 🙏 Credits

- **Team:** COS229-239/2025_11_Team4
- **Database:** PostgreSQL with btree_gist extension
- **Real-Time:** Socket.IO
- **QR Codes:** qrcode library
- **Email:** Nodemailer
