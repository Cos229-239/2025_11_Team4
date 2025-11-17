import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminPanel = () => {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(1);
  const [todayReservations, setTodayReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const res = await fetch(`${API_URL}/api/restaurants`);
        const data = await res.json();
        if (data.success) {
          setRestaurants(data.data || []);
          if (data.data?.length && !restaurantId) setRestaurantId(data.data[0].id);
        }
      } catch {}
    };
    loadRestaurants();
  }, []);

  const loadTodayReservations = async (rid) => {
    if (!rid) return;
    try {
      setLoading(true);
      setErr('');
      const res = await fetch(`${API_URL}/api/reservations/restaurant/${rid}/today`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load reservations');
      setTodayReservations(data.data || []);
      const tRes = await fetch(`${API_URL}/api/restaurants/${rid}/tables`);
      const tData = await tRes.json();
      if (tData.success) setTables(tData.data || []);
    } catch (e) {
      setErr(e.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTodayReservations(restaurantId); }, [restaurantId]);

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="bg-brand-orange text-white p-6 shadow-md">
        <h1 className="font-['Playfair_Display'] font-bold" style={{ fontSize: '36px' }}>Admin Panel</h1>
        <p className="font-['Lora']" style={{ fontSize: '14px' }}>Restaurant Management</p>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h3 className="text-text-secondary font-['Lora'] font-semibold mb-2" style={{ fontSize: '14px' }}>Total Orders</h3>
            <p className="font-['Playfair_Display'] font-bold text-brand-orange" style={{ fontSize: '32px' }}>0</p>
          </div>
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h3 className="text-text-secondary font-['Lora'] font-semibold mb-2" style={{ fontSize: '14px' }}>Active Tables</h3>
            <p className="font-['Playfair_Display'] font-bold text-brand-lime" style={{ fontSize: '32px' }}>0</p>
          </div>
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h3 className="text-text-secondary font-['Lora'] font-semibold mb-2" style={{ fontSize: '14px' }}>Revenue Today</h3>
            <p className="font-['Playfair_Display'] font-bold text-text-primary" style={{ fontSize: '32px' }}>$0.00</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Menu Management */}
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h2 className="font-['Playfair_Display'] font-bold text-text-primary mb-4" style={{ fontSize: '24px' }}>Menu Management</h2>
            <p className="text-text-secondary font-['Lora'] mb-4" style={{ fontSize: '17px' }}>Manage your restaurant menu items</p>
            <button className="bg-brand-orange text-white px-6 py-3 rounded-lg font-['Lora'] font-semibold hover:opacity-90 transition" style={{ fontSize: '17px' }}>
              Manage Menu
            </button>
          </div>

          {/* Table Management */}
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h2 className="font-['Playfair_Display'] font-bold text-text-primary mb-4" style={{ fontSize: '24px' }}>Table Management</h2>
            <p className="text-text-secondary font-['Lora'] mb-4" style={{ fontSize: '17px' }}>Manage restaurant tables and QR codes</p>
            <button
              className="bg-brand-lime text-brand-black px-6 py-3 rounded-lg font-['Lora'] font-semibold hover:opacity-90 transition"
              onClick={() => navigate('/admin/tables')}
              style={{ fontSize: '17px' }}
            >
              Manage Tables
            </button>
          </div>

          {/* Settings */}
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h2 className="font-['Playfair_Display'] font-bold text-text-primary mb-4" style={{ fontSize: '24px' }}>Reservation Settings</h2>
            <p className="text-text-secondary font-['Lora'] mb-4" style={{ fontSize: '17px' }}>Control duration and cancellation window</p>
            <button
              className="bg-dark-surface text-text-primary px-6 py-3 rounded-lg font-['Lora'] font-semibold hover:opacity-90 transition"
              onClick={() => navigate('/admin/settings')}
              style={{ fontSize: '17px' }}
            >
              Edit Settings
            </button>
          </div>

          {/* Table Status Summary */}
          <div className="bg-dark-card rounded-lg shadow-md p-6 border border-dark-surface">
            <h2 className="font-['Playfair_Display'] font-bold text-text-primary mb-4" style={{ fontSize: '24px' }}>Table Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['available','reserved','occupied','out-of-service'].map((s) => (
                <div key={s} className="border border-dark-surface rounded-lg p-4 bg-dark-surface">
                  <p className="text-text-secondary font-['Lora'] capitalize" style={{ fontSize: '14px' }}>{s.replace('-', ' ')}</p>
                  <p className="font-['Playfair_Display'] font-bold text-text-primary" style={{ fontSize: '24px' }}>
                    {tables.filter(t => t.status === s).length}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Reservations */}
          <div className="bg-dark-card rounded-lg shadow-md p-6 lg:col-span-2 border border-dark-surface">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Playfair_Display'] font-bold text-text-primary" style={{ fontSize: '24px' }}>Today's Reservations</h2>
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(Number(e.target.value))}
                className="border border-dark-surface bg-dark-surface text-text-primary rounded-md px-3 py-2 font-['Lora']"
                style={{ fontSize: '14px' }}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            {toast && (
              <div className="mb-3 bg-[rgb(34_197_94_/_.2)] text-[#22c55e] px-3 py-2 rounded font-['Lora']" style={{ fontSize: '14px' }}>
                {toast}
              </div>
            )}
            {err && <div className="text-[#ef4444] mb-3 font-['Lora']" style={{ fontSize: '14px' }}>{err}</div>}
            {loading ? (
              <div className="text-text-secondary font-['Lora']" style={{ fontSize: '17px' }}>Loading...</div>
            ) : todayReservations.length === 0 ? (
              <div className="text-text-secondary font-['Lora']" style={{ fontSize: '17px' }}>No reservations today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full font-['Lora']" style={{ fontSize: '14px' }}>
                  <thead>
                    <tr className="text-left text-text-secondary border-b border-dark-surface">
                      <th className="py-2 pr-4 font-semibold">Time</th>
                      <th className="py-2 pr-4 font-semibold">Table</th>
                      <th className="py-2 pr-4 font-semibold">Name</th>
                      <th className="py-2 pr-4 font-semibold">Party</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 pr-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayReservations.map((r) => (
                      <tr key={r.id} className="border-b border-dark-surface last:border-b-0 text-text-primary">
                        <td className="py-2 pr-4">{String(r.reservation_time).slice(0,5)}</td>
                        <td className="py-2 pr-4">{r.table_number || '-'}</td>
                        <td className="py-2 pr-4">{r.customer_name}</td>
                        <td className="py-2 pr-4">{r.party_size}</td>
                        <td className="py-2 pr-4 capitalize">{r.status}</td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-2">
                            {r.status === 'confirmed' && (
                              <button
                                onClick={async () => {
                                  await fetch(`${API_URL}/api/reservations/${r.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'seated' })
                                  });
                                  loadTodayReservations(restaurantId);
                                  setToast('Reservation seated');
                                  setTimeout(() => setToast(''), 2000);
                                }}
                                className="px-3 py-1 rounded-md bg-brand-lime text-brand-black font-['Lora'] font-semibold hover:opacity-90"
                                style={{ fontSize: '14px' }}
                              >
                                Seat
                              </button>
                            )}
                            {r.status === 'seated' && (
                              <button
                                onClick={async () => {
                                  await fetch(`${API_URL}/api/reservations/${r.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'completed' })
                                  });
                                  loadTodayReservations(restaurantId);
                                  setToast('Reservation completed');
                                  setTimeout(() => setToast(''), 2000);
                                }}
                                className="px-3 py-1 rounded-md bg-dark-surface text-text-primary font-['Lora'] font-semibold hover:opacity-90"
                                style={{ fontSize: '14px' }}
                              >
                                Complete
                              </button>
                            )}
                            {(r.status === 'tentative' || r.status === 'confirmed') && (
                              <button
                                onClick={async () => {
                                  const res = await fetch(`${API_URL}/api/reservations/${r.id}`, { method: 'DELETE' });
                                  const data = await res.json();
                                  if (!res.ok || !data?.success) {
                                    const code = data?.code;
                                    if (code === 'CANCELLATION_WINDOW_PASSED') {
                                      setToast('Cancellations are only allowed more than 12 hours before the reservation time.');
                                    } else if (code === 'INVALID_RESERVATION_STATUS') {
                                      setToast('This reservation cannot be cancelled.');
                                    } else {
                                      setToast(data?.message || 'Failed to cancel');
                                    }
                                    setTimeout(() => setToast(''), 3000);
                                  } else {
                                    loadTodayReservations(restaurantId);
                                    setToast('Reservation cancelled');
                                    setTimeout(() => setToast(''), 2000);
                                  }
                                }}
                                className="px-3 py-1 rounded-md bg-[#ef4444] text-white font-['Lora'] font-semibold hover:opacity-90"
                                style={{ fontSize: '14px' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
