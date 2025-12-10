require('dotenv').config();
const { pool } = require('./config/database');

async function test() {
    try {
        console.log('Querying all restaurants...');
        const res = await pool.query('SELECT * FROM restaurants WHERE id = 3');
        console.log('Restaurants found:', res.rows.length);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

test();
