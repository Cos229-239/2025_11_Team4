# OrderEasy Frontend

Modern React 19 application for the OrderEasy restaurant ordering platform. Built with Vite, Tailwind CSS 4, and Socket.IO for real-time updates.

## 🛠️ Tech Stack

- **React** 19.1 - UI library with latest features
- **Vite** 7.1 - Lightning-fast build tool and dev server
- **Tailwind CSS** 4.1 - Utility-first CSS framework
- **React Router** 7.9 - Client-side routing
- **Socket.IO Client** 4.8 - Real-time bidirectional communication
- **html5-qrcode** 2.3 - QR code scanner component
- **Heroicons** 2.2 - Beautiful SVG icons

## 📦 Dependencies

### Production
```json
{
  "@heroicons/react": "^2.2.0",      // Icon library
  "html5-qrcode": "^2.3.8",          // QR code scanner
  "react": "^19.1.1",                // UI library
  "react-dom": "^19.1.1",            // React DOM renderer
  "react-router-dom": "^7.9.5",      // Routing
  "socket.io-client": "^4.8.1"       // Real-time updates
}
```

### Development
```json
{
  "@vitejs/plugin-react": "^5.0.4",  // Vite React plugin
  "@tailwindcss/postcss": "^4.1.16", // Tailwind PostCSS plugin
  "tailwindcss": "^4.1.16",          // CSS framework
  "vitest": "^4.0.8",                // Testing framework
  "@testing-library/react": "^16.3.0", // React testing utilities
  "@testing-library/jest-dom": "^6.9.1", // Jest matchers
  "eslint": "^9.36.0",               // Code linting
  "autoprefixer": "^10.4.21",        // CSS vendor prefixes
  "postcss": "^8.5.6"                // CSS transformations
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

Update `.env`:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```

