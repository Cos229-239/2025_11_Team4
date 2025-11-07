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

async function checkSchema() {
  try {
    // Check menu_items table schema
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'menu_items'
      ORDER BY ordinal_position
    `);

    console.log('\n=== MENU_ITEMS TABLE SCHEMA ===');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(25)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if there's a categories table
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n=== ALL TABLES ===');
    tablesResult.rows.forEach(row => {
      console.log(`  ${row.table_name}`);
    });

    // Sample some data
    const dataResult = await pool.query('SELECT * FROM menu_items LIMIT 2');
    console.log('\n=== SAMPLE DATA ===');
    console.log(JSON.stringify(dataResult.rows, null, 2));

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
