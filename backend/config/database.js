const pg = require('pg');
const { Pool } = pg;
require('dotenv').config();

// Determine if SSL should be enabled (e.g., Supabase/remote DB)
const wantsSSL = (() => {
  const dbSsl = String(process.env.DB_SSL || '').toLowerCase();
  if (dbSsl === 'true' || dbSsl === '1' || dbSsl === 'require') return true;
  const url = process.env.DATABASE_URL || '';
  // Enable SSL when using a remote URL (not localhost)
  return url !== '' && !/localhost|127\.0\.0\.1/i.test(url);
})();

// As a last resort for dev environments with self-signed chains, disable TLS verification globally
if (wantsSSL && (process.env.NODE_ENV !== 'production')) {
  // This affects all TLS connections (HTTP and PG). Use only in dev.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
}

// PostgreSQL connection pool
// Support both DATABASE_URL (Railway, Heroku, Supabase, etc.) and individual connection params
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: wantsSSL ? { require: true, rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ordereasy',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: wantsSSL ? { require: true, rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

// Also set pg global defaults to ensure any ad-hoc Pool/Client honors SSL in this env
if (wantsSSL) {
  pg.defaults.ssl = { rejectUnauthorized: false };
}

// Optional debug of DB config (without secrets)
try {
  const usingUrl = !!process.env.DATABASE_URL;
  let host = process.env.DB_HOST || 'localhost';
  if (usingUrl) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      host = u.hostname;
    } catch (_) {
      // ignore parse errors
    }
  }
  const sslState = poolConfig.ssl ? (poolConfig.ssl.rejectUnauthorized === false ? 'enabled-no-verify' : 'enabled') : 'disabled';
  console.log(`DB init: usingUrl=${usingUrl} host=${host} ssl=${sslState}`);
} catch (_) {}

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Transaction helper
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout to release client if not released manually
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return { query, release };
};

module.exports = {
  pool,
  query,
  getClient
};
