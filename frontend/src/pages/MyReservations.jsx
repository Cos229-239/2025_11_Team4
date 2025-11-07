import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StatusBadge = ({ status }) => {
  const color = status === 'confirmed' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    : status === 'seated' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    : status === 'completed' ? 'bg-green-500/15 text-green-300 border-green-500/30'
    : status === 'cancelled' ? 'bg-red-500/15 text-red-300 border-red-500/30'
    : 'bg-gray-500/15 text-gray-300 border-gray-500/30';
  return <span className={`px-2 py-1 rounded-full text-xs font-bold border ${color} capitalize`}>{status}</span>;
};

const MyReservations = () => {
  const [userId] = useState(() => sessionStorage.getItem('ordereasy_user_id'));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError('');
        if (!userId) { setItems([]); return; }
        const res = await fetch(`${API_URL}/api/reservations?user_id=${userId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load reservations');
        setItems(data.data || []);
      } catch (e) {
        setError(e.message || 'Failed to load reservations');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const grouped = useMemo(() => {
    const groups = {};
    (items || []).forEach(r => {
      const d = r.reservation_date;
      groups[d] = groups[d] || [];
      groups[d].push(r);
    });
    return Object.entries(groups).sort(([a],[b]) => a < b ? 1 : -1);
  }, [items]);

  const cancelReservation = async (id) => {
    try {
      await fetch(`${API_URL}/api/reservations/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' })
      });
      setItems(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
      setToast('Reservation cancelled');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Failed to cancel');
      setTimeout(() => setToast(''), 2000);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 text-center">
        <div className="bg-dark-card border border-dark-surface rounded-2xl p-8 max-w-md">
          <h1 className="text-2xl font-bold text-text-primary mb-2">No Profile Found</h1>
          <p className="text-text-secondary mb-6">Create a profile to track your reservations.</p>
          <a href="/profile" className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90 inline-block">Create Profile</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-dark-card border border-brand-lime text-text-primary px-4 py-2 rounded-xl z-50 shadow-lg">{toast}</div>
      )}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-4">My Reservations</h1>
        {error && <div className="text-red-400 mb-4">{error}</div>}
        {loading ? (
          <div className="text-text-secondary">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-text-secondary">You have no reservations.</div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, list]) => (
              <div key={date} className="bg-dark-card border border-dark-surface rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-text-primary">{date}</h2>
                  <span className="text-text-secondary text-sm">{list.length} reservation{list.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-dark-surface">
                  {list.sort((a,b) => a.reservation_time < b.reservation_time ? 1 : -1).map(r => (
                    <div key={r.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-text-primary font-semibold">{String(r.reservation_time).slice(0,5)} • Table {r.table_number ?? '-'}</div>
                        <div className="text-text-secondary text-sm">Party {r.party_size} at {r.restaurant_name || 'Restaurant'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={r.status} />
                        {(r.status === 'pending' || r.status === 'confirmed') && (
                          <button onClick={() => cancelReservation(r.id)} className="text-red-400 hover:text-red-300 text-sm font-bold">Cancel</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;

