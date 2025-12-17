import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '../hooks/useCart';
import CheckoutForm from '../components/CheckoutForm';
import TipSelector from '../components/TipSelector';
import { fetchWithAuth } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * PaymentPage Component
 * Handles payment processing using Stripe Elements
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

  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(true);
  const [tipAmount, setTipAmount] = useState(0);

  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#FA6C01',
        colorBackground: '#1a1a1a',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'Lora, serif',
      }
    }
  }), [clientSecret]);

  // Redirect if no cart items or missing required data
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/restaurants');
      return;
    }

    if (
      !order_type ||
      (order_type !== 'takeout' && !table_id && !reservation_id && !reservation_intent)
    ) {
      navigate('/cart');
      return;
    }
  }, [cart, order_type, table_id, reservation_id, reservation_intent, navigate]);

  // Fetch PaymentIntent on mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (cart.length === 0) return;

      try {
        setIsLoadingSecret(true);
        const response = await fetchWithAuth(`${API_URL}/api/payments/create-intent`, {
          method: 'POST',
          body: JSON.stringify({
            items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
            reservationId: order_type === 'pre-order' && reservation_id ? parseInt(reservation_id, 10) : null,
            metadata: {
              restaurant_id,
              table_id,
              order_type
            },
            tipAmount
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Failed to initialize payment');
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'Failed to load payment system');
      } finally {
        setIsLoadingSecret(false);
      }
    };

    createPaymentIntent();
  }, [cart, order_type, reservation_id, restaurant_id, table_id, tipAmount]);

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      // Confirm payment on backend (finalize reservation) and create order
      const confirmResponse = await fetchWithAuth(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          reservationId: order_type === 'pre-order' && reservation_id ? parseInt(reservation_id, 10) : null,
          reservationIntent: order_type === 'pre-order' && !reservation_id && reservation_intent ? reservation_intent : null,
          order: {
            table_id: order_type === 'dine-in' ? parseInt(table_id) : null,
            restaurant_id: restaurant_id ? parseInt(restaurant_id) : null,
            order_type,
            reservation_id: order_type === 'pre-order' && reservation_id ? parseInt(reservation_id, 10) : null,
            scheduled_for: order_type === 'pre-order' ? scheduled_for : null,
            customer_notes,
            items: cart.map((item) => ({
              menu_item_id: item.id,
              quantity: item.quantity,
              special_instructions: item.special_instructions || '',
            })),
            tip_amount: tipAmount
          }
        }),
      });

      const confirmData = await confirmResponse.json();
      if (!confirmData.success) {
        throw new Error(confirmData.message || 'Payment confirmed but failed to finalize reservation');
      }

      // Prefer server-created order (more secure); fallback to legacy flow if needed.
      let createdOrder = confirmData.order || null;
      if (!createdOrder) {
        const legacyOrderData = {
          table_id: order_type === 'dine-in' ? parseInt(table_id) : null,
          restaurant_id: restaurant_id ? parseInt(restaurant_id) : null,
          order_type,
          reservation_id: order_type === 'pre-order' && reservation_id ? parseInt(reservation_id, 10) : null,
          scheduled_for: order_type === 'pre-order' ? scheduled_for : null,
          customer_notes,
          items: cart.map((item) => ({
            menu_item_id: item.id,
            quantity: item.quantity,
            special_instructions: item.special_instructions || '',
          })),
          payment_status: 'completed',
          payment_method: 'stripe',
          payment_intent_id: paymentIntent.id,
          payment_amount: (paymentIntent.amount / 100) - tipAmount, // store subtotal; backend will add tip_amount
          tip_amount: tipAmount
        };

        const orderResponse = await fetchWithAuth(`${API_URL}/api/orders`, {
          method: 'POST',
          body: JSON.stringify(legacyOrderData),
        });

        const orderResponseData = await orderResponse.json();

        if (!orderResponseData.success) {
          throw new Error(orderResponseData.error || 'Failed to create order');
        }
        createdOrder = orderResponseData.data;
      }

      // Success! Clear cart and navigate
      clearCart();
      clearPreOrderContext();

      setTimeout(() => {
        navigate(`/confirmation/${createdOrder.id}`, {
          state: { order_type, paid: true },
          replace: true
        });
      }, 100);

    } catch (err) {
      console.error('Error finalizing order:', err);
      setError(err.message || 'Payment successful but order creation failed. Please contact support.');
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
        }}
      ></div>

      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl relative z-10">
        <button
          onClick={() => navigate('/cart', { state: location.state })}
          className="mb-6 hover:bg-white/10 rounded-xl p-2 transition-all flex items-center gap-2 text-white/80 hover:text-white inline-flex"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Cart</span>
        </button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 font-display">Checkout</h1>
          <p className="text-white/60">Complete your order securely</p>
        </div>
        {/* Order Type Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${order_type === 'pre-order'
            ? 'bg-brand-lime/20 text-brand-lime border border-brand-lime/30'
            : 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
            }`}>
            {order_type === 'pre-order' ? 'Pre-Order' : 'Dine-In'}
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
            <div className="flex justify-between text-text-secondary">
              <span>Tip</span>
              <span className="font-semibold">${tipAmount.toFixed(2)}</span>
            </div>
            <div className="border-t border-dark-surface pt-2 flex justify-between text-xl font-bold">
              <span className="text-text-primary">Total</span>
              <span className="text-brand-lime">${(cartTotal + tipAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Tip Selector */}
        <TipSelector subtotal={cartSubtotal} onTipChange={setTipAmount} />

        {/* Stripe Payment Form */}
        <div className="bg-dark-card rounded-2xl shadow-xl p-6 mb-6 border border-dark-surface">
          <h2 className="text-lg font-bold text-text-primary mb-4">Payment Details</h2>

          {isLoadingSecret ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={options} key={clientSecret}>
              <CheckoutForm
                amount={cartTotal + tipAmount}
                onSuccess={handlePaymentSuccess}
                onError={(msg) => setError(msg)}
              />
            </Elements>
          ) : (
            <div className="text-center py-4 text-text-secondary">
              Unable to load payment form. Please try refreshing.
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default PaymentPage;
