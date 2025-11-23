import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useUserAuth } from '../context/UserAuthContext'; // 1. Import Auth Context

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminSettings = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [duration, setDuration] = useState(90);
  const [windowHours, setWindowHours] = useState(12);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. Get the token from context
  const { token } = useUserAuth();

  const loadRestaurants = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      if (data.success) setRestaurants(data.data || []);
    } catch { }
  };

  const loadSettings = async (rid) => {
    try {
      setLoading(true);
      const url = new URL(`${API_URL}/api/admin/settings`);
      if (rid) url.searchParams.set('restaurant_id', rid);

      // 3. Add Authorization header to fetch
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        setDuration(data.data?.reservation_duration_minutes ?? 90);
        setWindowHours(data.data?.cancellation_window_hours ?? 12);
      }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { loadRestaurants(); loadSettings(null); }, []);
  useEffect(() => { loadSettings(restaurantId); }, [restaurantId]);

  const save = async () => {
    try {
      setLoading(true);

      // 4. Add Authorization header to the PUT request
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <--- THIS WAS MISSING
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
    <div className="min-h-screen bg-dark-bg text-text-primary">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-brand-lime text-dark-bg px-6 py-3 rounded-xl font-bold shadow-lg z-50 animate-bounce">
          {toast}
        </div>
      )}

      <header className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white p-6 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <a
              href="/admin"
              className="p-2 rounded-full hover:bg-white/20 transition text-white"
              title="Back to Dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-3xl font-bold font-['Playfair_Display']">Admin Settings</h1>
          </div>
          <p className="text-white/90 font-['Lora'] ml-12">Configure reservation policies and windows</p>
        </div>
      </header>

      <div className="container mx-auto p-6">
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
