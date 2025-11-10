import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    updateSpecialInstructions,
    clearCart,
    cartSubtotal,
    cartTax,
    cartTotal,
    setTableId,
  } = useCart();

  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectTable, setSelectTable] = useState('');

  // Set table ID in context when component mounts
  useEffect(() => {
    if (tableId) {
      setTableId(tableId);
    }
  }, [tableId, setTableId]);

  // If no table selected in the URL, prompt user to select table
  if (!tableId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dark-surface">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Select Your Table</h2>
          <p className="text-text-secondary mb-6">Enter your table number to continue</p>

          <input
            type="number"
            min="1"
            value={selectTable}
            onChange={(e) => setSelectTable(e.target.value)}
            placeholder="e.g., 4"
            className="w-full bg-dark-surface border border-dark-surface rounded-xl p-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent mb-4"
          />

          <button
            onClick={() => {
              const num = parseInt(selectTable);
              if (!isNaN(num) && num > 0) {
                navigate(`/cart/${num}`);
              }
            }}
            className="w-full bg-brand-lime text-dark-bg px-8 py-3 rounded-xl font-bold hover:bg-brand-lime/90 transition-all"
          >
            Continue
          </button>

          <button
            onClick={() => navigate('/')}
            className="mt-4 text-text-secondary hover:text-brand-orange transition-colors text-sm underline decoration-dotted underline-offset-4"
          >
            Back to Home
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

  // Handle place order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare order data
      const orderData = {
        table_id: parseInt(tableId),
        customer_notes: customerNotes,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          special_instructions: item.special_instructions || '',
        })),
      };

      // Submit order to API
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Order successful - clear cart and navigate to confirmation
      clearCart();
      navigate(`/confirmation/${data.data.id}`);
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                onClick={() => navigate(`/menu/${tableId}`)}
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
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl p-2 transition-all h-fit"
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
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
              isSubmitting
                ? 'bg-dark-surface text-text-secondary cursor-not-allowed'
                : 'bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime'
            }`}
          >
            {isSubmitting ? (
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
                Placing Order...
              </span>
            ) : (
              'Place Order'
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
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
              isSubmitting
                ? 'bg-dark-card text-text-secondary cursor-not-allowed'
                : 'bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-brand-lime/30 pulse-lime'
            }`}
          >
            {isSubmitting ? (
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
                Placing Order...
              </span>
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
