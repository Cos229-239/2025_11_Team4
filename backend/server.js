const express = require('express');
const cors = require('cors');
const http = require('http');
const net = require('net');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'OrderEasy API Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// API routes
const menuRoutes = require('./routes/menu.routes');
const orderRoutes = require('./routes/order.routes');
const tableRoutes = require('./routes/table.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const reservationRoutes = require('./routes/reservation.routes');

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reservations', reservationRoutes);
const userRoutes = require('./routes/user.routes');
app.use('/api/users', userRoutes);
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// Make io available in routes for Socket.IO events
app.set('io', io);

// Socket.IO connection handling
const { setupOrderSocket } = require('./sockets/order.socket');
setupOrderSocket(io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Centralized error handler
const { errorHandler } = require('./middleware/error.middleware');
app.use(errorHandler);

// Start server with automatic port fallback
const PREFERRED_PORT = parseInt(process.env.PORT, 10) || 5000;

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.once('close', () => resolve(true)).close())
      .listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(start, attempts = 20) {
  let port = start;
  for (let i = 0; i < attempts; i++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port);
    if (free) return port;
    port += 1;
  }
  // Fallback to ephemeral port if all tried are busy
  return 0;
}

(async () => {
  const chosenPort = await findAvailablePort(PREFERRED_PORT);
  if (chosenPort !== PREFERRED_PORT) {
    console.warn(`⚠️  Port ${PREFERRED_PORT} is in use. Falling back to ${chosenPort || 'an ephemeral port'}.`);
  }
  server.listen(chosenPort, () => {
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : chosenPort;
    console.log(`Server running on port ${boundPort}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    if (boundPort !== PREFERRED_PORT) {
      console.log(`Note: Frontend requests must target http://localhost:${boundPort}. Set VITE_API_URL accordingly.`);
    }
  });
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
