import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setStatus('');
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus('Password reset successfully! Redirecting to login...');
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    if (!token || !email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Invalid Link</h2>
                    <p className="text-gray-400 mb-6">This password reset link is invalid or missing parameters.</p>
                    <Link to="/login" className="text-brand-orange hover:underline">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(circle at center, #B5FF00aa 0%, #000000 70%)`,
                filter: "blur(60px)",
                opacity: 0.3,
            }}></div>

            <div className="relative z-10 w-full max-w-md p-8 bg-dark-card/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Set New Password</h2>

                {status && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl mb-4 text-center">{status}</div>}
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white placeholder-white/30 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/50 transition-all"
                            placeholder="Enter new password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Confirm Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white placeholder-white/30 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/50 transition-all"
                            placeholder="Confirm new password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-lime text-dark-bg font-bold py-4 rounded-xl hover:bg-brand-lime/80 transition-all transform hover:-translate-y-1 shadow-lg shadow-brand-lime/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
