import { useEffect, useState } from 'react';
import { useUserAuth } from '../context/UserAuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfilePage = () => {
  const [userId, setUserId] = useState(() => sessionStorage.getItem('ordereasy_user_id'));
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const { logout } = useUserAuth ? useUserAuth() : { logout: () => {} };

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${API_URL}/api/users/${userId}`);
        const data = await res.json();
        if (data.success) setForm({ name: data.data.name || '', phone: data.data.phone || '', email: data.data.email || '' });
      } catch {}
    };
    load();
  }, [userId]);

  const save = async () => {
    try {
      setStatus(''); setError('');
      if (!userId) {
        const res = await fetch(`${API_URL}/api/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to create profile');
        sessionStorage.setItem('ordereasy_user_id', data.data.id);
        setUserId(data.data.id);
        setStatus('Profile created');
      } else {
        const res = await fetch(`${API_URL}/api/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to update profile');
        setStatus('Profile updated');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-3xl font-bold text-text-primary mb-4">Your Profile</h1>
        <p className="text-text-secondary mb-6">Save your details for faster reservations and orders.</p>

        {error && <div className="mb-4 text-red-400">{error}</div>}
        {status && <div className="mb-4 text-brand-lime">{status}</div>}

        <div className="space-y-4 bg-dark-card border border-dark-surface p-6 rounded-2xl">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90">Save</button>
            {userId && (
              <button onClick={() => { sessionStorage.removeItem('ordereasy_user_id'); setUserId(null); setForm({ name: '', phone: '', email: '' }); setStatus(''); }} className="bg-dark-surface border border-dark-surface text-text-secondary px-6 py-3 rounded-full font-bold hover:bg-dark-surface/70">Clear</button>
            )}
            <a href="/my-reservations" className="bg-brand-orange text-white px-6 py-3 rounded-full font-bold hover:bg-brand-orange/90">My Reservations</a>
            <button onClick={() => { logout(); setStatus('Signed out'); }} className="bg-dark-surface border border-dark-surface text-text-secondary px-6 py-3 rounded-full font-bold hover:bg-dark-surface/70">Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
