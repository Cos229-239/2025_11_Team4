import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { useCart } from '../context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ReservationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPreOrderContext } = useCart();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [userId] = useState(() => sessionStorage.getItem('ordereasy_user_id'));
  const [toast, setToast] = useState('');
  const { token } = useUserAuth ? useUserAuth() : { token: null };

  const checkAvailability = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ date, time, partySize: String(partySize) });
      const res = await fetch(`${API_URL}/api/restaurants/${id}/availability?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to check availability');
      setTables(data.data.tables || []);
      setSelectedTable(null);
    } catch (e) {
      setError(e.message || 'Failed to check availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from user profile if present
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!userId) return;
        const res = await fetch(`${API_URL}/api/users/${userId}`);
        const data = await res.json();
        if (data.success) {
          setName(data.data.name || '');
          setPhone(data.data.phone || '');
          setEmail(data.data.email || '');
        }
      } catch { }
    };
    loadUser();
  }, [userId]);

  const createReservation = async () => {
    try {
      setLoading(true);
      setError('');
      const body = {
        restaurant_id: Number(id),
        table_id: selectedTable || null,
        customer_name: name || 'Guest',
        customer_phone: phone || null,
        customer_email: email || null,
        party_size: partySize,
        reservation_date: date,
        reservation_time: time,
        special_requests: notes
      };
      const res = await fetch(`${API_URL}/api/reservations/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.status === 401) {
        setError('Please sign in to complete your reservation');
        navigate('/login');
        return;
      }
      if (!data.success) throw new Error(data.message || 'Failed to create reservation intent');
      // Backend creates a short-lived *reservation intent* (no DB row yet).
      // Immediately push user into pre-order flow so there is no "reservation only" path.
      const intentToken = data.data.intentToken;
      const scheduledFor = `${date}T${time}`;

      setToast('Reservation hold created - now choose your dishes and pay to confirm.');
      setTimeout(() => setToast(''), 2500);

      setPreOrderContext({
        reservation_intent: intentToken,
        scheduled_for: scheduledFor,
        restaurant_id: Number(id)
      });

      navigate(`/restaurant/${id}/menu`, {
        state: {
          orderType: 'reservation',
          reservationId: null,
          restaurantId: Number(id),
          preOrderContext: {
            reservation_intent: intentToken,
            scheduled_for: scheduledFor
          }
        }
      });
    } catch (e) {
      setError(e.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary pb-12">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-brand-lime/90 text-dark-bg px-6 py-3 rounded-full z-50 shadow-lg font-bold backdrop-blur-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-dark-card border-b border-dark-surface sticky top-0 z-20 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-dark-surface transition text-text-secondary hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="font-['Playfair_Display'] font-bold text-xl">Make a Reservation</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Date, Time, Party */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-dark-card rounded-2xl border border-dark-surface p-6 shadow-lg">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-brand-orange">📅</span> Date & Time
              </h2>

              {!token && (
                <div className="mb-4 p-3 bg-brand-orange/10 border border-brand-orange/20 rounded-xl text-sm text-brand-orange">
                  Tip: <a href="/login" className="font-bold underline">Sign in</a> to auto-fill your details.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2 font-medium">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary focus:ring-2 focus:ring-brand-orange outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2 font-medium">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary focus:ring-2 focus:ring-brand-orange outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2 font-medium">Party Size</label>
                  <div className="flex items-center gap-4 bg-dark-surface rounded-xl p-2 border border-dark-surface">
                    <button
                      onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-dark-card hover:bg-dark-card/80 text-xl font-bold transition"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xl">{partySize}</span>
                    <button
                      onClick={() => setPartySize(partySize + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-dark-card hover:bg-dark-card/80 text-xl font-bold transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={checkAvailability}
                  className="w-full bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition shadow-lg hover:shadow-brand-orange/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Checking...' : 'Update Availability'}
                </button>
              </div>

              {/* Quick Times */}
              <div className="mt-6 pt-6 border-t border-dark-surface">
                <p className="text-xs text-text-secondary mb-3 font-bold uppercase tracking-wider">Quick Times</p>
                <div className="grid grid-cols-3 gap-2">
                  {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTime(t); checkAvailability(); }}
                      className={`py-2 rounded-lg text-sm font-medium transition border ${time === t
                          ? 'bg-brand-lime text-brand-black border-brand-lime shadow-lg shadow-brand-lime/20'
                          : 'bg-dark-surface text-text-secondary border-dark-surface hover:bg-dark-surface/80 hover:text-white'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tables & Info */}
          <div className="lg:col-span-8 space-y-6">

            {/* Table Selection */}
            <div className="bg-dark-card rounded-2xl border border-dark-surface p-6 shadow-lg">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-brand-lime">🪑</span> Select a Table
              </h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {tables.length === 0 ? (
                <div className="text-center py-12 bg-dark-surface/30 rounded-xl border border-dashed border-dark-surface">
                  <p className="text-4xl mb-2">🚫</p>
                  <p className="text-text-secondary">No tables available for this time.</p>
                  <p className="text-sm text-text-secondary mt-1">Try selecting a different time or date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(t.id)}
                      className={`relative p-4 rounded-xl border text-left transition-all group ${selectedTable === t.id
                          ? 'border-brand-lime bg-brand-lime/10 ring-2 ring-brand-lime ring-offset-2 ring-offset-dark-card'
                          : 'border-dark-surface bg-dark-surface hover:bg-dark-surface/80 hover:border-brand-orange/50'
                        }`}
                    >
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${selectedTable === t.id ? 'bg-brand-lime' : 'bg-dark-card'}`}></div>
                      <div className="text-2xl mb-2">🪑</div>
                      <div className={`font-bold ${selectedTable === t.id ? 'text-brand-lime' : 'text-text-primary'}`}>Table #{t.table_number}</div>
                      <div className="text-xs text-text-secondary mt-1">Capacity: {t.capacity}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guest Info */}
            <div className={`bg-dark-card rounded-2xl border border-dark-surface p-6 shadow-lg transition-all duration-500 ${selectedTable ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none grayscale'}`}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-white">📝</span> Your Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1 uppercase font-bold tracking-wider">Name</label>
                  <input
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary focus:ring-2 focus:ring-brand-orange outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1 uppercase font-bold tracking-wider">Phone</label>
                  <input
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary focus:ring-2 focus:ring-brand-orange outline-none transition"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-text-secondary mb-1 uppercase font-bold tracking-wider">Email</label>
                <input
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary focus:ring-2 focus:ring-brand-orange outline-none transition"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs text-text-secondary mb-1 uppercase font-bold tracking-wider">Special Requests</label>
                <textarea
                  placeholder="Allergies, high chair needed, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary focus:ring-2 focus:ring-brand-orange outline-none transition"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={createReservation}
                  disabled={loading || !selectedTable}
                  className="flex-1 bg-brand-lime text-brand-black py-4 rounded-xl font-bold hover:bg-brand-lime/90 transition shadow-lg hover:shadow-brand-lime/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {loading ? 'Processing...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
