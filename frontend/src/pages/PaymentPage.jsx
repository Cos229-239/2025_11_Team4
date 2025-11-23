import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * PaymentPage Component
 * Handles payment processing before creating orders
 * Supports both dine-in and pre-order flows
 */
const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart, clearPreOrderContext, cartSubtotal, cartTax, cartTotal } = useCart();

  // Get order context from navigation state
  const {
    table_id,
    order_type = 'dine-in',
    restaurant_id,
    reservation_id,
    reservation_intent,
    scheduled_for,
    customer_notes = ''
  } = location.state || {};

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  // Square payment form placeholder state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingZip, setBillingZip] = useState('');

  // Redirect if no cart items or missing required data
  useEffect(() => {
    if (cart.length === 0) {
      console.warn('No items in cart, redirecting to home');
      navigate('/restaurants');
      return;
    }

    // Validate we have proper order context from CartPage
    if (
      !order_type ||
      (order_type !== 'takeout' && !table_id && !reservation_id && !reservation_intent)
    ) {
      console.warn('Missing order context (no table_id or reservation reference), redirecting to cart');
      navigate('/cart');
      return;
    }

    if (order_type === 'dine-in' && !table_id) {
      console.warn('Dine-in order requires table_id, redirecting to cart');
      navigate('/cart');
      return;
    }

    if (order_type === 'pre-order' && !reservation_id && !reservation_intent) {
      console.warn('Pre-order requires reservation intent or reservation_id, redirecting to cart');
      navigate('/cart');
      return;
    }
  }, [cart, order_type, table_id, reservation_id, reservation_intent, navigate]);

  // Handle payment submission
  const handlePayment = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }

    // Basic client-side card validation for demo purposes
    const normalizedCard = cardNumber.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(normalizedCard)) {
      setError('Please enter a valid card number.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      setError('Please enter a valid expiry date (MM/YY).');
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      setError('Please enter a valid CVV.');
      return;
    }

    if (!billingZip || billingZip.trim().length < 3) {
      setError('Please enter a valid billing ZIP/postal code.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      console.log('Starting payment process...', {
        order_type,
        table_id,
        restaurant_id,
        reservation_id,
        reservation_intent,
        amount: cartTotal
      });

      // Step 1: Create payment intent
      const paymentIntentResponse = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: cartTotal,
          currency: 'USD',
          orderId: null, // Will be created after payment
          reservationId:
            order_type === 'pre-order' && reservation_id
              ? parseInt(reservation_id, 10)
              : null
          // For intent-based reservations, we don't need to touch the DB yet here.
        }),
      });

      const paymentIntentData = await paymentIntentResponse.json();
      console.log('Payment intent created:', paymentIntentData);

      if (!paymentIntentData.success) {
        throw new Error(paymentIntentData.message || 'Failed to create payment intent');
      }

      // TODO: Integrate with Square Web Payments SDK
      // For now, we simulate payment processing
      // In production, this would use Square's payment form

      // Step 2: Confirm payment (simulated)
      const paymentConfirmResponse = await fetch(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentData.data.id,
          reservationId:
            order_type === 'pre-order' && reservation_id
              ? parseInt(reservation_id, 10)
              : null,
          reservationIntent:
            order_type === 'pre-order' && !reservation_id && reservation_intent
              ? reservation_intent
              : null
        }),
      });

      const paymentConfirmData = await paymentConfirmResponse.json();
      console.log('Payment confirmed:', paymentConfirmData);

      if (!paymentConfirmData.success) {
        throw new Error(paymentConfirmData.message || 'Payment failed');
      }

      // Step 3: Create order with completed payment
      const confirmedReservation =
        paymentConfirmData.data && paymentConfirmData.data.id
          ? paymentConfirmData.data
          : null;

      const finalReservationId =
        order_type === 'pre-order'
          ? (confirmedReservation?.id ||
            (reservation_id ? parseInt(reservation_id, 10) : null))
          : null;

      const orderData = {
        table_id: order_type === 'dine-in' ? parseInt(table_id) : null,
        restaurant_id: restaurant_id ? parseInt(restaurant_id) : null,
        order_type,
        reservation_id: order_type === 'pre-order' ? finalReservationId : null,
        scheduled_for: order_type === 'pre-order' ? scheduled_for : null,
        customer_notes,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          special_instructions: item.special_instructions || '',
        })),
        payment_status: 'completed',
        payment_method: paymentMethod,
        payment_intent_id: paymentIntentData.data.id,
        payment_amount: cartTotal,
        user_id: sessionStorage.getItem('ordereasy_user_id') // Include user_id for history tracking
      };

      const orderResponse = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const orderResponseData = await orderResponse.json();

      if (!orderResponseData.success) {
        // Payment went through but order creation failed
        // In production, this would trigger a refund
        console.error('Order creation failed:', orderResponseData);
        throw new Error(orderResponseData.error || 'Failed to create order');
      }

      console.log('Order created successfully:', orderResponseData.data);

      // Success! Clear cart and pre-order context, then navigate to confirmation
      clearCart();
      clearPreOrderContext();

      // Add small delay to ensure cart is cleared before navigation
      setTimeout(() => {
        navigate(`/confirmation/${orderResponseData.data.id}`, {
          state: { order_type, paid: true },
          replace: true
        });
      }, 100);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err.message || 'Payment failed. Please try again.');
      // CRITICAL: Stay on page - do NOT navigate on error
      // User can retry by clicking the button again
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] pb-32">
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
      <header className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cart', { state: location.state })}
              className="hover:bg-white/10 rounded-xl p-2 transition-all"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold">Checkout</h1>
              <p className="text-sm opacity-90">
                {order_type === 'pre-order' ? 'Pre-Order Payment' : 'Dine-In Payment'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
        {/* Order Type Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${order_type === 'pre-order'
            ? 'bg-brand-lime/20 text-brand-lime border border-brand-lime/30'
            : 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
            }`}>
            {order_type === 'pre-order' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pre-Order
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Dine-In
              </>
            )}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-dark-card rounded-2xl shadow-xl p-6 mb-6 border border-dark-surface">
          <h2 className="text-lg font-bold text-text-primary mb-4">Order Summary</h2>

          {/* Items */}
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex-1">
                  <span className="text-text-primary font-medium">{item.name}</span>
                  <span className="text-text-secondary ml-2">x{item.quantity}</span>
                </div>
                <span className="text-text-primary font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dark-surface pt-4 space-y-2">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="font-semibold">${cartSubtotal.toFixed(2)}</span>
            </div>
            {cartTax > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Tax</span>
                <span className="font-semibold">${cartTax.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-dark-surface pt-2 flex justify-between text-xl font-bold">
              <span className="text-text-primary">Total</span>
              <span className="text-brand-lime">${cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handlePayment}>
          <div className="bg-dark-card rounded-2xl shadow-xl p-6 mb-6 border border-dark-surface">
            <h2 className="text-lg font-bold text-text-primary mb-4">Payment Information</h2>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-text-primary mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'credit_card'
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                    : 'border-dark-surface bg-dark-surface text-text-secondary hover:border-text-secondary'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2 font-semibold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Credit Card
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('debit_card')}
                  className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'debit_card'
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                    : 'border-dark-surface bg-dark-surface text-text-secondary hover:border-text-secondary'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2 font-semibold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Debit Card
                  </div>
                </button>
              </div>
            </div>

            {/* Placeholder for Square Payment Form */}
            <div className="space-y-4">
              <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-xl p-4 text-sm text-brand-orange">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold mb-1">Square Payment Integration</p>
                    <p className="text-xs text-text-secondary">
                      This is a placeholder form. In production, Square Web Payments SDK will be integrated here for secure payment processing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  required
                />
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Billing ZIP */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Billing ZIP Code
                </label>
                <input
                  type="text"
                  value={billingZip}
                  onChange={(e) => setBillingZip(e.target.value)}
                  placeholder="12345"
                  maxLength={10}
                  className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${isProcessing
              ? 'bg-dark-surface text-text-secondary cursor-not-allowed'
              : 'bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime'
              }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                Processing Payment...
              </span>
            ) : (
              `Pay $${cartTotal.toFixed(2)}`
            )}
          </button>

          {/* Security Notice */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-secondary">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secured by Square Payment Processing
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;
