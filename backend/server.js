const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');

const { Server } = require('socket.io');
require('dotenv').config();
const { validateEnv } = require('./utils/env.validation');
validateEnv();
const logger = require('./utils/logger');
const { authenticateToken, requireRole } = require('./middleware/auth.middleware');



// Background jobs
const cleanupJob = require('./jobs/cleanup-reservations');

// Initialize Express app
const app = express();
let server; // created per-attempt to allow safe retries
let io;     // Socket.IO instance bound to the current server

const ioCorsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
};

// Webhook route (must be before JSON parser for raw body verification)

const webhookRoutes = require('./routes/webhook.routes');
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

const yukonRoutes = require('./routes/yukon.routes');
app.use('/api/yukon', yukonRoutes);

// Import Crazy Otto's data for demo purposes
const {
  crazyOttosRestaurant,
  crazyOttosMenuItems,
  crazyOttosMenuCategories,
} = require('./data/crazyOttosData');


// Middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Rate limiting
const { apiLimiter, authLimiter, orderLimiter, adminLimiter } = require('./middleware/rateLimiter');
app.use('/api/', apiLimiter); // Apply general rate limiting to all API routes

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
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

const pool = require('./config/database');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'running'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        server: 'running'
      },
      error: error.message
    });
  }
});

// Cleanup job monitoring endpoint
app.get('/api/admin/cleanup-stats', (req, res) => {
  const stats = cleanupJob.getStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

// API routes
const v1Routes = require('./routes/v1');

// Mount V1
app.use('/api/v1', v1Routes);

// Backward Compatibility / Default to V1
app.use('/api', v1Routes);

// Swagger Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css'
}));

// Socket.IO connection handling
const { setupOrderSocket } = require('./sockets/order.socket');

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


// Start server with dynamic port selection
const PORT = process.env.PORT || 5000;
let currentPort = parseInt(PORT);

const startServer = (port) => {
  // If previous io instance exists (from a failed attempt), close it
  if (io && typeof io.close === 'function') {
    try { io.close(); } catch (_) { }
  }

  // Create a fresh HTTP server and Socket.IO for this attempt
  server = http.createServer(app);
  io = new Server(server, { cors: ioCorsOptions });

  // Expose io to routes and jobs
  app.set('io', io);


  // Wire up socket handlers for this io instance
  setupOrderSocket(io);

  server.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

    // Start background jobs after server is ready
    logger.info('Starting background jobs...');
    cleanupJob.start();
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.info(`Port ${port} is already in use, trying ${port + 1}...`);
      const next = port + 1;
      // Try next port with a fresh server instance
      startServer(next);
    } else {
      logger.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer(currentPort);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully...');

  // Stop background jobs
  cleanupJob.stop();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
