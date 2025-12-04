import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../hooks/useUserAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useUserAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Signup failed');
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
          <h1 className="text-4xl font-bold text-white mb-2 font-display">Create Account</h1>
          <p className="text-white/60">Join OrderEasy today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="glass-input w-full rounded-xl p-4 outline-none transition-all"
              placeholder="John Doe"
            />
          </div>

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
            <label className="block text-sm font-medium text-white/80 mb-2 ml-1">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="glass-input w-full rounded-xl p-4 outline-none transition-all"
              placeholder="(555) 123-4567"
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
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-brand-lime to-brand-lime/80 text-black p-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-brand-lime/20 hover:scale-[1.02] transition-all duration-300 mt-4"
          >
            Sign Up
          </button>
        </div>

        <div className="text-center mt-8 text-white/60 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-brand-orange hover:text-brand-orange/80 font-semibold transition-colors">
            Sign in
          </a>
        </div>
      </form>
    </div>
  );
};

export default SignupPage;

