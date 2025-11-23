import { useEffect, useState } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfilePage = () => {
  const [userId, setUserId] = useState(() => sessionStorage.getItem('ordereasy_user_id'));
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  // Assume user context now contains the user object with roles
  const { logout, user } = useUserAuth();
  const navigate = useNavigate();

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

  // Check roles from the user object (ensure backend sends 'role')
  const isDeveloper = user?.role === 'developer';
  const isOwner = user?.role === 'owner';
  const isEmployee = user?.role === 'employee';
  
  const canAccessAdmin = isDeveloper || isOwner;
  const canAccessKitchen = isDeveloper || isOwner || isEmployee;

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-3xl font-bold text-text-primary mb-4">Your Profile</h1>
        <p className="text-text-secondary mb-6">Manage your details and access your dashboards.</p>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
        {status && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">{status}</div>}

        {/* Dashboard Access Section */}
        {(canAccessAdmin || canAccessKitchen) && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {canAccessAdmin && (
              <button 
                onClick={() => navigate('/admin')}
                className="bg-dark-card border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Admin Dashboard
              </button>
            )}
            {canAccessKitchen && (
              <button 
                onClick={() => navigate('/kitchen')}
                className="bg-dark-card border-2 border-brand-lime text-brand-lime hover:bg-brand-lime hover:text-dark-bg p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Kitchen View
              </button>
            )}
          </div>
        )}

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
          <div className="flex gap-3 pt-4">
            <button onClick={save} className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90">Save Changes</button>
            
            <a href="/my-reservations" className="bg-dark-surface border border-dark-surface text-text-primary px-6 py-3 rounded-full font-bold hover:bg-dark-surface/70">My Reservations</a>
            
            <button onClick={() => { logout(); setStatus('Signed out'); navigate('/'); }} className="bg-dark-surface border border-dark-surface text-red-400 px-6 py-3 rounded-full font-bold hover:bg-red-900/20">Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
