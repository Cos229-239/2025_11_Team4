const { pool } = require('../config/database');

async function linkDevelopers() {
    try {
        console.log('--- LINKING DEVELOPERS ---');

        // 1. Get all restaurants
        const restaurantsRes = await pool.query('SELECT id, name FROM restaurants');
        const restaurants = restaurantsRes.rows;
        if (restaurants.length === 0) {
            console.log('No restaurants found to link to.');
            return;
        }
        console.log(`Found ${restaurants.length} restaurants.`);

        // 2. Get unlinked developers (OrderEasy@gmail.com, RaikodYuki@gmail.com)
        // We'll target them by email for precision
        const targetEmails = ['OrderEasy@gmail.com', 'RaikodYuki@gmail.com'];

        for (const email of targetEmails) {
            const userRes = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
            if (userRes.rowCount === 0) {
                console.log(`User ${email} not found.`);
                continue;
            }
            const user = userRes.rows[0];
            console.log(`Processing user: ${user.name} (${email})`);

            for (const restaurant of restaurants) {
                // Check if link exists
                const check = await pool.query(
                    'SELECT 1 FROM user_restaurants WHERE user_id = $1 AND restaurant_id = $2',
                    [user.id, restaurant.id]
                );

                if (check.rowCount === 0) {
                    await pool.query(
                        'INSERT INTO user_restaurants (user_id, restaurant_id) VALUES ($1, $2)',
                        [user.id, restaurant.id]
                    );
                    console.log(`  -> Linked to ${restaurant.name}`);
                } else {
                    console.log(`  -> Already linked to ${restaurant.name}`);
                }
            }
        }

        console.log('--- LINKING COMPLETE ---');
    } catch (err) {
        console.error('LINKING ERROR:', err);
    } finally {
        await pool.end();
    }
}

linkDevelopers();
