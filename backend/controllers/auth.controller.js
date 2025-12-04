const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

exports.signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already exists' });
        }

        const user = await UserModel.create({ name, email, phone, password });

        // Generate verification token (mock email sending)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await UserModel.setVerificationToken(user.id, verificationToken);

        console.log(`[MOCK EMAIL] Verification link: http://localhost:5173/verify-email?token=${verificationToken}&id=${user.id}`);

        const token = signToken(user);
        res.status(201).json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to sign up', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await UserModel.findByEmail(email);
        if (!user || !user.password_hash) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = signToken(user);
        const { password_hash, verification_token, reset_token, ...safeUser } = user;

        res.json({ success: true, token, user: safeUser });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to login', error: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { id, token } = req.body;
        const user = await UserModel.findById(id);

        if (!user || user.verification_token !== token) {
            return res.status(400).json({ success: false, message: 'Invalid verification token' });
        }

        await UserModel.verifyUser(id);
        res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findByEmail(email);

        if (!user) {
            // Don't reveal user existence
            return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await UserModel.setResetToken(email, resetToken, expires);

        console.log(`[MOCK EMAIL] Reset link: http://localhost:5173/reset-password?token=${resetToken}&email=${email}`);

        res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to process request', error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const user = await UserModel.findByEmail(email);

        if (!user || user.reset_token !== token || new Date() > new Date(user.reset_token_expires)) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        await UserModel.updatePassword(user.id, newPassword);
        await UserModel.clearResetToken(user.id);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
    }
};
