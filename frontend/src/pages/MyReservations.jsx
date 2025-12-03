import { useEffect, useMemo, useState } from 'react';
import { useUserAuth } from '../hooks/useUserAuth';
import ReservationDetailsModal from '../components/ReservationDetailsModal';
import DateTimeDisplay from '../components/DateTimeDisplay';

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
  const { user, token } = useUserAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        if (!token) {
          setItems([]);
          return;
        }

        const res = await fetch(`${API_URL}/api/reservations/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
  }, [token]);

  const grouped = useMemo(() => {
    const upcomingGroups = {};
    const pastGroups = {};
    const now = new Date();

    (items || []).forEach((r) => {
      const dateStr = r.reservation_date;
      if (!dateStr) return;

      const timeStr = (r.reservation_time || '00:00').toString().slice(0, 5);
      const startTs = new Date(`${dateStr.split('T')[0]}T${timeStr}:00`);

      const status = r.status;
      const isPastStatus = ['completed', 'expired', 'no-show', 'cancelled'].includes(status);
      const isPastTime = startTs < now;

      const bucket = isPastStatus || isPastTime ? pastGroups : upcomingGroups;

      // Use just the date part for grouping key
      const dateKey = dateStr.split('T')[0];
      bucket[dateKey] = bucket[dateKey] || [];
      bucket[dateKey].push(r);
    });

    const toSortedArray = (groups) =>
      Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1));

    return {
      upcoming: toSortedArray(upcomingGroups),
      past: toSortedArray(pastGroups)
    };
  }, [items]);

  const cancelReservation = async (id, e) => {
    e.stopPropagation(); // Prevent opening modal
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
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
    } catch {
      setToast('Failed to cancel');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const checkIn = async (id, e) => {
    e.stopPropagation(); // Prevent opening modal
    try {
      const res = await fetch(`${API_URL}/api/reservations/${id}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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

  // Helper to format date to readable string
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to check if a date is today
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const date = new Date(dateStr);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col">
        <header className="bg-brand-orange text-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <a href="/profile" className="p-2 rounded-full hover:bg-white/20 transition text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-2xl font-bold">My Reservations</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="bg-dark-card border border-dark-surface rounded-2xl p-10 max-w-md shadow-2xl">
            <div className="w-20 h-20 bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              👤
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Guest Profile Required</h2>
            <p className="text-text-secondary mb-8">
              Please create a profile or log in to view and manage your reservations.
            </p>
            <a
              href="/profile"
              className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition shadow-lg shadow-brand-orange/20 inline-block w-full"
            >
              Create Profile / Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] text-text-primary pt-24">
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

      {selectedReservation && (
        <ReservationDetailsModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
        />
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-brand-lime text-dark-bg px-6 py-3 rounded-xl font-bold shadow-lg z-50 animate-bounce">
          {toast}
        </div>
      )}

      {/* Header integrated into page flow */}
      <div className="container mx-auto px-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <a href="/profile" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg font-display">My Reservations</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading your reservations...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-dark-card rounded-2xl border border-dashed border-dark-surface">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">No Reservations Yet</h3>
            <p className="text-text-secondary mb-6">You haven't made any reservations yet.</p>
            <a href="/restaurants" className="text-brand-orange hover:underline font-bold">Browse Restaurants</a>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.upcoming.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-text-primary">Upcoming</h2>
                  <div className="h-px bg-dark-surface flex-1"></div>
                  <span className="bg-brand-orange text-white text-xs font-bold px-2 py-1 rounded-full">
                    {grouped.upcoming.reduce((sum, [, list]) => sum + list.length, 0)}
                  </span>
                </div>

                <div className="space-y-6">
                  {grouped.upcoming.map(([date, list]) => (
                    <div key={date} className="space-y-4">
                      <h3 className="text-brand-lime font-bold uppercase tracking-wider text-sm ml-1">
                        {formatDate(date)}
                      </h3>

                      {list
                        .sort((a, b) => a.reservation_time < b.reservation_time ? -1 : 1)
                        .map((r) => (
                          <div
                            key={r.id}
                            onClick={() => setSelectedReservation(r)}
                            className="glass-card rounded-2xl p-6 shadow-lg transition-all group relative overflow-hidden cursor-pointer"
                          >
                            {/* Decorative accent */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange"></div>

                            <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <DateTimeDisplay
                                    timestamp={new Date(`${r.reservation_date.split('T')[0]}T${r.reservation_time}`).toISOString()}
                                    restaurantTimezone={r.restaurant_timezone || 'UTC'}
                                    className="scale-100 origin-left"
                                  />
                                  <StatusBadge status={r.status} />
                                </div>

                                <div className="flex items-center gap-2 text-lg font-bold text-text-primary mb-1">
                                  <span>{r.restaurant_name || 'Restaurant'}</span>
                                </div>

                                <div className="flex flex-wrap gap-4 text-text-secondary text-sm mt-2">
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Party of {r.party_size}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    Table {r.table_number ?? 'TBD'}
                                  </div>
                                </div>

                                {r.orders && r.orders.length > 0 && (
                                  <div className="mt-3">
                                    <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-1 rounded border border-brand-orange/20">
                                      {r.orders.length} Pre-order(s) included
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col justify-center gap-3 min-w-[140px]">
                                {isToday(r.reservation_date) && (r.status === 'confirmed' || r.status === 'seated') && !r.customer_arrived && (
                                  <button
                                    onClick={(e) => checkIn(r.id, e)}
                                    className="w-full bg-brand-lime text-dark-bg py-2.5 rounded-xl font-bold hover:bg-brand-lime/90 transition shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    I'm Here
                                  </button>
                                )}

                                {(r.status === 'tentative' || r.status === 'confirmed') && !r.customer_arrived && (
                                  <button
                                    onClick={(e) => cancelReservation(r.id, e)}
                                    className="w-full py-2.5 rounded-xl font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {grouped.past.length > 0 && (
              <div className="space-y-6 pt-8 border-t border-dark-surface">
                <h2 className="text-2xl font-bold text-text-secondary">Past Reservations</h2>

                <div className="space-y-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                  {grouped.past.map(([date, list]) => (
                    <div key={date} className="space-y-4">
                      <h3 className="text-text-secondary font-bold uppercase tracking-wider text-sm ml-1">
                        {formatDate(date)}
                      </h3>

                      {list
                        .sort((a, b) => a.reservation_time < b.reservation_time ? -1 : 1)
                        .map((r) => (
                          <div
                            key={r.id}
                            onClick={() => setSelectedReservation(r)}
                            className="glass-card rounded-xl p-5 flex justify-between items-center cursor-pointer transition"
                          >
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <DateTimeDisplay
                                  timestamp={new Date(`${r.reservation_date.split('T')[0]}T${r.reservation_time}`).toISOString()}
                                  restaurantTimezone={r.restaurant_timezone || 'UTC'}
                                  className="scale-90 origin-left"
                                />
                                <StatusBadge status={r.status} />
                              </div>
                              <div className="text-text-secondary text-sm">
                                {r.restaurant_name} · Party of {r.party_size}
                              </div>
                            </div>
                          </div>
                        ))}
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
