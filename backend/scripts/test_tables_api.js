const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000';

async function testTablesAPI() {
    try {
        console.log('Testing /api/tables endpoint...\n');

        const response = await fetch(`${API_URL}/api/tables`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            console.log(`✓ Found ${data.data.length} tables\n`);

            // Check first table
            const firstTable = data.data[0];
            console.log('First table structure:');
            console.log(JSON.stringify(firstTable, null, 2));

            // Verify restaurant_id exists
            if (firstTable.restaurant_id !== undefined) {
                console.log('\n✓ restaurant_id field is present!');
            } else {
                console.log('\n✗ ERROR: restaurant_id field is missing!');
            }

            // Group by restaurant
            const byRestaurant = {};
            data.data.forEach(table => {
                if (!byRestaurant[table.restaurant_id]) {
                    byRestaurant[table.restaurant_id] = [];
                }
                byRestaurant[table.restaurant_id].push(table);
            });

            console.log('\nTables grouped by restaurant:');
            Object.keys(byRestaurant).forEach(restaurantId => {
                console.log(`  Restaurant ${restaurantId}: ${byRestaurant[restaurantId].length} tables`);
            });
        } else {
            console.log('No tables found');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTablesAPI();
