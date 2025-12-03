import { useEffect, useState } from 'react';
import { useUserAuth } from '../hooks/useUserAuth';
import { useNavigate } from 'react-router-dom';
import OrderDetailsModal from '../components/OrderDetailsModal';
import DateTimeDisplay from '../components/DateTimeDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfilePage = () => {
  const [userId, setUserId] = useState(() => sessionStorage.getItem('ordereasy_user_id'));
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  // Assume user context now contains the user object with roles
  const { logout, user } = useUserAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        // Load profile
        const res = await fetch(`${API_URL}/api/users/${userId}`);
        const data = await res.json();
        if (data.success) setForm({ name: data.data.name || '', phone: data.data.phone || '', email: data.data.email || '' });

        // Load orders - using the new endpoint
        const token = sessionStorage.getItem('ordereasy_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const ordersRes = await fetch(`${API_URL}/api/orders/user/${userId}`, { headers });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }
      } catch (e) {
        console.error("Error loading profile data:", e);
      }
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
    <div className="min-h-screen relative overflow-hidden bg-[#000000] pt-24">
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

      <div className="container mx-auto px-4 py-8 max-w-xl relative z-10">
        <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Your Profile</h1>
        <p className="text-gray-100 font-medium text-lg mb-6 drop-shadow-md">Manage your details and access your dashboards.</p>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
        {status && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">{status}</div>}

        {/* Dashboard Access Section */}
        {(canAccessAdmin || canAccessKitchen) && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {canAccessAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-dark-card/80 backdrop-blur-md border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white p-6 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-orange/20 group"
              >
                <div className="p-2 bg-brand-orange/20 rounded-lg group-hover:bg-white/20 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                Admin Dashboard
              </button>
            )}
            {canAccessKitchen && (
              <button
                onClick={() => navigate('/kitchen')}
                className="bg-dark-card/80 backdrop-blur-md border-2 border-brand-lime text-brand-lime hover:bg-brand-lime hover:text-dark-bg p-6 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-lime/20 group"
              >
                <div className="p-2 bg-brand-lime/20 rounded-lg group-hover:bg-dark-bg/20 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                Kitchen View
              </button>
            )}
          </div>
        )}

        <div className="space-y-4 bg-dark-card/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl mb-8 shadow-2xl">
          <div>
            <label className="block text-sm font-bold text-white mb-2 drop-shadow-sm">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white font-medium placeholder-white/50 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/50 transition-all shadow-inner"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2 drop-shadow-sm">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white font-medium placeholder-white/50 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/50 transition-all shadow-inner"
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2 drop-shadow-sm">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white font-medium placeholder-white/50 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/50 transition-all shadow-inner"
              placeholder="Enter your email"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <button onClick={save} className="bg-brand-lime/10 border border-brand-lime/50 text-brand-lime px-8 py-3 rounded-xl font-bold text-lg hover:bg-brand-lime hover:text-dark-bg backdrop-blur-md transition-all transform hover:-translate-y-1 shadow-lg shadow-brand-lime/10">Save Changes</button>

            <a href="/my-reservations" className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 hover:border-white/30 backdrop-blur-md transition-all shadow-lg">My Reservations</a>

            <button onClick={() => { logout(); setStatus('Signed out'); navigate('/'); }} className="bg-red-500/5 border border-red-500/20 text-red-400 px-6 py-3 rounded-xl font-bold hover:bg-red-500/20 hover:border-red-500/40 backdrop-blur-md transition-all shadow-lg">Logout</button>
          </div>
        </div>

        {/* Order History Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white drop-shadow-md">Order History</h2>
          {orders.length === 0 ? (
            <div className="text-gray-400 bg-dark-card/60 backdrop-blur-sm p-8 rounded-2xl border border-white/5 text-center">
              <p>No orders found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="glass-card rounded-2xl p-5 flex justify-between items-center cursor-pointer group"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl border border-white/5">
                      {order.order_type === 'takeout' ? '🛍️' : order.order_type === 'pre-order' ? '📅' : '🍽️'}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-brand-orange transition-colors">
                        {order.restaurant_name || 'Restaurant Order'}
                      </p>
                      <p className="text-sm text-gray-400">
                        <DateTimeDisplay date={order.created_at} /> • {order.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-brand-lime text-lg">${parseFloat(order.total_amount).toFixed(2)}</p>
                      <span className="text-xs text-gray-500 bg-black/20 px-2 py-1 rounded-lg">
                        #{String(order.id).slice(0, 8)}
                      </span>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}

      </div>
    </div>
  );
};

export default ProfilePage;
