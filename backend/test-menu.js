const pg = require('pg');
const { Pool } = pg;
require('dotenv').config();

const wantsSSL = (() => {
  const dbSsl = String(process.env.DB_SSL || '').toLowerCase();
  if (dbSsl === 'true' || dbSsl === '1' || dbSsl === 'require') return true;
  const url = process.env.DATABASE_URL || '';
  return url !== '' && !/localhost|127\.0\.0\.1/i.test(url);
})();

if (wantsSSL && (process.env.NODE_ENV !== 'production')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';
}
if (wantsSSL) {
  pg.defaults.ssl = { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: wantsSSL ? { require: true, rejectUnauthorized: false } : undefined,
});

async function testMenu() {
  try {
    const result = await pool.query(`
      SELECT m.name, m.price, c.name as category
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      ORDER BY c.sort_order, m.name;
    `);
    
    console.log('🍽️  Menu Items:\n');
    result.rows.forEach(item => {
      console.log(`  ${item.category}: ${item.name} - $${item.price}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMenu();
