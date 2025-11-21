import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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
    }
  }, [tableId, setTableId, preOrderContext, orderContext]);

  // If no table selected in the URL and no pre-order context, ask if they're at restaurant or planning ahead
  if (!tableId && !orderingMode && !preOrderContext) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-lg w-full border border-dark-surface">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">How would you like to order?</h2>
            <p className="text-text-secondary">Choose your dining option to continue</p>
          </div>

          <div className="space-y-4">
            {/* Dine-In Option */}
            <button
              onClick={() => navigate('/scan-qr')}
              className="w-full bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white p-6 rounded-xl hover:shadow-xl hover:shadow-brand-orange/30 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">I'm at the Restaurant</h3>
                  <p className="text-sm opacity-90">Scan the QR code on your table to start</p>
                </div>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Reservation Option */}
            <button
              onClick={() => setOrderingMode('reservation')}
              className="w-full bg-dark-surface border-2 border-dark-surface hover:border-brand-lime text-text-primary p-6 rounded-xl hover:shadow-xl transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-lime/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Planning Ahead</h3>
                  <p className="text-sm text-text-secondary">Make a reservation and pre-order your meal</p>
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
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
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
          title: 'Connection Error',
          message: 'Unable to verify reservation. Please check your internet connection and try again.',
          action: 'Try Again'
        });
        setIsVerifying(false);
      }

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
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dark-surface">
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
    <div className="min-h-screen bg-dark-bg pb-32">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-lime to-brand-lime/80 text-dark-bg shadow-xl sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (preOrderContext?.reservation_intent || preOrderContext?.reservation_id) {
                    navigate('/restaurants');
                  } else if (orderContext?.restaurantId) {
                    navigate(`/restaurant/${orderContext.restaurantId}/menu`, {
                      state: orderContext
                    });
                  } else {
                    navigate('/restaurants');
                  }
                }}
                className="hover:bg-dark-bg/10 rounded-xl p-2 transition-all"
                aria-label="Back to menu"
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
                <h1 className="text-2xl font-bold">Your Cart</h1>
                <p className="text-sm opacity-80">Table #{tableId}</p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm hover:bg-dark-bg/10 rounded-xl px-3 py-2 transition-all font-semibold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Cart Items */}
        <div className="bg-dark-card rounded-2xl shadow-xl mb-6 border border-dark-surface">
          <div className="p-5 border-b border-dark-surface">
            <h2 className="text-lg font-bold text-text-primary">
              Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
          </div>

          <div className="divide-y divide-dark-surface">
            {cart.map((item) => (
              <div key={item.id} className="p-5 hover:bg-dark-surface/50 transition-colors">
                {/* Item Details */}
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-dark-surface rounded-xl overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-secondary">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 3h14a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v10h14V5H3z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary text-lg mb-1">{item.name}</h3>
                    <p className="text-sm text-brand-lime font-semibold mb-3">
                      ${item.price.toFixed(2)} each
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center border border-dark-surface rounded-xl bg-dark-surface overflow-hidden">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="px-4 py-2 hover:bg-brand-orange hover:text-white transition-all"
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
                          className="w-14 text-center bg-dark-surface text-text-primary border-x border-dark-card py-2 focus:outline-none font-bold"
                        />

                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="px-4 py-2 hover:bg-brand-lime hover:text-dark-bg transition-all"
                          aria-label="Increase quantity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      <span className="text-sm text-text-secondary">
                        = <span className="font-bold text-brand-orange">${(item.price * item.quantity).toFixed(2)}</span>
                      </span>
                    </div>

                    {/* Special Instructions */}
                    {item.special_instructions && (
                      <div className="mt-2 text-sm text-text-secondary italic bg-dark-surface/50 px-3 py-2 rounded-lg">
                        Note: {item.special_instructions}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-[#ef4444] hover:opacity-80 hover:bg-[rgb(239_68_68_/_.1)] rounded-xl p-2 transition-all h-fit"
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
        </div>

        {/* Special Instructions for Order */}
        <div className="bg-dark-card rounded-2xl shadow-xl p-5 mb-6 border border-dark-surface">
          <label className="block text-sm font-bold text-text-primary mb-3">
            Special Instructions (Optional)
          </label>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Any special requests for your order? (e.g., 'No onions', 'Extra spicy', etc.)"
            rows="3"
            className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent resize-none"
            maxLength={500}
          />
          <div className="text-xs text-text-secondary mt-2 text-right">
            {customerNotes.length}/500 characters
          </div>
        </div>

        {/* Verification Error Display */}
        {verificationError && (
          <div className="bg-[rgb(239_68_68_/_.1)] border-2 border-[#ef4444] rounded-2xl shadow-xl p-6 mb-6 animate-shake">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[rgb(239_68_68_/_.2)] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-['Playfair_Display'] font-bold text-[#ef4444] mb-2" style={{ fontSize: '20px' }}>{verificationError.title}</h3>
                <p className="text-text-secondary font-['Lora'] mb-4" style={{ fontSize: '17px' }}>{verificationError.message}</p>
                <div className="flex gap-3">
                  {verificationError.action === 'Make New Reservation' && (
                    <button
                      onClick={() => {
                        clearCart();
                        navigate('/restaurants');
                      }}
                      className="bg-[#ef4444] text-white px-6 py-3 rounded-xl font-['Lora'] font-semibold hover:opacity-90 transition-all"
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
                      className="bg-[#ef4444] text-white px-6 py-3 rounded-xl font-['Lora'] font-semibold hover:opacity-90 transition-all"
                      style={{ fontSize: '17px' }}
                    >
                      {verificationError.action}
                    </button>
                  )}
                  {verificationError.action === 'Try Again' && (
                    <button
                      onClick={() => setVerificationError(null)}
                      className="bg-[#ef4444] text-white px-6 py-3 rounded-xl font-['Lora'] font-semibold hover:opacity-90 transition-all"
                      style={{ fontSize: '17px' }}
                    >
                      {verificationError.action}
                    </button>
                  )}
                  <button
                    onClick={() => setVerificationError(null)}
                    className="text-text-secondary hover:text-text-primary px-4 py-2 rounded-xl hover:bg-dark-surface transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary - Desktop */}
        <div className="hidden md:block bg-dark-card rounded-2xl shadow-xl p-6 border border-dark-surface">
          <h2 className="text-lg font-bold text-text-primary mb-4">Order Summary</h2>

          <div className="space-y-3 mb-6">
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
            <div className="border-t border-dark-surface pt-3 flex justify-between text-xl font-bold">
              <span className="text-text-primary">Total</span>
              <span className="text-brand-lime">${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isVerifying || !!verificationError}
            className="w-full py-4 rounded-xl font-bold transition-all shadow-lg bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-lime flex items-center justify-center gap-2"
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
      </div>

      {/* Fixed Bottom Bar - Mobile */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 bg-dark-surface/95 backdrop-blur-lg shadow-2xl border-t border-dark-card z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-text-secondary font-semibold">Total</span>
            <span className="text-2xl font-bold text-brand-lime">${cartTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isVerifying || !!verificationError}
            className="w-full py-4 rounded-xl font-bold transition-all shadow-lg bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-lime flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
};

export default CartPage;
