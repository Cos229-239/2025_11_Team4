import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, MagnifyingGlassIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * QRCheckPage Component
 * Determines if customer has existing order or needs to place new one
 * URL: /qr-check?restaurant={id}&table={num}
 */
const QRCheckPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const restaurantId = searchParams.get('restaurant');
  const tableNumber = searchParams.get('table');

  const [orderNumber, setOrderNumber] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  // Fetch restaurant name if ID provided
  useEffect(() => {
    if (restaurantId) {
      fetch(`${API_URL}/api/restaurants/${restaurantId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRestaurantName(data.data.name);
          }
        })
        .catch(console.error);
    }
  }, [restaurantId]);

  /**
   * Handle existing order status check
   */
  const handleCheckOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (!orderNumber || orderNumber.trim() === '') {
      setError('Please enter an order number');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(`${API_URL}/api/orders/by-number/${orderNumber}`);
      const data = await response.json();

      if (response.ok && data.success) {
        // Navigate to order status with context
        navigate(`/order-status/${orderNumber}`, {
          state: {
            from: 'qr-check',
            restaurantId,
            tableNumber,
            orderId: data.data.id
          }
        });
      } else {
        setError(data.message || 'Order not found');
      }
    } catch (err) {
      console.error('Error checking order:', err);
      setError('Unable to check order status');
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle new order flow
   */
  const handlePlaceNewOrder = () => {
    if (!restaurantId) {
      setError('Restaurant ID missing from QR code');
      return;
    }

    if (tableNumber) {
      // Table number in URL, go directly to menu
      navigate(`/restaurant/${restaurantId}/menu`, {
        state: {
          orderType: 'dine-in',
          tableNumber: tableNumber,
          restaurantId: restaurantId
        }
      });
    } else {
      // No table number, go to table selection
      navigate('/table-select', {
        state: {
          restaurantId: restaurantId
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col px-4 py-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-lime/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-brand-lime transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl w-full mx-auto flex-grow flex flex-col justify-center">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Welcome{restaurantName ? ` to ${restaurantName}` : ''}!
          </h1>
          <p className="text-text-secondary text-lg">
            Scan your table QR or check an existing order.
          </p>
        </div>

        {/* Scan QR Section */}
        <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-brand-lime/10 p-3 rounded-xl">
              <PlusCircleIcon className="w-6 h-6 text-brand-lime" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              Start a New Order
            </h2>
          </div>

          <p className="text-text-secondary text-sm mb-4">
            If you&apos;re at the restaurant, scan the QR code on your table to begin a new order.
          </p>

          <button
            onClick={() => navigate('/scan-qr')}
            className="
              w-full
              bg-brand-lime text-dark-bg
              px-8 py-4 rounded-full
              text-lg font-bold uppercase tracking-wide
              hover:bg-brand-lime/90
              transform hover:scale-105 active:scale-95
              transition-all duration-200
              shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
              flex items-center justify-center gap-2
            "
          >
            <PlusCircleIcon className="w-5 h-5" />
            Scan QR to Start
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-2xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Existing Order Section */}
        <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-brand-orange/10 p-3 rounded-xl">
              <MagnifyingGlassIcon className="w-6 h-6 text-brand-orange" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              Check Existing Order
            </h2>
          </div>

          <p className="text-text-secondary text-sm mb-4">
            Already ordered? Enter your order number to check the status.
          </p>

          <form onSubmit={handleCheckOrder} className="space-y-4">
            <div>
              <label htmlFor="orderNumber" className="block text-text-secondary text-sm mb-2">
                Order Number
              </label>
              <input
                id="orderNumber"
                type="text"
                placeholder="e.g., ORD-12345"
                value={orderNumber}
                onChange={(e) => {
                  setOrderNumber(e.target.value);
                  setError('');
                }}
                disabled={isValidating}
                className="
                  w-full
                  bg-dark-surface
                  text-text-primary text-center text-xl
                  border-2 border-dark-surface
                  focus:border-brand-orange
                  rounded-xl
                  px-6 py-4
                  outline-none
                  transition-colors
                  disabled:opacity-50
                "
              />
            </div>

            <button
              type="submit"
              disabled={isValidating || !orderNumber}
              className="
                w-full
                bg-brand-orange text-white
                px-8 py-4 rounded-full
                text-lg font-bold uppercase tracking-wide
                hover:bg-brand-orange/90
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-105 active:scale-95
                transition-all duration-200
                shadow-xl shadow-brand-orange/30 hover:shadow-brand-orange/50
                flex items-center justify-center gap-2
              "
            >
              {isValidating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  Check Order Status
                </>
              )}
            </button>
          </form>
        </div>

        {restaurantId && (
          <>
            {/* OR Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-dark-surface"></div>
              <span className="text-text-secondary text-sm uppercase tracking-wider">
                Or
              </span>
              <div className="flex-1 h-px bg-dark-surface"></div>
            </div>

            {/* New Order Section (when QR provided restaurant context) */}
            <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-brand-lime/10 p-3 rounded-xl">
                  <PlusCircleIcon className="w-6 h-6 text-brand-lime" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">
                  Place New Order
                </h2>
              </div>

              <p className="text-text-secondary text-sm mb-6">
                Ready to order? Browse the menu and place your order now.
              </p>

              <button
                onClick={handlePlaceNewOrder}
                className="
                  w-full
                  bg-brand-lime text-dark-bg
                  px-8 py-4 rounded-full
                  text-lg font-bold uppercase tracking-wide
                  hover:bg-brand-lime/90
                  transform hover:scale-105 active:scale-95
                  transition-all duration-200
                  shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
                  flex items-center justify-center gap-2
                "
              >
                <PlusCircleIcon className="w-5 h-5" />
                Browse Menu & Order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QRCheckPage;