App runs on **http://localhost:5173**

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code with ESLint
npm run test         # Run tests with Vitest
npm run test:ui      # Open Vitest UI
npm run test:run     # Run tests in CI mode
```

## 📁 Project Structure

```
frontend/
├── public/
│   └── vite.svg              # Favicon
├── src/
│   ├── assets/               # Static assets
│   ├── components/
│   │   ├── BottomNav.jsx         # Mobile bottom navigation
│   │   ├── CartButton.jsx        # Floating cart button
│   │   ├── CategoryTabs.jsx      # Menu category tabs
│   │   ├── ErrorMessage.jsx      # Error display component
│   │   ├── Footer.jsx            # Site footer
│   │   ├── LoadingSpinner.jsx    # Loading indicator
│   │   ├── Logo.jsx              # Brand logo
│   │   ├── MenuItemCard.jsx      # Menu item display card
│   │   ├── Navbar.jsx            # Top navigation bar
│   │   ├── OrderCard.jsx         # Order display card
│   │   ├── RestaurantCard.jsx    # Restaurant list card
│   │   ├── ProtectedRoute.jsx    # Auth route guard (legacy)
│   │   ├── RoleRoute.jsx         # RBAC route guard
│   │   └── UserProtectedRoute.jsx // User auth guard
│   ├── context/
│   │   ├── CartContext.jsx       # Shopping cart state
│   │   ├── SocketContext.jsx     # Socket.IO connection
│   │   └── UserAuthContext.jsx   // User authentication state
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── MenuManagement.jsx    // Admin menu CRUD
│   │   │   └── TableManagement.jsx   // Admin table CRUD
│   │   ├── AboutPage.jsx
│   │   ├── AdminPanel.jsx            // Admin dashboard
│   │   ├── AdminSettings.jsx         // Admin configuration
│   │   ├── CartPage.jsx              // Shopping cart & checkout
│   │   ├── ConfirmationPage.jsx      // Order confirmation
│   │   ├── KitchenDashboard.jsx      // Real-time kitchen orders
│   │   ├── LandingPage.jsx           // Home page
│   │   ├── LoginPage.jsx             // User login
│   │   ├── MyReservations.jsx        // User reservation history
│   │   ├── OrderStatusPage.jsx       // Track order status
│   │   ├── PaymentPage.jsx           // Payment processing
│   │   ├── ProfilePage.jsx           // User profile management
│   │   ├── QRCheckPage.jsx           // QR code validation
│   │   ├── QRScannerPage.jsx         // QR code scanner
│   │   ├── ReservationConfirmationPage.jsx
│   │   ├── ReservationPage.jsx       // Reservation flow
│   │   ├── RestaurantDetailPage.jsx  // Restaurant info
│   │   ├── RestaurantListPage.jsx    // Browse restaurants
│   │   ├── RestaurantMenuPage.jsx    // View menu & add to cart
│   │   ├── SignupPage.jsx            // User registration
│   │   └── TableSelectPage.jsx       // Select dining table
│   ├── test/                     // Test files
│   ├── utils/
│   │   └── socket.util.js        // Socket.IO helper
│   ├── App.jsx                   // Root component with routing
│   ├── index.css                 // Global styles
│   └── main.jsx                  // Application entry point
├── .env.example                  // Environment template
├── eslint.config.js              // ESLint configuration
├── index.html                    // HTML entry point
├── package.json                  // Dependencies & scripts
├── postcss.config.js             // PostCSS configuration
├── tailwind.config.js            // Tailwind CSS configuration
├── vite.config.js                // Vite configuration
└── vitest.config.js              // Vitest configuration
```

## 🗂️ Key Routes

### Public Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | LandingPage | Home with navigation to restaurants/about |
| `/about` | AboutPage | About OrderEasy |
| `/restaurants` | RestaurantListPage | Browse all restaurants with filters |
| `/restaurant/:id` | RestaurantDetailPage | Restaurant info & menu preview |
| `/restaurant/:id/menu` | RestaurantMenuPage | Full menu with cart functionality |
| `/restaurant/:id/reserve` | ReservationPage | Table reservation flow |
| `/cart` | CartPage | Shopping cart & table selection |
| `/payment` | PaymentPage | Payment processing |
| `/confirmation/:orderId` | ConfirmationPage | Order confirmation |
| `/order-status/:orderNumber` | OrderStatusPage | Real-time order tracking |
| `/reservation-confirmation` | ReservationConfirmationPage | Reservation success |
| `/qr-check` | QRCheckPage | QR code validation |
| `/scan-qr` | QRScannerPage | QR code scanner |
| `/table-select` | TableSelectPage | Manual table selection |

### Auth Routes
| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| `/login` | LoginPage | No | User login |
| `/signup` | SignupPage | No | User registration |
| `/profile` | ProfilePage | Yes (user) | User profile management |
| `/my-reservations` | MyReservations | Yes (user) | Reservation history & cancellation |

### Protected Routes (RBAC)
| Route | Page | Allowed Roles | Description |
|-------|------|---------------|-------------|
| `/kitchen` | KitchenDashboard | developer, owner, employee | Real-time order management |
| `/admin` | AdminPanel | developer, owner | Admin dashboard with stats |
| `/admin/tables` | TableManagement | developer, owner | Table & QR code management |
| `/admin/menu` | MenuManagement | developer, owner | Menu item CRUD |
| `/admin/settings` | AdminSettings | developer, owner | System configuration |

## 🎨 Design System

### Theme
- **Primary Color:** Orange (#FF6B35)
- **Secondary Color:** Lime
- **Background:** Dark mode with gradients
- **Text:** Light gray on dark backgrounds

### Tailwind Configuration
Custom utilities defined in [`tailwind.config.js`](file:///c:/Users/zplnd/StudioProjects/2025_11_Team4/frontend/tailwind.config.js):

```javascript
{
  colors: {
    'brand-orange': '#FF6B35',
    'dark-bg': '#0a0a0a',
    'dark-card': '#141414',
    'dark-surface': '#1e1e1e',
    'text-primary': '#f5f5f5',
    'text-secondary': '#a0a0a0'
  },
  animations: {
    'pulse-once-orange': 'pulseOrange 0.5s ease-in-out',
    'pulse-once-lime': 'pulseLime 0.5s ease-in-out'
  }
}
```

### Responsive Design
- **Mobile-First:** All components start with mobile styles
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- **Bottom Navigation:** Mobile menu with cart, restaurants, profile
- **Top Navigation:** Desktop menu with search, auth, and links

## 🔌 Real-Time Features (Socket.IO)

### Socket Context
All components can access Socket.IO via `SocketContext`:

```javascript
import { useSocket } from '../context/SocketContext';

