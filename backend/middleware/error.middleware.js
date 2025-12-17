/**
 * Centralized error handling middleware
 * Logs errors and returns a consistent JSON structure
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'authorization',
  'jwt',
  'jwt_secret',
  'db_password',
  'smtp_pass',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'supabase_service_role_key',
]);

function redact(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);

  const out = {};
  for (const [key, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = redact(v);
    }
  }
  return out;
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Basic request context for logs
  const context = {
    method: req.method,
    path: req.originalUrl || req.path,
    query: req.query,
    body: redact(req.body),
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

