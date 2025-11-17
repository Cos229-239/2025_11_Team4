import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircleIcon, CalendarIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * ReservationConfirmationPage Component
 * Legacy ReservationConfirmationPage Component
 * Shows reservation details for flows that still navigate here.
 * New reservations should use the intent + payment flow instead.
 * URL: /reservation-confirmation
 */
const ReservationConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { reservationData } = location.state || {};
  const [restaurantNameState, setRestaurantNameState] = useState(reservationData?.restaurantName || '');

  // Redirect if no reservation data
  useEffect(() => {
    if (!reservationData) {
      navigate('/restaurants');
    }
  }, [reservationData, navigate]);

  // Fetch restaurant name if not provided
  useEffect(() => {
    if (reservationData && !restaurantNameState && reservationData.restaurantId) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/restaurants/${reservationData.restaurantId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRestaurantNameState(data.data.name);
          }
        })
        .catch(console.error);
    }
  }, [reservationData, restaurantNameState]);

  // Prevent back button navigation to payment/checkout
  useEffect(() => {
    const handlePopState = () => {
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  if (!reservationData) {
    return null;
  }

  const {
    confirmationNumber,
    restaurantName: restaurantNameProp,
    restaurantId,
    date,
    time,
    partySize,
    customerName,
    customerEmail,
    reservationId,
    scheduledFor
  } = reservationData;

  const effectiveRestaurantName = restaurantNameState || restaurantNameProp || '';

  /**
   * Download calendar invite (.ics file)
   */
  const handleDownloadCalendar = () => {
    const reservationDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(reservationDateTime.getTime() + 90 * 60000); // 90 minutes later

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OrderEasy//Reservation//EN',
      'BEGIN:VEVENT',
      `UID:${confirmationNumber}@ordereasy.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(reservationDateTime)}`,
      `DTEND:${formatDate(endDateTime)}`,
      `SUMMARY:Reservation at ${effectiveRestaurantName}`,
      `DESCRIPTION:Table reservation for ${partySize} ${partySize === 1 ? 'person' : 'people'}.\\nConfirmation: ${confirmationNumber}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'DESCRIPTION:Reservation Reminder',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservation-${confirmationNumber}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedDate = new Date(`${date}T${time}`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = new Date(`${date}T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center py-8 px-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl p-6 sm:p-10 max-w-2xl w-full border border-dark-surface transform transition-all duration-700 scale-100 opacity-100">
        {/* Success Header (tentative hold until payment) */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-brand-lime to-brand-lime/80 rounded-full mb-4 animate-bounce shadow-lg shadow-brand-lime/30">
            <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-dark-bg" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
            Reservation Hold Created
          </h1>
          <p className="text-lg text-text-secondary">
            Complete your pre-order and payment to fully confirm your table.
          </p>
        </div>

        {/* Confirmation Number */}
        <div className="bg-gradient-to-br from-brand-orange/20 to-brand-orange/10 rounded-xl p-6 mb-6 border-2 border-brand-orange/30">
          <div className="text-center">
            <div className="text-sm text-text-secondary uppercase tracking-wide mb-1">
              Confirmation Number
            </div>
            <div className="text-3xl sm:text-4xl font-black text-brand-orange font-mono">
              {confirmationNumber}
            </div>
          </div>
        </div>

        {/* Reservation Details */}
        <div className="bg-gradient-to-br from-brand-lime/20 to-brand-lime/10 rounded-xl p-6 mb-6 border-2 border-brand-lime/30">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center">
            Reservation Details
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-text-secondary">Restaurant</div>
                <div className="text-lg font-bold text-text-primary">{effectiveRestaurantName}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center flex-shrink-0">
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

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-text-secondary">Party Size</div>
                <div className="text-lg font-bold text-text-primary">
                  {partySize} {partySize === 1 ? 'Guest' : 'Guests'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-text-secondary">Name</div>
                <div className="text-lg font-bold text-text-primary">{customerName}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Download */}
        <div className="bg-dark-surface rounded-xl p-4 mb-6">
          <button
            onClick={handleDownloadCalendar}
            className="w-full bg-brand-orange text-white px-6 py-4 rounded-xl font-bold hover:bg-brand-orange/90 transition-all flex items-center justify-center gap-2"
          >
            <CalendarIcon className="w-5 h-5" />
            Add to Calendar
          </button>
        </div>

        {/* Email Confirmation Notice */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-green-400 font-semibold mb-1">Confirmation sent!</p>
              <p className="text-green-300">
                A confirmation email has been sent to {customerEmail}. See you soon!
              </p>
            </div>
          </div>
        </div>

        {/* Return Home Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-dark-surface text-text-primary px-6 py-4 rounded-xl font-bold border-2 border-dark-surface hover:border-text-secondary transition-all flex items-center justify-center gap-2"
        >
          <HomeIcon className="w-5 h-5" />
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default ReservationConfirmationPage;
