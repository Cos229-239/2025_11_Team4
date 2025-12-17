const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function diagnose() {
    let output = '--- DIAGNOSTIC PER RESTAURANT ---\n';
    try {
        const restaurants = await pool.query('SELECT id, name FROM restaurants ORDER BY id');

        for (const r of restaurants.rows) {
            const orders = await pool.query('SELECT count(*) FROM orders WHERE restaurant_id = $1', [r.id]);
            const res = await pool.query('SELECT count(*) FROM reservations WHERE restaurant_id = $1', [r.id]);
            output += `Restaurant [${r.id}] ${r.name}:\n`;
            output += `  Orders: ${orders.rows[0].count}\n`;
            output += `  Reservations: ${res.rows[0].count}\n`;
        }

        output += '--- END DETAIL ---\n';

        fs.writeFileSync(path.join(__dirname, 'diagnostic_counts.txt'), output);
        console.log('Diagnostic counts written to diagnostic_counts.txt');
    } catch (err) {
        console.error('DIAGNOSTIC ERROR:', err);
        fs.writeFileSync(path.join(__dirname, 'diagnostic_counts.txt'), `ERROR: ${err.message}`);
    } finally {
        await pool.end();
    }
}

diagnose();
