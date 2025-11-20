const { pool } = require('../config/database');

async function checkTables() {
    try {
        const result = await pool.query('SELECT * FROM tables ORDER BY id DESC LIMIT 10');
        console.log('Recent tables:');
        console.table(result.rows);

        const countResult = await pool.query('SELECT COUNT(*) FROM tables');
        console.log(`\nTotal tables: ${countResult.rows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTables();
