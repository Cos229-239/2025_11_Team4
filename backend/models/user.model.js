const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const ALLOWED_USER_UPDATE_FIELDS = new Set([
    'name',
    'email',
    'phone',
    'on_duty',
]);

class UserModel {
    static async create({ name, email, phone, password, role = 'customer' }) {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, email, phone, role, is_verified, created_at`,
            [name, email, phone, passwordHash, role]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async update(id, updates) {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (!ALLOWED_USER_UPDATE_FIELDS.has(key)) continue;
            if (value !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await pool.query(
            `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async setVerificationToken(id, token) {
        await pool.query(
            'UPDATE users SET verification_token = $1 WHERE id = $2',
            [token, id]
        );
    }

    static async verifyUser(id) {
        await pool.query(
            'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1',
            [id]
        );
    }

    static async setResetToken(email, token, expires) {
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
            [token, expires, email]
        );
    }

    static async clearResetToken(id) {
        await pool.query(
            'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1',
            [id]
        );
    }

    static async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, id]
        );
    }

    static async findAllEmployees() {
        const result = await pool.query(
            "SELECT id, name, email, phone, role, on_duty FROM users WHERE role != 'customer' ORDER BY name ASC"
        );
        return result.rows;
    }
}

module.exports = UserModel;
