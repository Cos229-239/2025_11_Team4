import { useEffect, useState, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useUserAuth } from '../hooks/useUserAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminSettings = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [duration, setDuration] = useState(90);
  const [windowHours, setWindowHours] = useState(12);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const { token } = useUserAuth();

  const loadRestaurants = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL} /api/restaurants`);
      const data = await res.json();
      if (data.success) setRestaurants(data.data || []);
    } catch {
      // ignore
    }
  }, []);

  const loadSettings = useCallback(async (rid) => {
    try {
      setLoading(true);
      const url = new URL(`${API_URL} /api/admin / settings`);
      if (rid) url.searchParams.set('restaurant_id', rid);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token} `
        }
      });

      const data = await res.json();
      if (data.success) {
        setDuration(data.data?.reservation_duration_minutes ?? 90);
        setWindowHours(data.data?.cancellation_window_hours ?? 12);
      }
    } catch {
      // ignore
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadRestaurants(); loadSettings(null); }, [loadRestaurants, loadSettings]);
  useEffect(() => { loadSettings(restaurantId); }, [restaurantId, loadSettings]);

  const save = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL} /api/admin / settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token} `
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          reservation_duration_minutes: parseInt(duration, 10),
          cancellation_window_hours: parseInt(windowHours, 10)
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save');
      setToast('Settings saved'); setTimeout(() => setToast(''), 2000);
    } catch (e) {
      setToast(e.message || 'Failed to save'); setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-text-primary pt-20 relative overflow-hidden">
      {/* BACKGROUND GRADIENT */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
radial - gradient(circle at center,
  #E35504ff 0 %,
  #E35504aa 15 %,
              #000000 35 %,
              #5F2F14aa 55 %,
  #B5FF00ff 80 %,
              #000000 100 %
            )
  `,
          filter: "blur(40px)",
          backgroundSize: "180% 180%",
          opacity: 0.55,
        }}
      ></div>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-brand-lime text-dark-bg px-6 py-3 rounded-xl font-bold shadow-lg z-50 animate-bounce">
          {toast}
        </div>
      )}

      {/* Header integrated into page flow */}
      <div className="container mx-auto px-6 mb-6 relative z-10">
        <div className="flex items-center gap-4 mb-2">
          <a
            href="/admin"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-white"
            title="Back to Dashboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg font-['Playfair_Display']">Admin Settings</h1>
        </div>
        <p className="text-sm opacity-90 ml-12 text-gray-300 font-['Lora']">
          Configure reservation policies and windows
        </p>
      </div>

      <div className="container mx-auto px-6 pb-8 relative z-10">
        <div className="bg-dark-card border border-dark-surface rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">

          {/* Restaurant Selector */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-brand-orange mb-2 uppercase tracking-wider">Scope</label>
            <select
              value={restaurantId ?? ''}
              onChange={e => setRestaurantId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full bg-dark-surface border border-dark-surface text-text-primary rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              <option value="">Global (All Restaurants)</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-2">
              {restaurantId ? 'Editing settings for a specific restaurant.' : 'Editing global defaults for all restaurants.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Duration Setting */}
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Reservation Duration</label>
              <div className="relative">
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full bg-dark-surface border border-dark-surface text-text-primary rounded-xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-lime"
                  min={30}
                  max={240}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">min</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">Typical table occupancy time.</p>
            </div>

            {/* Cancellation Window Setting */}
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Cancellation Window</label>
              <div className="relative">
                <input
                  type="number"
                  value={windowHours}
                  onChange={e => setWindowHours(e.target.value)}
                  className="w-full bg-dark-surface border border-dark-surface text-text-primary rounded-xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-lime"
                  min={0}
                  max={72}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">hours</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">Hours before reservation that refunds are allowed.</p>
            </div>
          </div>

          <button
            disabled={loading}
            onClick={save}
            className="w-full bg-brand-lime text-dark-bg py-4 rounded-xl font-bold text-lg hover:bg-brand-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-brand-lime/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
