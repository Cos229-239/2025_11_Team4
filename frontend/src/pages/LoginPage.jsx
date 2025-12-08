import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../hooks/useUserAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useUserAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Login failed');
      login(data.token, data.user);
      navigate('/profile');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] flex items-center justify-center p-6">
      {/* BACKGROUND GRADIENT */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center,
              #E35504ff 0%,
              #E35504aa 15%,
              #000000 35%,
              #5F2F14aa 55%,
              #B5FF00ff 80%,
              #000000 100%
            )
          `,
          filter: "blur(40px)",
          backgroundSize: "180% 180%",
          opacity: 0.55,
        }}
      ></div>

      <form onSubmit={submit} className="glass-card rounded-2xl p-8 w-full max-w-md relative z-10 border border-white/10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 font-display">Welcome Back</h1>
          <p className="text-white/60">Sign in to continue your order</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="glass-input w-full rounded-xl p-4 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="glass-input w-full rounded-xl p-4 outline-none transition-all"
              placeholder="••••••••"
            />
            <div className="text-right mt-2">
              <a href="/forgot-password" className="text-sm text-brand-orange hover:text-brand-orange/80 transition-colors">
                Forgot Password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-brand-orange/20 hover:scale-[1.02] transition-all duration-300 mt-4"
          >
            Sign In
          </button>
        </div>

        <div className="text-center mt-8 text-white/60 text-sm">
          Don't have an account?{' '}
          <a href="/signup" className="text-brand-lime hover:text-brand-lime/80 font-semibold transition-colors">
            Create one now
          </a>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;

