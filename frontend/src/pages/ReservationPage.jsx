import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { useCart } from '../context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ReservationPage = () => {
  const { id } = useParams(); // restaurant id
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
      } catch {}
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
    <div className="min-h-screen bg-dark-bg">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-dark-card border border-brand-lime text-text-primary px-4 py-2 rounded-xl z-50 shadow-lg">
          {toast}
        </div>
      )}
      <div className="container mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-brand-orange mb-4">← Back</button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Date & Time */}
          <div className="bg-dark-card rounded-2xl border border-dark-surface p-5">
            <h2 className="text-lg font-bold text-text-primary mb-4">Date & Time</h2>
            {!token && (
              <div className="mb-3 text-xs text-text-secondary">
                Tip: <a href="/login" className="text-brand-orange font-semibold">sign in</a> to auto‑fill your details and save reservations.
              </div>
            )}
            <label className="block text-sm text-text-secondary mb-2">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary mb-4" />
            <label className="block text-sm text-text-secondary mb-2">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
            {/* Quick time slots */}
            <div className="mt-4">
              <p className="text-xs text-text-secondary mb-2">Quick Times</p>
              <div className="grid grid-cols-4 gap-2">
                {['17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTime(t); checkAvailability(); }}
                    className={`px-2 py-2 rounded-lg text-sm font-semibold border ${time===t ? 'bg-brand-lime text-dark-bg border-brand-lime' : 'bg-dark-surface text-text-secondary border-dark-surface hover:bg-dark-surface/70'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm text-text-secondary mt-4 mb-2">Party Size</label>
            <input type="number" min="1" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
            <button onClick={checkAvailability} className="mt-4 bg-brand-orange text-white px-5 py-3 rounded-xl font-bold hover:bg-brand-orange/90" disabled={loading}>
              {loading ? 'Checking...' : 'Check Availability'}
            </button>
          </div>

          {/* Step 2: Table Selection */}
          <div className="bg-dark-card rounded-2xl border border-dark-surface p-5 lg:col-span-2">
            <h2 className="text-lg font-bold text-text-primary mb-4">Available Tables</h2>
            {error && <div className="text-red-400 mb-3">{error}</div>}
            {tables.length === 0 ? (
              <div className="text-text-secondary">No tables available for this time.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${selectedTable === t.id ? 'border-brand-lime bg-brand-lime/10 text-text-primary' : 'border-dark-surface bg-dark-surface text-text-secondary hover:bg-dark-surface/60'}`}
                  >
                    <div className="text-sm font-bold text-text-primary">Table #{t.table_number}</div>
                    <div className="text-xs">Capacity {t.capacity}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Customer Info & Confirm */}
          <div className="bg-dark-card rounded-2xl border border-dark-surface p-5 lg:col-span-3">
            <h2 className="text-lg font-bold text-text-primary mb-4">Your Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
              <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
              <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary" />
            </div>
            <textarea placeholder="Special requests (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-dark-surface border border-dark-surface rounded-xl p-3 text-text-primary mt-4" rows={3} />
            <div className="mt-4 flex gap-3">
              <button onClick={createReservation} disabled={loading || (!selectedTable && tables.length > 0)} className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90 disabled:opacity-50">
                {loading ? 'Saving...' : 'Confirm Reservation'}
              </button>
              <button onClick={() => navigate(-1)} className="bg-dark-surface border border-dark-surface text-text-secondary px-6 py-3 rounded-full font-bold hover:bg-dark-surface/70">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
