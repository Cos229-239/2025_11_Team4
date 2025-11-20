// Built-in fetch is used

const API_URL = 'http://localhost:5000';

async function testDeleteTable() {
    try {
        console.log('Testing Table Deletion...\n');

        // 1. Get a restaurant ID first
        console.log('Fetching restaurants...');
        const restResponse = await fetch(`${API_URL}/api/restaurants`);
        const restData = await restResponse.json();

        if (!restData.success || restData.data.length === 0) {
            console.error('No restaurants found. Cannot create table.');
            return;
        }

        const restaurantId = restData.data[0].id;
        console.log(`Using Restaurant ID: ${restaurantId}`);

        // 2. Create a table
        const tableNumber = 9999; // Use a high number to avoid conflicts
        console.log(`Creating table ${tableNumber}...`);

        const createResponse = await fetch(`${API_URL}/api/tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurant_id: restaurantId,
                table_number: tableNumber,
                capacity: 4,
                status: 'available'
            })
        });

        const createData = await createResponse.json();

        if (!createData.success) {
            console.error('Failed to create table:', createData.error);
            // Try to find it if it already exists
            if (createData.error.includes('already exists')) {
                console.log('Table already exists, trying to find it...');
                const tablesResponse = await fetch(`${API_URL}/api/tables`);
                const tablesData = await tablesResponse.json();
                const existingTable = tablesData.data.find(t => t.table_number === tableNumber && t.restaurant_id === restaurantId);
                if (existingTable) {
                    console.log(`Found existing table ID: ${existingTable.id}`);
                    await deleteTable(existingTable.id);
                }
            }
            return;
        }

        const tableId = createData.data.id;
        console.log(`Table created with ID: ${tableId}`);

        // 3. Delete the table
        await deleteTable(tableId);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function deleteTable(tableId) {
    console.log(`Deleting table ID: ${tableId}...`);

    const deleteResponse = await fetch(`${API_URL}/api/tables/${tableId}`, {
        method: 'DELETE'
    });

    const deleteData = await deleteResponse.json();

    if (deleteData.success) {
        console.log('✓ Table deleted successfully');
    } else {
        console.error('✗ Failed to delete table:', deleteData.error);
    }
}

testDeleteTable();
