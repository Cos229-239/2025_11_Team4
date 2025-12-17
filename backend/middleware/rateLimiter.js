const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // In dev/local, do not rate limit at all
    if (process.env.NODE_ENV !== 'production') return true;

    // Long-term strategy: never throttle cheap, high-frequency reads
    // such as kitchen dashboards or customer status checks.
    const rawPath = req.path || '';
    // When mounted at /api, v1 routes look like /v1/...; normalize to match legacy checks.
    const path = rawPath.startsWith('/v1') ? rawPath.slice(3) || '/' : rawPath;

    // Allow order status reads / QR checks
    if (
      req.method === 'GET' &&
      (path.startsWith('/orders/by-number') || path.startsWith('/orders/'))
    ) {
      return true;
    }

    // Allow kitchen to move orders around freely
    if (
      req.method === 'PATCH' &&
      path.startsWith('/orders/') &&
      path.endsWith('/status')
    ) {
      return true;
    }

    // Allow reservation lookups (customer & admin views)
    if (req.method === 'GET' && path.startsWith('/reservations')) {
      return true;
    }

    // Everything else is subject to the general limit
    return false;
  }
});

// Strict rate limiter for authentication endpoints
// Also disabled outside production to make local testing easier.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  skip: () => process.env.NODE_ENV !== 'production'
});

// Order creation rate limiter
// Applied at `/api/orders` but only enforced for POST requests so that
// kitchen status updates and lookups are not rate limited.
const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 order-creation requests per window
  message: {
    success: false,
    error: 'Too many orders created, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST'
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  orderLimiter,
  adminLimiter
};
