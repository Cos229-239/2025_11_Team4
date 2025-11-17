import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StatusBadge = ({ status }) => {
  const normalized =
    status === 'tentative' ? 'pending payment'
    : status === 'expired' ? 'completed'
    : status;

  const color =
    status === 'confirmed'
      ? 'bg-brand-lime/15 text-brand-lime border-brand-lime/30'
      : status === 'seated'
        ? 'bg-[rgb(234_179_8_/_.15)] text-[#eab308] border-[rgb(234_179_8_/_.3)]'
        : status === 'completed' || status === 'expired'
          ? 'bg-[rgb(34_197_94_/_.15)] text-[#22c55e] border-[rgb(34_197_94_/_.3)]'
          : status === 'cancelled'
            ? 'bg-[rgb(239_68_68_/_.15)] text-[#ef4444] border-[rgb(239_68_68_/_.3)]'
            : 'bg-text-secondary/15 text-text-secondary border-text-secondary/30';

  return (
    <span
      className={`px-2 py-1 rounded-full font-['Lora'] font-bold border ${color} capitalize`}
      style={{ fontSize: '12px' }}
    >
      {normalized}
    </span>
  );
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
        setLoading(true);
        setError('');
        if (!userId) {
          setItems([]);
          return;
        }
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
    const upcomingGroups = {};
    const pastGroups = {};
    const now = new Date();

    (items || []).forEach((r) => {
      const dateStr = r.reservation_date;
      if (!dateStr) return;

      const timeStr = (r.reservation_time || '00:00').toString().slice(0, 5);
      const startTs = new Date(`${dateStr}T${timeStr}:00`);

      const status = r.status;
      const isPastStatus = ['completed', 'expired', 'no-show', 'cancelled'].includes(status);
      const isPastTime = startTs < now;

      const bucket = isPastStatus || isPastTime ? pastGroups : upcomingGroups;

      bucket[dateStr] = bucket[dateStr] || [];
      bucket[dateStr].push(r);
    });

    const toSortedArray = (groups) =>
      Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1));

    return {
      upcoming: toSortedArray(upcomingGroups),
      past: toSortedArray(pastGroups)
    };
  }, [items]);

  const cancelReservation = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        const code = data?.code;
        if (code === 'CANCELLATION_WINDOW_PASSED') {
          setToast(
            data?.message ||
              'Cancellations are only allowed more than 12 hours before your reservation time.'
          );
        } else if (code === 'INVALID_RESERVATION_STATUS') {
          setToast('This reservation cannot be cancelled.');
        } else if (code === 'RESERVATION_NOT_FOUND') {
          setToast('Reservation not found.');
        } else {
          setToast(data?.message || 'Failed to cancel');
        }
        setTimeout(() => setToast(''), 3000);
        return;
      }
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
      setToast('Reservation cancelled');
      setTimeout(() => setToast(''), 2000);
    } catch (e) {
      setToast('Failed to cancel');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const checkIn = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to check in');
      }
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, customer_arrived: true, status: 'seated' } : r))
      );
      setToast('Checked in successfully! Kitchen has been notified.');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      setToast(error.message || 'Failed to check in');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const isToday = (reservationDate) => {
    const today = new Date().toISOString().split('T')[0];
    return reservationDate === today;
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 text-center">
        <div className="bg-dark-card border border-dark-surface rounded-2xl p-8 max-w-md">
          <h1 className="text-2xl font-bold text-text-primary mb-2">No Profile Found</h1>
          <p className="text-text-secondary mb-6">
            Create a profile to track your reservations.
          </p>
          <a
            href="/profile"
            className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90 inline-block"
          >
            Create Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-dark-card border border-brand-lime text-text-primary px-4 py-2 rounded-xl z-50 shadow-lg">
          {toast}
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <h1
          className="font-['Playfair_Display'] font-bold text-text-primary mb-4"
          style={{ fontSize: '36px' }}
        >
          My Reservations
        </h1>
        {error && (
          <div
            className="text-[#ef4444] mb-4 font-['Lora']"
            style={{ fontSize: '17px' }}
          >
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-text-secondary font-['Lora']" style={{ fontSize: '17px' }}>
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="text-text-secondary font-['Lora']" style={{ fontSize: '17px' }}>
            You have no reservations.
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.upcoming.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className="font-['Playfair_Display'] font-bold text-text-primary"
                    style={{ fontSize: '24px' }}
                  >
                    Upcoming reservations
                  </h2>
                  <span
                    className="text-text-secondary font-['Lora']"
                    style={{ fontSize: '14px' }}
                  >
                    {grouped.upcoming.reduce((sum, [, list]) => sum + list.length, 0)} active
                  </span>
                </div>
                <div className="space-y-6">
                  {grouped.upcoming.map(([date, list]) => (
                    <div
                      key={date}
                      className="bg-dark-card border border-dark-surface rounded-2xl p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3
                          className="font-['Playfair_Display'] font-bold text-text-primary"
                          style={{ fontSize: '20px' }}
                        >
                          {date}
                        </h3>
                        <span
                          className="text-text-secondary font-['Lora']"
                          style={{ fontSize: '14px' }}
                        >
                          {list.length} reservation{list.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-dark-surface">
                        {list
                          .sort((a, b) =>
                            a.reservation_time < b.reservation_time ? 1 : -1
                          )
                          .map((r) => (
                            <div key={r.id} className="py-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div
                                    className="text-text-primary font-['Lora'] font-semibold mb-1"
                                    style={{ fontSize: '17px' }}
                                  >
                                    {String(r.reservation_time).slice(0, 5)} · Table{' '}
                                    {r.table_number ?? '-'}
                                  </div>
                                  <div
                                    className="text-text-secondary font-['Lora'] mb-2"
                                    style={{ fontSize: '14px' }}
                                  >
                                    Party {r.party_size} at{' '}
                                    {r.restaurant_name || 'Restaurant'}
                                  </div>
                                  {r.has_pre_order && (
                                    <div
                                      className="inline-flex items-center gap-1.5 bg-brand-orange/20 text-brand-orange px-2 py-1 rounded-full border border-brand-orange/30 font-['Lora'] font-semibold"
                                      style={{ fontSize: '12px' }}
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      Pre-Order Placed
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <StatusBadge status={r.status} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {isToday(r.reservation_date) &&
                                  (r.status === 'confirmed' || r.status === 'seated') &&
                                  !r.customer_arrived && (
                                    <button
                                      onClick={() => checkIn(r.id)}
                                      className="bg-brand-lime text-dark-bg px-6 py-3 rounded-lg font-['Lora'] font-bold hover:bg-brand-lime/90 transition-all flex items-center gap-2 shadow-lg hover:shadow-brand-lime/30"
                                      style={{ fontSize: '14px' }}
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                      </svg>
                                      I'm Here
                                    </button>
                                  )}
                                {r.customer_arrived && (
                                  <span
                                    className="text-[#22c55e] font-['Lora'] font-semibold flex items-center gap-1.5"
                                    style={{ fontSize: '14px' }}
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Checked In
                                  </span>
                                )}
                                {(r.status === 'tentative' ||
                                  r.status === 'confirmed') &&
                                  !r.customer_arrived && (
                                    <button
                                      onClick={() => cancelReservation(r.id)}
                                      className="text-[#ef4444] hover:opacity-80 font-['Lora'] font-bold px-3 py-2 hover:bg-[rgb(239_68_68_/_.1)] rounded-lg transition-all"
                                      style={{ fontSize: '14px' }}
                                    >
                                      Cancel
                                    </button>
                                  )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {grouped.past.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className="font-['Playfair_Display'] font-bold text-text-primary"
                    style={{ fontSize: '24px' }}
                  >
                    Past reservations
                  </h2>
                  <span
                    className="text-text-secondary font-['Lora']"
                    style={{ fontSize: '14px' }}
                  >
                    {grouped.past.reduce((sum, [, list]) => sum + list.length, 0)} total
                  </span>
                </div>
                <div className="space-y-6">
                  {grouped.past.map(([date, list]) => (
                    <div
                      key={date}
                      className="bg-dark-card border border-dark-surface/70 rounded-2xl p-5 opacity-80"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3
                          className="font-['Playfair_Display'] font-semibold text-text-secondary"
                          style={{ fontSize: '20px' }}
                        >
                          {date}
                        </h3>
                        <span
                          className="text-text-secondary font-['Lora']"
                          style={{ fontSize: '14px' }}
                        >
                          {list.length} reservation{list.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-dark-surface/80">
                        {list
                          .sort((a, b) =>
                            a.reservation_time < b.reservation_time ? 1 : -1
                          )
                          .map((r) => (
                            <div key={r.id} className="py-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div
                                    className="text-text-primary/80 font-['Lora'] font-semibold mb-1"
                                    style={{ fontSize: '17px' }}
                                  >
                                    {String(r.reservation_time).slice(0, 5)} · Table{' '}
                                    {r.table_number ?? '-'}
                                  </div>
                                  <div
                                    className="text-text-secondary font-['Lora'] mb-2"
                                    style={{ fontSize: '14px' }}
                                  >
                                    Party {r.party_size} at{' '}
                                    {r.restaurant_name || 'Restaurant'}
                                  </div>
                                  {r.has_pre_order && (
                                    <div
                                      className="inline-flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange/80 px-2 py-1 rounded-full border border-brand-orange/30 font-['Lora'] font-semibold"
                                      style={{ fontSize: '12px' }}
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      Pre-Order
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <StatusBadge status={r.status} />
                                </div>
                              </div>
                              {/* Past reservations are read-only */}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;

