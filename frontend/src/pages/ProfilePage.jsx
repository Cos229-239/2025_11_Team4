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
  const [favorites, setFavorites] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(true); // Default true to hide unless false

  const [showAddCardModal, setShowAddCardModal] = useState(false);

  const { logout, user } = useUserAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const token = sessionStorage.getItem('ordereasy_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Load profile
        const res = await fetch(`${API_URL}/api/users/${userId}`, { headers });
        const data = await res.json();
        if (data.success) {
          setForm({ name: data.data.name || '', phone: data.data.phone || '', email: data.data.email || '' });
          setIsVerified(data.data.is_verified);
        }

        // Load orders
        const ordersRes = await fetch(`${API_URL}/api/orders/user/${userId}`, { headers });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }

        // Load favorites
        const favRes = await fetch(`${API_URL}/api/users/${userId}/favorites`, { headers });
        if (favRes.ok) {
          const favData = await favRes.json();
          if (favData.success) setFavorites(favData.data);
        }

        // Load payment methods
        const payRes = await fetch(`${API_URL}/api/users/${userId}/payment-methods`, { headers });
        if (payRes.ok) {
          const payData = await payRes.json();
          if (payData.success) setPaymentMethods(payData.data);
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
      const token = sessionStorage.getItem('ordereasy_token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

      if (!userId) {
        const res = await fetch(`${API_URL}/api/users`, { method: 'POST', headers, body: JSON.stringify(form) });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to create profile');
        sessionStorage.setItem('ordereasy_user_id', data.data.id);
        setUserId(data.data.id);
        setStatus('Profile created');
      } else {
        const res = await fetch(`${API_URL}/api/users/${userId}`, { method: 'PUT', headers, body: JSON.stringify(form) });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to update profile');
        setStatus('Profile updated');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddCard = async (cardData) => {
    try {
      const token = sessionStorage.getItem('ordereasy_token');
      const res = await fetch(`${API_URL}/api/users/${userId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cardData)
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMethods([data.data, ...paymentMethods]);
        setStatus('Payment method added');
        setShowAddCardModal(false);
      } else {
        setError(data.message || 'Failed to add card');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const addToFavorites = async (order) => {
    try {
      const token = sessionStorage.getItem('ordereasy_token');
      const res = await fetch(`${API_URL}/api/users/${userId}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ order_id: order.id, name: `Order #${order.id}` })
      });
      const data = await res.json();
      if (data.success) {
        setFavorites([data.data, ...favorites]);
        setStatus('Order added to favorites');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeFavorite = async (favId) => {
    try {
      const token = sessionStorage.getItem('ordereasy_token');
      await fetch(`${API_URL}/api/users/${userId}/favorites/${favId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFavorites(favorites.filter(f => f.id !== favId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePaymentMethod = async (methodId) => {
    try {
      const token = sessionStorage.getItem('ordereasy_token');
      const res = await fetch(`${API_URL}/api/users/${userId}/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMethods(paymentMethods.filter(pm => pm.id !== methodId));
        setStatus('Payment method removed');
      } else {
        setError(data.message || 'Failed to remove payment method');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Check roles
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

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Your Profile</h1>
            <p className="text-gray-100 font-medium text-lg drop-shadow-md">Manage your details and preferences.</p>
          </div>
          {!isVerified && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-2 rounded-xl text-sm font-bold animate-pulse">
              ⚠ Email not verified
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        {status && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex justify-between items-center">
            <span>{status}</span>
            <button onClick={() => setStatus('')} className="text-green-400 hover:text-green-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Dashboard Access Section */}
        {(canAccessAdmin || canAccessKitchen) && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {canAccessAdmin && (
              <>
                <button
                  onClick={() => navigate('/owner')}
                  className="bg-dark-card/80 backdrop-blur-md border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white p-6 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20 group"
                >
                  <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-white/20 transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
                  </div>
                  Owner Portal
                </button>
              </>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-dark-card/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  />
                </div>
                <button onClick={save} className="w-full bg-brand-lime text-dark-bg font-bold py-3 rounded-xl hover:bg-brand-lime/90 transition-all">
                  Save Changes
                </button>
              </div>
            </div>

            <div className="bg-dark-card/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Payment Methods</h3>
              {paymentMethods.length === 0 ? (
                <p className="text-gray-500 text-sm">No payment methods saved.</p>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-5 bg-gray-600 rounded"></div>
                        <span className="text-white font-mono">•••• {pm.last4}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{pm.brand}</span>
                        <button
                          onClick={() => handleDeletePaymentMethod(pm.id)}
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove card"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowAddCardModal(true)}
                className="mt-4 w-full border border-white/20 text-white font-bold py-2 rounded-xl hover:bg-white/10 transition-all text-sm"
              >
                + Add Card
              </button>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button onClick={() => navigate('/my-reservations')} className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/20 transition-all">
                My Reservations
              </button>
              <button onClick={() => { logout(); setStatus('Signed out'); navigate('/'); }} className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-3 rounded-xl font-bold hover:bg-red-500/20 transition-all">
                Logout
              </button>
            </div>
          </div>

          {/* Right Column: Orders & Favorites */}
          <div className="lg:col-span-2 space-y-8">

            {/* Favorites Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Favorite Orders</h2>
              {favorites.length === 0 ? (
                <div className="text-gray-500 bg-dark-card/60 p-6 rounded-2xl border border-white/5 text-center">
                  <p>No favorites yet. Star an order to save it here!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favorites.map(fav => (
                    <div key={fav.id} className="glass-card rounded-2xl p-4 relative group">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFavorite(fav.id); }}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <h4 className="font-bold text-brand-orange">{fav.name || `Order #${fav.order_id}`}</h4>
                      <p className="text-sm text-gray-300">{fav.restaurant_name}</p>
                      <p className="text-xs text-gray-500 mt-2">Ordered on <DateTimeDisplay date={fav.created_at} /></p>
                      <button className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2 rounded-lg transition-colors">
                        Reorder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order History Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Order History</h2>
              {orders.length === 0 ? (
                <div className="text-gray-400 bg-dark-card/60 backdrop-blur-sm p-8 rounded-2xl border border-white/5 text-center">
                  <p>No orders found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="glass-card rounded-2xl p-5 flex justify-between items-center cursor-pointer group hover:border-brand-orange/50 transition-all"
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
                        <button
                          onClick={(e) => { e.stopPropagation(); addToFavorites(order); }}
                          className="text-gray-600 hover:text-yellow-400 transition-colors"
                          title="Add to Favorites"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}

        {/* Add Card Modal */}
        {showAddCardModal && (
          <AddCardModal onClose={() => setShowAddCardModal(false)} onAdd={handleAddCard} />
        )}

      </div>
    </div>
  );
};

const AddCardModal = ({ onClose, onAdd }) => {
  const [cardData, setCardData] = useState({
    number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
    name: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cardData.number || !cardData.exp_month || !cardData.exp_year || !cardData.cvc || !cardData.name) {
      setError('All fields are required');
      return;
    }
    // Basic validation
    if (cardData.number.length < 13) {
      setError('Invalid card number');
      return;
    }
    onAdd(cardData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-card w-full max-w-md rounded-3xl overflow-hidden border border-dark-surface shadow-2xl animate-scaleIn">
        <div className="p-6 border-b border-dark-surface flex justify-between items-center bg-brand-orange">
          <h3 className="text-xl font-bold text-white">Add Payment Method</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-1">Cardholder Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={cardData.name}
              onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-1">Card Number</label>
            <input
              type="text"
              placeholder="0000 0000 0000 0000"
              maxLength="19"
              value={cardData.number}
              onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '') })}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Exp Month</label>
              <input
                type="text"
                placeholder="MM"
                maxLength="2"
                value={cardData.exp_month}
                onChange={(e) => setCardData({ ...cardData, exp_month: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Exp Year</label>
              <input
                type="text"
                placeholder="YY"
                maxLength="2"
                value={cardData.exp_year}
                onChange={(e) => setCardData({ ...cardData, exp_year: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">CVC</label>
              <input
                type="text"
                placeholder="123"
                maxLength="4"
                value={cardData.cvc}
                onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-center"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-orange text-white font-bold py-3 rounded-xl hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/20 mt-4">
            Add Card
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
