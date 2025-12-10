import { useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus(data.message);
            } else {
                setError(data.message || 'Something went wrong');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(circle at center, #E35504aa 0%, #000000 70%)`,
                filter: "blur(60px)",
                opacity: 0.4,
            }}></div>

            <div className="relative z-10 w-full max-w-md p-8 bg-dark-card/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Reset Password</h2>

                {status ? (
                    <div className="text-center">
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6">
                            {status}
                        </div>
                        <Link to="/login" className="text-brand-orange hover:text-white font-bold transition-colors">
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>}

                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white placeholder-white/30 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/50 transition-all"
                                placeholder="Enter your email"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-orange text-white font-bold py-4 rounded-xl hover:bg-brand-orange/80 transition-all transform hover:-translate-y-1 shadow-lg shadow-brand-orange/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="text-center">
                            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
