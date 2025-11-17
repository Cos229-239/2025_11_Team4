import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [type, setType] = useState(null); // 'order' or 'reservation'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Prevent back button navigation to payment/checkout
  useEffect(() => {
    const handlePopState = (e) => {
      // Prevent back navigation and redirect to home
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try fetching as an order first
      const orderRes = await fetch(`${API_URL}/api/orders/${orderId}`);
      const orderData = await orderRes.json();

      if (orderData.success) {
        setOrder(orderData.data);
        setType('order');
        setTimeout(() => setShowAnimation(true), 100);
        return;
      }

      // If order fetch fails, try fetching as a reservation
      const reservationRes = await fetch(`${API_URL}/api/reservations/${orderId}`);
      const reservationData = await reservationRes.json();

      if (reservationData.success) {
        setReservation(reservationData.data);
        setType('reservation');
        setTimeout(() => setShowAnimation(true), 100);
        return;
      }

      throw new Error('Not found');
    } catch (err) {
      setError(err.message || 'Failed to load confirmation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchData();
  }, [orderId]);

  // Countdown timer for tentative reservations
  useEffect(() => {
    if (!reservation || reservation.status !== 'tentative' || !reservation.expires_at) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const expiresAt = new Date(reservation.expires_at);
      const now = new Date();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining({ expired: true });
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining({ minutes, seconds, expired: false });
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [reservation]);

  const estimatedPrep = useMemo(() => {
    // Simple heuristic: 10 min base + 4 min per item, clamped 10–35
    const count = order?.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
    const mins = Math.max(10, Math.min(35, 10 + count * 4));
    return `${mins} minutes`;
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSpinner label="Fetching your order..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-lg shadow-lg p-6 max-w-md w-full border border-dark-surface">
          <ErrorMessage message={error} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  if (!order && !reservation) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="bg-dark-card rounded-lg shadow p-8 text-center border border-dark-surface">
          <h2 className="text-xl font-semibold text-text-primary">Not found</h2>
          <p className="text-text-secondary mt-2">We couldn't find this confirmation.</p>
        </div>
      </div>
    );
  }

  // Render Reservation Confirmation with Pre-Order Option
  if (type === 'reservation' && reservation) {
    const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`);
    const formattedDate = reservationDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = reservationDateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const isTentative = reservation.status === 'tentative';
    const isExpired = timeRemaining?.expired;

    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center py-8 px-4">
        <div
          className={`bg-dark-card rounded-2xl shadow-2xl p-6 sm:p-10 max-w-2xl w-full border border-dark-surface transform transition-all duration-700 ${
            showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* Header - Different for tentative vs confirmed */}
          <div className="text-center mb-8">
            {isExpired ? (
              // Expired reservation
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-red-500/20 rounded-full mb-4 shadow-lg shadow-red-500/30">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-red-500 mb-2">
                  Reservation Expired
                </h1>
                <p className="text-lg text-text-secondary">
                  Your reservation time has expired. Please make a new reservation.
                </p>
              </>
            ) : isTentative ? (
              // Tentative reservation
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-brand-orange/20 rounded-full mb-4 shadow-lg shadow-brand-orange/30">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
                  Reservation Reserved!
                </h1>
                <p className="text-lg text-text-secondary">
                  Complete your payment to confirm
                </p>
              </>
            ) : (
              // Confirmed reservation
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-brand-lime to-brand-lime/80 rounded-full mb-4 animate-bounce shadow-lg shadow-brand-lime/30">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-dark-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
                  Reservation Confirmed!
                </h1>
                <p className="text-lg text-text-secondary">
                  We're looking forward to serving you
                </p>
              </>
            )}
          </div>

          {/* Expiration Timer for Tentative Reservations */}
          {isTentative && timeRemaining && !isExpired && (
            <div className="bg-brand-orange/10 border-2 border-brand-orange rounded-xl p-6 mb-6 animate-pulse">
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-2 uppercase tracking-wide font-semibold">
                  Complete Payment Within
                </div>
                <div className="text-5xl font-black text-brand-orange mb-2 font-mono">
                  {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
                </div>
                <div className="text-sm text-text-secondary">
                  Your reservation will expire if payment is not completed
                </div>
              </div>
            </div>
          )}

          {/* Reservation Details */}
          <div className="bg-gradient-to-br from-brand-lime/20 to-brand-lime/10 rounded-xl p-6 mb-6 border-2 border-brand-lime/30">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-text-secondary">Date & Time</div>
                  <div className="text-lg font-bold text-text-primary">{formattedDate}</div>
                  <div className="text-md font-semibold text-brand-lime">{formattedTime}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-text-secondary">Party Size</div>
                  <div className="text-lg font-bold text-text-primary">{reservation.party_size} {reservation.party_size === 1 ? 'Guest' : 'Guests'}</div>
                </div>
              </div>

              {reservation.table_id && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary">Table Number</div>
                    <div className="text-lg font-bold text-text-primary">Table {reservation.table_id}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-text-secondary">Name</div>
                  <div className="text-lg font-bold text-text-primary">{reservation.customer_name}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section - Different for expired/tentative/confirmed */}
          {isExpired ? (
            // Expired - offer to make new reservation
            <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-6 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-red-500 mb-3">Time's Up!</h3>
                <p className="text-text-secondary mb-4">
                  This reservation slot is no longer held. Please make a new reservation.
                </p>
                <button
                  onClick={() => navigate('/restaurants')}
                  className="w-full bg-red-500 text-white py-4 px-6 rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Make New Reservation
                </button>
              </div>
            </div>
          ) : isTentative ? (
            // Tentative - must complete payment first
            <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <svg className="w-6 h-6 text-brand-orange flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-brand-orange mb-2">Payment Required to Confirm</h3>
                  <p className="text-sm text-text-secondary mb-2">
                    This time slot is temporarily held for you. Complete your pre-order with payment to confirm your reservation.
                  </p>
                  <p className="text-xs text-text-secondary">
                    If you don't want to pre-order, you can still pay a small deposit to confirm the reservation.
                  </p>
                </div>
              </div>

              {/* Pre-order entry is removed here; new reservations should use the intent flow via ReservationPage. */}
            </div>
          ) : (
            // Confirmed - keep info only (no pre-order CTA; use reservation intent flow via ReservationPage)
            <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-2">
                <svg className="w-6 h-6 text-brand-orange flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">Reservation Details</h3>
                  <p className="text-sm text-text-secondary">
                    Your reservation is confirmed. You can view or manage it from the My Reservations page.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-reservations')}
                className="w-full mt-3 bg-dark-surface text-text-primary py-3 px-6 rounded-xl font-bold border-2 border-dark-surface hover:border-text-secondary hover:scale-105 transform transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View My Reservations
              </button>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="text-green-400 font-semibold mb-1">Confirmation sent!</p>
                <p className="text-green-300">
                  A confirmation email has been sent to {reservation.customer_email || 'your email'}. See you soon!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = Number(order.total_amount || 0);
  const tableId = order.table_id;
  const tableNumber = order.table_number;
  const restaurantId = order.restaurant_id || order.table_restaurant_id;
  const orderNumber = order.order_number || order.id;

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center py-8 px-4">
      <div
        className={`bg-dark-card rounded-2xl shadow-2xl p-6 sm:p-10 max-w-2xl w-full border border-dark-surface transform transition-all duration-700 ${
          showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Success Header with Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-4 animate-bounce shadow-lg shadow-green-500/50">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
            🎉 Order Received!
          </h1>
          <p className="text-lg text-text-secondary">
            Your delicious food is being prepared right now
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-gradient-to-br from-brand-orange/20 to-brand-orange/10 rounded-xl p-5 sm:p-6 mb-6 border-2 border-brand-orange/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-dark-surface rounded-lg p-4 shadow-md border border-dark-card">
              <div className="text-xs sm:text-sm text-text-secondary uppercase tracking-wide mb-1">
                Order Number
              </div>
              <div className="text-3xl sm:text-4xl font-black text-brand-orange">
                #{order.id}
              </div>
            </div>
            <div className="bg-dark-surface rounded-lg p-4 shadow-md border border-dark-card">
              <div className="text-xs sm:text-sm text-text-secondary uppercase tracking-wide mb-1">
                {order.order_type === 'pre-order' ? 'Reservation' : 'Table'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary">
                {order.order_type === 'pre-order'
                  ? 'Pre-Order'
                  : tableNumber
                    ? `Table ${tableNumber}`
                    : tableId
                      ? `Table ${tableId}`
                      : 'N/A'}
              </div>
            </div>
            <div className="bg-dark-surface rounded-lg p-4 shadow-md border border-dark-card">
              <div className="text-xs sm:text-sm text-text-secondary uppercase tracking-wide mb-1">
                Prep Time
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-lime flex items-center justify-center gap-1">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {estimatedPrep}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Your Order
          </h2>
          {order.items && order.items.length > 0 ? (
            <div className="bg-dark-surface rounded-xl overflow-hidden border border-dark-card shadow-lg">
              <div className="divide-y divide-dark-card">
                {order.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-4 hover:bg-dark-card transition"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-brand-orange text-white text-sm font-bold rounded-full">
                          {it.quantity}
                        </span>
                        <span className="font-semibold text-text-primary truncate">
                          {it.menu_item_name || `Item ${it.menu_item_id}`}
                        </span>
                      </div>
                      {it.special_instructions && (
                        <div className="text-sm text-brand-orange italic ml-9 bg-brand-orange/10 px-2 py-1 rounded">
                          Note: {it.special_instructions}
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-bold text-brand-lime">
                      ${Number(it.subtotal ?? (Number(it.menu_item_price || 0) * Number(it.quantity || 0))).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-orange to-brand-orange/80">
                <span className="text-xl font-bold text-white">Total</span>
                <span className="text-3xl font-black text-white">${total.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-text-secondary bg-dark-surface p-8 rounded-xl border border-dark-card">
              No items found for this order.
            </div>
          )}
        </div>

        {/* Customer Notes if any */}
        {order.customer_notes && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div>
                <div className="text-sm font-semibold text-yellow-400 mb-1">Your Note:</div>
                <div className="text-sm text-yellow-300">{order.customer_notes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-400">
                Order Status: <span className="uppercase">{order.status}</span>
              </p>
              <p className="text-xs text-green-300 mt-1">
                We'll notify the kitchen staff immediately. You can relax and enjoy your time!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() =>
              navigate(`/order-status/${orderNumber}`, {
                state: {
                  from: 'confirmation',
                  restaurantId,
                  tableNumber: tableId,
                  orderId: order.id,
                  orderType: order.order_type,
                },
              })
            }
            className="flex-1 bg-brand-orange text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-brand-orange/90 hover:shadow-xl hover:shadow-brand-orange/30 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          >
            View Order Status
          </button>

          <button
            onClick={() => navigate('/', { replace: true })}
            className="flex-1 bg-dark-surface text-text-primary py-4 px-6 rounded-xl font-bold text-lg border-2 border-dark-surface hover:border-text-secondary hover:scale-105 transform transition-all duration-200 flex items-center justify-center gap-2"
          >
            Return to Home
          </button>

          {order.order_type === 'dine-in' && restaurantId && tableId && (
            <button
              onClick={() =>
                navigate(`/restaurant/${restaurantId}/menu`, {
                  state: {
                    orderType: 'dine-in',
                    tableNumber: tableId,
                    restaurantId,
                  },
                })
              }
              className="flex-1 bg-brand-lime text-dark-bg py-4 px-6 rounded-xl font-bold text-lg hover:bg-brand-lime/90 hover:shadow-xl hover:shadow-brand-lime/30 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Order More Items
            </button>
          )}
        </div>

        {/* Thank You Message */}
        <div className="text-center mt-6 pt-6 border-t border-dark-surface">
          <p className="text-text-secondary text-sm">
            Thank you for your order! We hope you enjoy your meal. 🍽️
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
