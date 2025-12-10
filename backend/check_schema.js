require('dotenv').config();
const { pool } = require('./config/database');

async function checkSchema() {
    try {
        console.log('Checking tables schema...');
        const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tables';
    `;
        const res = await pool.query(query);
        console.log('Columns in tables:', res.rows.map(r => r.column_name));

        const hasMinCapacity = res.rows.some(r => r.column_name === 'min_capacity');
        console.log('Has min_capacity:', hasMinCapacity);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkSchema();
