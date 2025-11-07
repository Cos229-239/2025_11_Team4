/**
 * Centralized error handling middleware
 * Logs errors and returns a consistent JSON structure
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Basic request context for logs
  const context = {
    method: req.method,
    path: req.originalUrl || req.path,
    query: req.query,
    body: req.body,
  };

  // Log with timestamp
  console.error(`[${new Date().toISOString()}] Error ${statusCode}: ${message}`);
  console.error('Context:', JSON.stringify(context));
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error('Stack:', err.stack);
  }

  const payload = {
    success: false,
    error: message,
  };

  // Include stack only in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = { errorHandler };

