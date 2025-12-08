import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminPanel = () => {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(1);
  const [todayReservations, setTodayReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const [stats, setStats] = useState({
    totalOrdersToday: 0,
    activeTables: 0,
    revenueToday: 0
  });

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const res = await fetch(`${API_URL}/api/restaurants`);
        const data = await res.json();
        if (data.success) {
          setRestaurants(data.data || []);
          if (data.data?.length && !restaurantId) setRestaurantId(data.data[0].id);
        }
      } catch {
        // ignore
      }
    };
    loadRestaurants();
  }, [restaurantId]);

  const loadStats = async (rid) => {
    if (!rid) return;
    try {
      const res = await fetch(`${API_URL}/api/restaurants/${rid}/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const loadTodayReservations = async (rid) => {
    if (!rid) return;
    try {
      setLoading(true);
      setErr('');
      const res = await fetch(`${API_URL}/api/reservations/restaurant/${rid}/today`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load reservations');
      setTodayReservations(data.data || []);
    } catch (e) {
      setErr(e.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadTodayReservations(restaurantId);
      loadStats(restaurantId);
    }
  }, [restaurantId]);

  // Prepare chart data from reservations
  const chartData = useMemo(() => {
    const hours = {};
    // Initialize hours from 10:00 to 22:00
    for (let i = 10; i <= 22; i++) {
      hours[`${i}:00`] = 0;
    }

    todayReservations.forEach(r => {
      const hour = r.reservation_time.split(':')[0] + ':00';
      if (hours[hour] !== undefined) {
        hours[hour] += r.party_size;
      }
    });

    return Object.entries(hours).map(([time, guests]) => ({
      time,
      guests
    }));
  }, [todayReservations]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] text-white pb-12">
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

      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-20 shadow-lg backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="font-['Playfair_Display'] font-bold text-2xl text-brand-orange drop-shadow-md">Admin Panel</h1>
            <p className="font-['Lora'] text-sm text-gray-300">Restaurant Management Dashboard</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition font-semibold border border-white/10 backdrop-blur-sm"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden group hover:bg-white/5 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">📦</span>
            </div>
            <h3 className="text-gray-300 font-medium mb-2">Total Orders (Today)</h3>
            <p className="text-4xl font-bold text-brand-orange drop-shadow-md">{stats.totalOrdersToday || 0}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden group hover:bg-white/5 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">🍽️</span>
            </div>
            <h3 className="text-gray-300 font-medium mb-2">Active Tables</h3>
            <p className="text-4xl font-bold text-brand-lime drop-shadow-md">{stats.activeTables || 0}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden group hover:bg-white/5 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">💰</span>
            </div>
            <h3 className="text-gray-300 font-medium mb-2">Revenue Today</h3>
            <p className="text-4xl font-bold text-white drop-shadow-md">${(stats.revenueToday || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Analytics Chart */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/10 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white drop-shadow-sm">
              <span className="text-brand-orange">📊</span> Reservation Analytics
            </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Bar dataKey="guests" name="Expected Guests" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-4">
            <h2 className="text-xl font-bold mb-2 text-white drop-shadow-sm">Quick Actions</h2>

            <button
              onClick={() => navigate('/admin/menu')}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-white/5 hover:border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">🍔</span>
                <div className="text-left">
                  <p className="font-bold text-white">Menu Management</p>
                  <p className="text-xs text-gray-400">Update items & prices</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
            </button>

            <button
              onClick={() => navigate('/admin/tables')}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-white/5 hover:border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">🪑</span>
                <div className="text-left">
                  <p className="font-bold text-white">Table Management</p>
                  <p className="text-xs text-gray-400">Layout & QR codes</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
            </button>

            <button
              onClick={() => navigate('/admin/settings')}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-white/5 hover:border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">⚙️</span>
                <div className="text-left">
                  <p className="font-bold text-white">Settings</p>
                  <p className="text-xs text-gray-400">General configuration</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
            </button>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white drop-shadow-sm">
              <span className="text-brand-lime">📅</span> Today's Reservations
            </h2>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(Number(e.target.value))}
              className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-orange outline-none backdrop-blur-sm"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id} className="bg-dark-card text-white">{r.name}</option>
              ))}
            </select>
          </div>

          {toast && (
            <div className="mb-4 bg-green-500/20 text-green-400 px-4 py-3 rounded-xl border border-green-500/30 flex items-center gap-2 backdrop-blur-sm">
              <span>✓</span> {toast}
            </div>
          )}

          {err && (
            <div className="mb-4 bg-red-500/20 text-red-400 px-4 py-3 rounded-xl border border-red-500/30 backdrop-blur-sm">
              {err}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading reservations...</div>
          ) : todayReservations.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10 backdrop-blur-sm">
              <p className="text-4xl mb-2">📅</p>
              <p className="text-gray-400">No reservations scheduled for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-white/10">
                    <th className="py-4 px-4 font-semibold">Time</th>
                    <th className="py-4 px-4 font-semibold">Table</th>
                    <th className="py-4 px-4 font-semibold">Guest</th>
                    <th className="py-4 px-4 font-semibold">Size</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayReservations.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition">
                      <td className="py-4 px-4 font-medium text-brand-orange">
                        {String(r.reservation_time).slice(0, 5)}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {r.table_number ? (
                          <span className="bg-white/10 px-2 py-1 rounded text-sm border border-white/5">#{r.table_number}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{r.customer_name}</div>
                        <div className="text-xs text-gray-400">{r.customer_phone}</div>
                      </td>
                      <td className="py-4 px-4 text-white">
                        <span className="flex items-center gap-1">
                          👤 {r.party_size}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${r.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          r.status === 'seated' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            r.status === 'completed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                              'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {r.status === 'confirmed' && (
                            <button
                              onClick={async () => {
                                await fetch(`${API_URL}/api/reservations/${r.id}/status`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'seated' })
                                });
                                loadTodayReservations(restaurantId);
                                setToast('Guest seated successfully');
                                setTimeout(() => setToast(''), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand-lime text-brand-black font-bold text-sm hover:bg-brand-lime/90 transition shadow-lg shadow-brand-lime/20"
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
                              className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition border border-white/10"
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
                                  setToast(data?.message || 'Failed to cancel');
                                  setTimeout(() => setToast(''), 3000);
                                } else {
                                  loadTodayReservations(restaurantId);
                                  setToast('Reservation cancelled');
                                  setTimeout(() => setToast(''), 2000);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition"
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
  );
};

export default AdminPanel;
