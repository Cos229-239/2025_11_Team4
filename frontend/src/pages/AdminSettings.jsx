import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminSettings = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [duration, setDuration] = useState(90);
  const [windowHours, setWindowHours] = useState(12);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRestaurants = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      if (data.success) setRestaurants(data.data || []);
    } catch {}
  };

  const loadSettings = async (rid) => {
    try {
      setLoading(true);
      const url = new URL(`${API_URL}/api/admin/settings`);
      if (rid) url.searchParams.set('restaurant_id', rid);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setDuration(data.data?.reservation_duration_minutes ?? 90);
        setWindowHours(data.data?.cancellation_window_hours ?? 12);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadRestaurants(); loadSettings(null); }, []);
  useEffect(() => { loadSettings(restaurantId); }, [restaurantId]);

  const save = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, reservation_duration_minutes: parseInt(duration,10), cancellation_window_hours: parseInt(windowHours,10) })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save');
      setToast('Settings saved'); setTimeout(() => setToast(''), 2000);
    } catch (e) { setToast(e.message || 'Failed to save'); setTimeout(() => setToast(''), 3000); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-xl">{toast}</div>}
      <header className="bg-brand-orange text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-sm">Configure reservation policy per restaurant</p>
      </header>
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-xl">
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Restaurant</label>
            <select value={restaurantId ?? ''} onChange={e => setRestaurantId(e.target.value ? parseInt(e.target.value,10) : null)} className="border rounded-lg p-2 w-full">
              <option value="">Global (default for all)</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Reservation Duration (minutes)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="border rounded-lg p-2 w-full" min={30} max={240} />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1">Cancellation Window (hours)</label>
            <input type="number" value={windowHours} onChange={e => setWindowHours(e.target.value)} className="border rounded-lg p-2 w-full" min={0} max={72} />
          </div>
          <button disabled={loading} onClick={save} className="bg-brand-lime text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

