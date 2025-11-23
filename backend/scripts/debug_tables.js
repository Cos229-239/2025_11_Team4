const { pool } = require('../config/database');

async function debugTables() {
    try {
        console.log('=== Checking all tables ===\n');

        const result = await pool.query(`
            SELECT id, restaurant_id, table_number, capacity, status, 
                   created_at, updated_at 
            FROM tables 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        console.log('Recent tables:');
        result.rows.forEach((table, index) => {
            console.log(`\n${index + 1}. Table #${table.table_number}`);
            console.log(`   ID: ${table.id}`);
            console.log(`   Restaurant ID: ${table.restaurant_id}`);
            console.log(`   Capacity: ${table.capacity}`);
            console.log(`   Status: ${table.status}`);
            console.log(`   Created: ${table.created_at}`);
        });

        const countResult = await pool.query('SELECT COUNT(*) FROM tables');
        console.log(`\n\nTotal tables in database: ${countResult.rows[0].count}`);

        // Count by restaurant
        const byRestaurant = await pool.query(`
            SELECT restaurant_id, COUNT(*) as count 
            FROM tables 
            GROUP BY restaurant_id
        `);
        console.log('\nTables by restaurant:');
        byRestaurant.rows.forEach(row => {
            console.log(`   Restaurant ${row.restaurant_id}: ${row.count} tables`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

debugTables();