function MyComponent() {
  const { socket, connected } = useSocket();
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    socket.emit('join-kitchen');
    
    socket.on('order-created', (order) => {
      console.log('New order:', order);
    });
    
    return () => {
      socket.off('order-created');
    };
  }, [socket, connected]);
}
```

### Connection Management
- **Auto-Connect:** Connects when `SocketContext` mounts
- **Reconnection:** Automatic with exponential backoff
- **Event Cleanup:** Unsubscribes on component unmount

## 🛒 Cart Management

### Cart Context
Global shopping cart state using React Context:

```javascript
import { useCart } from '../context/CartContext';

function MenuItem({ item }) {
  const { addItem, cart } = useCart();
  
  const handleAdd = () => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1
    });
  };
  
  return (
    <button onClick={handleAdd}>Add to Cart ({cart.length})</button>
  );
}
```

### Features
- **Persistent Cart:** Survives page reloads
- **Quantity Updates:** Increment/decrement item quantities
- **Table Linking:** Associates cart with selected table
- **Total Calculation:** Auto-calculates subtotal, tax, total

## 🔐 Authentication & Authorization

### User Auth Context
JWT-based authentication with role management:

```javascript
import { useUserAuth } from '../context/UserAuthContext';

function Profile() {
  const { user, token, isAuthenticated, login, logout } = useUserAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <div>Welcome, {user.name}!</div>;
}
```

### Protected Routes
- **UserProtectedRoute:** Requires any authenticated user
- **RoleRoute:** Requires specific roles (developer, owner, employee)

```javascript
// Only developers and owners can access
<Route path="/admin" element={
  <RoleRoute allowedRoles={['developer', 'owner']}>
    <AdminPanel />
  </RoleRoute>
} />
```

### Token Storage
- **LocalStorage:** Stores JWT token
- **Auto-Logout:** Clears token on logout
- **Token Refresh:** Not implemented (future feature)

## 🧪 Testing

### Running Tests
```bash
npm run test        # Watch mode
npm run test:ui     # Interactive UI
npm run test:run    # CI mode
```

### Test Files
Located in `src/test/`:
- Unit tests for components
- Integration tests for user flows
- Mock data and utilities

### Testing Libraries
- **Vitest** - Fast unit testing
- **React Testing Library** - Component testing
- **jest-dom** - Custom matchers
- **user-event** - User interaction simulation

## 📱 Responsive Components

### Bottom Navigation (Mobile)
Sticky bottom menu with icons and labels:
- **Browse:** Navigate to restaurants
- **Cart:** View shopping cart
- **Profile:** Access user account

Automatically hides on desktop (`md:hidden`).

### Navbar (Desktop)
Top navigation bar with:
- **Logo:** Links to home
- **Search:** Quick restaurant search (future)
- **Links:** Restaurants, About, Kitchen (if employee+), Admin (if owner+)
- **Auth:** Login/Signup or Profile/Logout

## 🎯 Key Features

### Restaurant Discovery
- **Search:** Filter by name or cuisine
- **Categories:** Filter by cuisine type
- **Near Me:** Geolocation-based filtering (requires browser permission)
- **Sorting:** By rating, name, or cuisine

### Reservation Flow
1. Select date, time, and party size
2. View available tables
3. Select preferred table
4. Enter customer details
5. Confirm reservation (payment optional)

### QR Code Ordering
1. Scan QR code at table
2. Auto-detect table and restaurant
3. Browse menu
4. Add items to cart
5. Checkout and submit order
6. Track order status in real-time

### Kitchen Dashboard
- **Real-Time Orders:** Live updates via Socket.IO
- **Status Management:** Update order status (preparing, ready, completed)
- **Order Details:** View items, special instructions, table number
- **Color-Coded:** Visual distinction between order statuses

#### Yukon Text Commands (MVP)
Yukon supports text-based kitchen commands from the Kitchen Dashboard chat. Commands require a short confirmation step. Examples:
- `Start order 37` → prepares Order #37 (confirmation required)
- `Mark order 38 as ready` → sets Order #38 to `ready`
- `Cancel order 41` → cancels Order #41
- `Log 2 cases of tomatoes` → logs inventory (updated in-dashboard inventory state)

Confirmation is required for destructive or state-changing commands — reply `Yes` to confirm or `No` to cancel. Yukon will reflect updates via the existing order socket events and the inventory change is applied immediately to the dashboard state.

### Admin Panel
- **Statistics:** Total restaurants, tables, active orders
- **Table Management:** Create, edit, delete tables with QR codes
- **Menu Management:** CRUD operations for menu items
- **Multi-Restaurant:** Filter by restaurant

## 🐛 Debugging

### React DevTools
Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.

### Vite Hot Module Replacement (HMR)
- Changes auto-reload in development
- Preserves component state when possible
- Check console for HMR errors

### Socket.IO Debugging
Enable verbose logging:
```javascript
// In SocketContext.jsx
const socket = io(API_URL, {
  transports: ['websocket'],
  debug: true  // Add this line
});
```

### Common Issues

**API Connection Failed:**
- Verify `VITE_API_URL` in `.env` matches backend URL
- Check backend server is running (`npm run dev` in backend)
- Verify CORS configuration in backend

**Socket.IO Not Connecting:**
- Check browser console for connection errors
- Verify Socket.IO server version matches client version
- Ensure backend allows WebSocket connections

**Cart Not Persisting:**
- Check browser localStorage is enabled
- Clear localStorage and retry: `localStorage.clear()`

**QR Scanner Not Working:**
- Grant camera permissions in browser
- Use HTTPS in production (camera API requires secure context)
- Test on mobile device (not all desktop webcams work well)

## 🚀 Production Build

### Build Process
```bash
npm run build
```

Output in `dist/` directory.

### Build Optimizations
- **Code Splitting:** Automatic route-based splitting
- **Tree Shaking:** Removes unused code
- **Minification:** CSS and JavaScript compression
- **Asset Optimization:** Images and SVGs optimized

### Preview Production Build
```bash
npm run preview
```

### Environment Variables
For production, update `.env`:
```env
VITE_API_URL=https://api.ordereasy.com
```

**Note:** Vite requires `VITE_` prefix for environment variables.

### Deployment Checklist
- [ ] Update `VITE_API_URL` to production backend
- [ ] Run `npm run build`
- [ ] Test production build with `npm run preview`
- [ ] Deploy `dist/` directory to hosting provider
- [ ] Configure HTTPS (required for QR scanner and geolocation)
- [ ] Set up CDN for static assets (optional)

### Recommended Hosting
- **Vercel** - Zero-config deployments
- **Netlify** - Continuous deployment from Git
- **AWS S3 + CloudFront** - Scalable static hosting
- **GitHub Pages** - Free static hosting

## 🎓 Learning Resources

- [React 19 Docs](https://react.dev/)
- [Vite Guide](https://vite.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)

## 📜 License

ISC

## 🙏 Credits

- **Team:** COS229-239/2025_11_Team4
- **UI Framework:** React 19
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **Icons:** Heroicons
- **Real-Time:** Socket.IO
