# OrderEasy — Multi-Restaurant Ordering & Reservation Platform

OrderEasy is a modern, full-stack web application for restaurant discovery, table reservations, and dine-in ordering. Built with a focus on real-time communication, security, and user experience, it provides a comprehensive solution for both customers and restaurant staff.

## 🌟 Features

### Customer Experience
- **Restaurant Discovery** - Browse restaurants with search, cuisine filters, and location-based "Near Me" functionality
- **Table Reservations** - Complete reservation flow with date/time selection, party size, and availability checking
- **QR Code Ordering** - Scan table QR codes to instantly access restaurant menus
- **Dine-In Ordering** - Add items to cart, select tables, and place orders
- **User Accounts** - Create profiles, manage reservations, and track order history
- **Real-Time Updates** - Live order status updates via Socket.IO

### Staff & Admin Tools
- **Kitchen Dashboard** - Real-time order management with status updates (role-protected)
- **Admin Panel** - Restaurant, table, and menu management (RBAC with developer/owner roles)
- **Table Management** - Create tables with auto-generated QR codes, manage capacity and status
- **Menu Management** - Full CRUD operations for menu items with categorization
- **Role-Based Access Control** - Granular permissions for developers, owners, employees, and customers

## 🏗️ Architecture

```
OrderEasy/
├── backend/          # Node.js + Express API with Socket.IO
├── frontend/         # React 19 + Vite SPA
├── Supabase(edgefunction)/  # Edge functions (if using Supabase)
└── ReadMe.md         # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**

### 1. Clone and Install

```bash
git clone <repository-url>
cd 2025_11_Team4

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

Create a PostgreSQL database and run the schema:

```bash
cd backend
psql -U postgres -d ordereasy -f schema.sql

# Or use the setup script
node scripts/setup-database.js
```

The schema includes:
- Multi-restaurant support with geolocation
- Tables with QR code generation
- Menu items with categories
- Reservations with conflict prevention
- Orders with real-time status tracking
- RBAC with roles and permissions
- Seed data for 3 demo restaurants

### 3. Backend Configuration

```bash
cd backend
cp .env.example .env
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update `backend/.env` with your configuration:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (Choose one approach)
# Option 1: Individual credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ordereasy
DB_USER=postgres
DB_PASSWORD=your_password

# Option 2: Connection URL (Supabase/Railway)
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require

# Authentication
JWT_SECRET=<your-generated-secret>
JWT_EXPIRES_IN=7d

# Email (optional)
SEND_EMAILS=false
EMAIL_FROM="OrderEasy <no-reply@ordereasy.app>"
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# Reservations
CANCELLATION_WINDOW_HOURS=12
RESERVATION_DURATION_MINUTES=90
```

### 4. Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Update `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### 5. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

## 📚 Documentation

- **[Backend README](backend/README.md)** - API endpoints, Socket.IO events, database schema
- **[Frontend README](frontend/README.md)** - Components, routing, context providers

## 🛡️ Security Features

- **Rate Limiting** - 100 requests per 15 minutes (general), 5 attempts per 15 minutes (auth)
- **JWT Authentication** - Secure token-based authentication with bcrypt password hashing
- **SQL Injection Protection** - Parameterized queries throughout
- **CORS Whitelist** - Configured origin protection
- **Role-Based Access Control** - Granular permissions for different user types
- **Helmet.js** - Security headers
- **Compression** - Response compression for performance

**⚠️ Known Limitations:**
- No CSRF protection (planned for future release)
- HTTPS required for production deployment

## 🗄️ Database Schema Highlights

### Tables
- **restaurants** - Multi-restaurant support with geolocation (lat/lng)
- **users** - User profiles with email/password authentication
- **roles** & **user_roles** - RBAC implementation
- **menu_items** - Restaurant menus with categories
- **tables** - Physical tables with QR codes
- **reservations** - Time-slot bookings with conflict prevention
- **orders** & **order_items** - Dine-in orders with status tracking

### Key Constraints
- **Reservation Overlap Prevention** - GIST exclusion constraint prevents double-booking
- **Table Uniqueness** - Unique table numbers per restaurant
- **Menu Item Uniqueness** - Unique menu item names per restaurant
- **Status Validation** - CHeck constraints ensure valid status values

## 🎯 Key Routes

### Frontend
| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page | No |
| `/restaurants` | Browse restaurants | No |
| `/restaurant/:id` | Restaurant details | No |
| `/restaurant/:id/menu` | Restaurant menu | No |
| `/restaurant/:id/reserve` | Reservation flow | Optional |
| `/cart` | Shopping cart | No |
| `/order-status/:orderNumber` | Track order | No |
| `/kitchen` | Kitchen dashboard | Yes (employee+) |
| `/admin` | Admin panel | Yes (owner+) |
| `/admin/tables` | Table management | Yes (owner+) |
| `/admin/menu` | Menu management | Yes (owner+) |
| `/profile` | User profile | Yes |
| `/my-reservations` | Reservation history | Yes |

### Backend API
See **[backend/README.md](backend/README.md)** for complete endpoint documentation.

Key endpoints:
- `GET /api/restaurants` - List restaurants (supports geolocation filtering)
- `GET /api/restaurants/:id/availability` - Check table availability
- `POST /api/reservations` - Create reservation
- `POST /api/orders` - Place order
- `GET /api/orders/active` - Get active orders (kitchen)
- `POST /api/tables` - Create table with QR code

## 🔌 Real-Time Communication

Socket.IO powers real-time features:

**Client Events:**
- `join-kitchen` - Subscribe to kitchen updates
- `join-table` - Subscribe to  table updates
- `new-order` - Submit new order
- `update-order-status` - Change order status

**Server Events:**
- `order-created` - New order notification
- `order-status-changed` - Status update broadcast
- `item-ready` - Item preparation complete

## 🎨 Design System

- **Framework:** Tailwind CSS 4.1
- **Theme:** Dark mode with orange (#FF6B35) and lime accents
- **Typography:** System fonts with custom utilities
- **Mobile-First:** Responsive design with bottom navigation
- **Accessibility:** ARIA labels, keyboard navigation, clear focus states

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Developer** | Full system access |
| **Owner** | Restaurant management, admin panel |
| **Employee** | Kitchen dashboard, order management |
| **Customer** | Browse, order, reserve |

## 🧪 Testing

**Frontend:**
```bash
cd frontend
npm run test        # Run tests
npm run test:ui     # Test UI
npm run test:run    # CI mode
```

**Backend:**
Test scripts available in `backend/scripts/` directory.

## 🚢 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure production database URL
4. Enable HTTPS
5. Configure SMTP for emails
6. Set up process manager (PM2, systemd)

### Frontend
```bash
cd frontend
npm run build
npm run preview  # Test production build locally
```

Deploy the `dist/` directory to your hosting provider.

### Environment Variables
- Set `FRONTEND_URL` to production domain
- Configure CORS whitelist
- Update QR code base URLs

## 📊 Database Maintenance

**Automatic Tasks:**
- Expired reservation cleanup (runs via cron job with advisory locks)
- Table status updates based on reservation lifecycle

**Manual Scripts:**
```bash
cd backend
node scripts/check_tables.js        # Verify table data
node scripts/debug_tables.js        # Detailed table inspection
node scripts/setup-database.js     # Reinitialize database
```

## 🤝 Contributing

This is a class project for COS229-239. For contributions:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

ISC

## 🙏 Acknowledgments

- Built with React 19, Express 5, and PostgreSQL
- Real-time functionality powered by Socket.IO
- UI components styled with Tailwind CSS 4

---

**For detailed technical documentation, see:**
- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)
