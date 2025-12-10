const { pool } = require('../config/database');

/**
 * Executes a callback within a database transaction.
 * Handles BEGIN, COMMIT, ROLLBACK, and release.
 * @param {function(object): Promise<any>} callback - Function that receives the db client and returns a promise
 * @returns {Promise<any>} - The result of the callback
 */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { withTransaction };
