import React, { useEffect, useState } from 'react';
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-brand-orange text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-sm">Restaurant Management</p>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Orders</h3>
            <p className="text-3xl font-bold text-brand-orange">0</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Active Tables</h3>
            <p className="text-3xl font-bold text-brand-lime">0</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Revenue Today</h3>
            <p className="text-3xl font-bold text-gray-800">$0.00</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Menu Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Menu Management</h2>
            <p className="text-gray-600 mb-4">Manage your restaurant menu items</p>
            <button className="bg-brand-orange text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition">
              Manage Menu
            </button>
          </div>

          {/* Table Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Table Management</h2>
            <p className="text-gray-600 mb-4">Manage restaurant tables and QR codes</p>
            <button
              className="bg-brand-lime text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
              onClick={() => navigate('/admin/tables')}
            >
              Manage Tables
            </button>
          </div>

          {/* Table Status Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Table Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['available','reserved','occupied','out-of-service'].map((s) => (
                <div key={s} className="border rounded-lg p-4">
                  <p className="text-gray-600 text-sm capitalize">{s.replace('-', ' ')}</p>
                  <p className="text-2xl font-bold">
                    {tables.filter(t => t.status === s).length}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Reservations */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Today's Reservations</h2>
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(Number(e.target.value))}
                className="border rounded-md px-3 py-2 text-sm"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            {toast && (
              <div className="mb-3 bg-green-100 text-green-800 px-3 py-2 rounded">
                {toast}
              </div>
            )}
            {err && <div className="text-red-500 mb-3">{err}</div>}
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : todayReservations.length === 0 ? (
              <div className="text-gray-500">No reservations today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b">
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Table</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Party</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayReservations.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-4">{String(r.reservation_time).slice(0,5)}</td>
                        <td className="py-2 pr-4">{r.table_number || '-'}</td>
                        <td className="py-2 pr-4">{r.customer_name}</td>
                        <td className="py-2 pr-4">{r.party_size}</td>
                        <td className="py-2 pr-4 capitalize">{r.status}</td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-2">
                            {(r.status === 'pending' || r.status === 'confirmed') && (
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
                                className="px-3 py-1 rounded-md bg-brand-lime text-white font-semibold hover:opacity-90"
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
                                className="px-3 py-1 rounded-md bg-gray-900 text-white font-semibold hover:opacity-90"
                              >
                                Complete
                              </button>
                            )}
                            {(r.status === 'pending' || r.status === 'confirmed') && (
                              <button
                                onClick={async () => {
                                  await fetch(`${API_URL}/api/reservations/${r.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'cancelled' })
                                  });
                                  loadTodayReservations(restaurantId);
                                  setToast('Reservation cancelled');
                                  setTimeout(() => setToast(''), 2000);
                                }}
                                className="px-3 py-1 rounded-md bg-red-500 text-white font-semibold hover:opacity-90"
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
