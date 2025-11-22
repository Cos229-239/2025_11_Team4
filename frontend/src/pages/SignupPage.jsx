import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SignupPage = () => {
  const navigate = useNavigate();
  const { setToken, setUser } = useUserAuth();
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
      setToken(data.token);
      setUser(data.user);
      navigate('/profile');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-white/5 backdrop-blur-lg flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-dark-card border border-dark-surface rounded-2xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Create Account</h1>
        {error && <div className="text-red-400 mb-3">{error}</div>}
        <label className="block text-sm text-text-secondary mb-1">Name</label>
        <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary mb-3" />
        <label className="block text-sm text-text-secondary mb-1">Email</label>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary mb-3" />
        <label className="block text-sm text-text-secondary mb-1">Phone</label>
        <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary mb-3" />
        <label className="block text-sm text-text-secondary mb-1">Password</label>
        <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary mb-4" />
        <button className="w-full bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90">Sign Up</button>
        <div className="text-text-secondary text-sm mt-4">Already have an account? <a className="text-brand-orange" href="/login">Sign in</a></div>
      </form>
    </div>
  );
};

export default SignupPage;

