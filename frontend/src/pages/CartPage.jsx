import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * CartPage Component
 * Review cart and place order
 * Updated to match Team Vision dark theme design
 */
const CartPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTax,
    cartTotal,
    setTableId,
    preOrderContext,
    orderContext,
  } = useCart();

  const [customerNotes, setCustomerNotes] = useState('');
  const [orderingMode, setOrderingMode] = useState(null); // null, 'dine-in', or 'reservation'
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [selectTable, setSelectTable] = useState('');

  // Set table ID in context when component mounts
  useEffect(() => {
    if (tableId) {
      setTableId(tableId);
      setOrderingMode('dine-in'); // If tableId is present, they scanned QR (legacy)
    } else if (preOrderContext?.reservation_intent || preOrderContext?.reservation_id) {
      // If we have pre-order context, skip ordering mode selection
      setOrderingMode('pre-order');
      console.log('Cart detected pre-order context:', preOrderContext);
    } else if (orderContext?.orderType === 'dine-in' && orderContext.tableNumber) {
      // Dine-in context from menu (QR flow)
      setTableId(orderContext.tableNumber);
      setOrderingMode('dine-in');
    } else if (orderContext?.orderType === 'takeout') {
      // Takeout context
      setOrderingMode('takeout');
    }
  }, [tableId, setTableId, preOrderContext, orderContext]);

  // If no table selected in the URL and no pre-order context, ask if they're at restaurant or planning ahead
  if (!tableId && !orderingMode && !preOrderContext) {
    return (

      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
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
        <div className="
          bg-brand-lime/10
          backdrop-blur-xl
          border border-brand-lime/40
          rounded-2xl
          p-8
          max-w-lg
          w-full
          shadow-[0_0_25px_rgba(181,255,0,0.25)]
        ">


          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">How would you like to order?</h2>
            <p className="text-text-secondary">Choose your dining option to continue</p>
          </div>

          <div className="space-y-4">
            {/* Option 1: Scan QR (Dine-In) */}
            <button
              onClick={() => navigate('/scan-qr')}
              className="w-full glass-card p-6 rounded-xl hover:shadow-xl hover:shadow-brand-orange/30 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Scan QR Code</h3>
                  <p className="text-sm opacity-90">I'm at the restaurant and ready to order</p>
                </div>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 2: Make Reservation (Pre-Order) */}
            <button
              onClick={() => {
                if (orderContext?.restaurantId) {
                  navigate(`/restaurant/${orderContext.restaurantId}/reserve`, {
                    state: { fromCart: true }
                  });
                } else {
                  navigate('/restaurants');
                }
              }}
              className="w-full glass-card text-text-primary p-6 rounded-xl hover:shadow-xl transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Make a Reservation</h3>
                  <p className="text-sm text-text-secondary">Book a table and pre-order your meal</p>
                </div>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 3: Takeout */}
            <button
              onClick={() => setOrderingMode('takeout')}
              className="w-full glass-card text-text-primary p-6 rounded-xl hover:shadow-xl transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-orange/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Order Takeout</h3>
                  <p className="text-sm text-text-secondary">Pick up your food and go</p>
                </div>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          <button
            onClick={() => navigate('/restaurants')}
            className="mt-6 w-full text-text-secondary hover:text-brand-orange transition-colors text-sm underline decoration-dotted underline-offset-4"
          >
            Back to Restaurants
          </button>
        </div>
      </div>
    );
  }

  // If they chose reservation but haven't made one yet, redirect them
  if (orderingMode === 'reservation' && !tableId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
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
        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dark-surface">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Make a Reservation First</h2>
          <p className="text-text-secondary mb-6">
            To pre-order your meal, you'll need to make a reservation first. After reserving, you can browse the menu and place your order.
          </p>

          <button
            onClick={() => navigate('/restaurants')}
            className="w-full bg-brand-lime text-dark-bg px-8 py-4 rounded-xl font-bold hover:bg-brand-lime/90 transition-all mb-3"
          >
            Browse Restaurants
          </button>

          <button
            onClick={() => setOrderingMode(null)}
            className="w-full text-text-secondary hover:text-brand-orange transition-colors text-sm underline decoration-dotted underline-offset-4"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // If they chose dine-in, show table selection
  if (orderingMode === 'dine-in' && !tableId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
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
        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dark-surface">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Enter Your Table Number</h2>
          <p className="text-text-secondary mb-6">You can find this on the QR code at your table</p>

          <input
            type="number"
            min="1"
            value={selectTable}
            onChange={(e) => setSelectTable(e.target.value)}
            placeholder="e.g., 4"
            className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent mb-4"
          />

          <button
            onClick={() => setOrderingMode(null)}
            disabled={!selectTable}
            className="w-full bg-brand-lime text-dark-bg px-8 py-3 rounded-xl font-bold hover:bg-brand-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            Continue
          </button>

          <button
            onClick={() => setOrderingMode(null)}
            className="w-full text-text-secondary hover:text-brand-orange transition-colors text-sm underline decoration-dotted underline-offset-4"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Handle quantity change
  const handleQuantityChange = (itemId, change) => {
    const item = cart.find((item) => item.id === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleBrowseMenu = () => {
    // Safe default: go to the restaurants listing
    navigate('/restaurants');
  };

  // Handle direct quantity input
  const handleQuantityInput = (itemId, value) => {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity >= 0) {
      updateQuantity(itemId, quantity);
    }
  };

  // Handle proceed to checkout/payment
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      return;
    }

    // Clear any previous errors
    setVerificationError(null);

    // If we have pre-order context, VERIFY reservation before payment (per flowchart)
    if (preOrderContext?.reservation_intent || preOrderContext?.reservation_id) {
      console.log('[CART] Pre-order detected - verifying reservation before payment');
      setIsVerifying(true);

      try {
        let verifyResponse;

        // New intent-based verification
        if (preOrderContext.reservation_intent) {
          verifyResponse = await fetch(`${API_URL}/api/reservations/intent/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              intentToken: preOrderContext.reservation_intent
            })
          });
        } else {
          // Legacy reservation row verification
          verifyResponse = await fetch(
            `${API_URL}/api/reservations/${preOrderContext.reservation_id}/verify`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                restaurant_id: preOrderContext.restaurant_id
              })
            }
          );
        }

        const verifyData = await verifyResponse.json();

        // Step 2: Handle verification errors per flowchart
        if (!verifyResponse.ok) {
          console.error('[CART] Verification failed:', verifyData);

          // Map error codes to user-friendly messages
          const errorMessages = {
            'RESERVATION_NOT_FOUND': {
              title: 'Reservation Not Found',
              message: 'This reservation no longer exists. Please make a new reservation.',
              action: 'Make New Reservation'
            },
            'RESERVATION_EXPIRED': {
              title: 'Time Slot No Longer Available',
              message: 'Your reservation has expired while you were shopping. The time slot has been released.',
              action: 'Make New Reservation'
            },
            'RESERVATION_CONFLICT': {
              title: 'Slot Already Taken',
              message: 'Another customer has already booked this time slot. Please choose a different time.',
              action: 'Make New Reservation'
            },
            'WRONG_RESTAURANT': {
              title: 'Restaurant Mismatch',
              message: 'Your cart items are from a different restaurant than your reservation.',
              action: 'Clear Cart'
            }
          };

          const error = errorMessages[verifyData.code] || {
            title: 'Verification Failed',
            message: verifyData.message || 'Please try again or make a new reservation.',
            action: 'Try Again'
          };

          setVerificationError(error);
          setIsVerifying(false);
          return;
        }

        // Step 3: Verification succeeded - proceed to payment
        console.log('[CART] Verification successful - proceeding to payment');
        setIsVerifying(false);

        const paymentState = {
          order_type: 'pre-order',
          scheduled_for: preOrderContext.scheduled_for,
          customer_notes: customerNotes
        };

        if (preOrderContext.reservation_intent) {
          paymentState.reservation_intent = preOrderContext.reservation_intent;
        } else if (preOrderContext.reservation_id) {
          paymentState.reservation_id = preOrderContext.reservation_id;
        }

        navigate('/payment', { state: paymentState });

      } catch (error) {
        console.error('[CART] Verification request failed:', error);
        setVerificationError({
          message: 'Unable to verify reservation. Please check your internet connection and try again.',
          action: 'Try Again'
        });
        setIsVerifying(false);
      }

    } else if (orderContext?.orderType === 'takeout' || orderingMode === 'takeout') {
      // Takeout order
      console.log('[CART] Takeout order - proceeding to payment');
      navigate('/payment', {
        state: {
          order_type: 'takeout',
          restaurant_id: orderContext?.restaurantId,
          customer_notes: customerNotes
        }
      });
    } else {
      // Regular dine-in order - no verification needed
      console.log('[CART] Dine-in order - proceeding directly to payment');
      const effectiveTableId = tableId || orderContext?.tableNumber;
      navigate('/payment', {
        state: {
          table_id: effectiveTableId ? parseInt(effectiveTableId, 10) : null,
          order_type: 'dine-in',
          customer_notes: customerNotes
        }
      });
    }
  };

  // Empty cart state
  if (cart.length === 0) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#000000] flex items-center justify-center p-4">
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

        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dark-surface relative z-10">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Your Cart is Empty</h2>
          <p className="text-text-secondary mb-6">
            Add some delicious items from our menu to get started!
          </p>
          <button
            onClick={handleBrowseMenu}
            className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition-all shadow-lg hover:shadow-brand-orange/30"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] pt-24 px-4 pb-32">
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

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-white/10 transition text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">Your Cart</h1>
              <p className="text-sm text-white/70">Table #{tableId}</p>
            </div>
          </div >
          {
            cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm hover:bg-white/10 rounded-xl px-4 py-2 transition-all font-semibold text-white/80 hover:text-white border border-white/10"
              >
                Clear All
              </button>
            )
          }
        </div >

        {/* Cart Items */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-6 shadow-xl">
          <div className="p-2 border-b border-white/10 mb-4">
            <h2 className="text-xl font-bold text-white drop-shadow-md">
              Cart Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
          </div>

          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="glass-card rounded-2xl p-5 transition-all shadow-lg group relative overflow-hidden">
                {/* Decorative accent - using hex to ensure visibility */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FA6C01] z-20"></div>
                {/* Item Details */}
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-black/30 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 3h14a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v10h14V5H3z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg mb-1 drop-shadow-sm">{item.name}</h3>
                    <p className="text-sm text-brand-lime font-bold mb-3 drop-shadow-sm">
                      ${item.price.toFixed(2)} each
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center border border-white/20 rounded-xl bg-black/40 overflow-hidden shadow-inner">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="px-4 py-2 text-white hover:bg-brand-orange hover:text-white transition-all active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                          className="w-14 text-center bg-transparent text-white border-x border-white/10 py-2 focus:outline-none font-bold"
                        />

                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="px-4 py-2 text-white hover:bg-brand-lime hover:text-dark-bg transition-all active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      <span className="text-sm text-gray-300 font-medium">
                        = <span className="font-bold text-brand-orange text-lg drop-shadow-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      </span>
                    </div>

                    {/* Special Instructions */}
                    {item.special_instructions && (
                      <div className="mt-2 text-sm text-gray-300 italic bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                        Note: {item.special_instructions}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl p-2 transition-all h-fit backdrop-blur-sm"
                    aria-label="Remove item"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div >

        {/* Special Instructions for Order */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-6 shadow-xl">
          <label className="block text-sm font-bold text-white mb-3 drop-shadow-sm">
            Special Instructions (Optional)
          </label>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Any special requests for your order? (e.g., 'No onions', 'Extra spicy', etc.)"
            rows="3"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent resize-none shadow-inner backdrop-blur-sm"
            maxLength={500}
          />
          <div className="text-xs text-gray-400 mt-2 text-right">
            {customerNotes.length}/500 characters
          </div>
        </div >

        {/* Verification Error Display */}
        {
          verificationError && (
            <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl shadow-xl p-6 mb-6 animate-shake backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v1m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-['Playfair_Display'] font-bold text-red-400 mb-2" style={{ fontSize: '20px' }}>{verificationError.title}</h3>
                  <p className="text-gray-200 font-['Lora'] mb-4" style={{ fontSize: '17px' }}>{verificationError.message}</p>
                  <div className="flex gap-3 flex-wrap">
                    {verificationError.action === 'Make New Reservation' && (
                      <button
                        onClick={() => {
                          clearCart();
                          navigate('/restaurants');
                        }}
                        className="bg-red-500 text-white px-6 py-3 rounded-xl font-['Lora'] font-semibold hover:bg-red-600 transition-all shadow-lg"
                        style={{ fontSize: '17px' }}
                      >
                        {verificationError.action}
                      </button>
                    )}
                    {verificationError.action === 'Clear Cart' && (
                      <button
                        onClick={() => {
                          clearCart();
                          navigate('/restaurants');
                        }}
                        className="bg-red-500 text-white px-6 py-3 rounded-xl font-['Lora'] font-semibold hover:bg-red-600 transition-all shadow-lg"
                        style={{ fontSize: '17px' }}
                      >
                        {verificationError.action}
                      </button>
                    )}
                    {verificationError.action === 'Try Again' && (
                      <button
                        onClick={() => setVerificationError(null)}
                        className="bg-red-500 text-white px-6 py-3 rounded-xl font-['Lora'] font-semibold hover:bg-red-600 transition-all shadow-lg"
                        style={{ fontSize: '17px' }}
                      >
                        {verificationError.action}
                      </button>
                    )}
                    <button
                      onClick={() => setVerificationError(null)}
                      className="text-gray-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Order Summary - Desktop */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 drop-shadow-md">Order Summary</h2>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-gray-300 text-lg">
              <span>Subtotal</span>
              <span className="font-semibold text-white">${cartSubtotal.toFixed(2)}</span>
            </div>
            {cartTax > 0 && (
              <div className="flex justify-between text-gray-300 text-lg">
                <span>Tax</span>
                <span className="font-semibold text-white">${cartTax.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-4 flex justify-between text-2xl font-bold">
              <span className="text-white">Total</span>
              <span className="text-brand-lime drop-shadow-lg">${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isVerifying || !!verificationError}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 hover:-translate-y-1 pulse-lime disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-lime disabled:hover:translate-y-0 flex items-center justify-center gap-2 border border-brand-lime"
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying Reservation...
              </>
            ) : (
              'Proceed to Checkout'
            )}
          </button>
        </div>
      </div >

      {/* Fixed Bottom Bar - Mobile */}
      < div className="md:hidden fixed bottom-20 left-0 right-0 glass-panel backdrop-blur-xl shadow-2xl border-t border-white/10 z-20 rounded-t-3xl" >
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-300 font-semibold">Total</span>
            <span className="text-2xl font-bold text-brand-lime drop-shadow-md">${cartTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isVerifying || !!verificationError}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-lime flex items-center justify-center gap-2 border border-brand-lime"
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : (
              'Proceed to Checkout'
            )}
          </button>
        </div>
      </div >
    </div >
  );
};

export default CartPage;
