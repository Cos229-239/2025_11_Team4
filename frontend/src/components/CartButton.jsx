import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';

/**
 * CartButton Component
 * Floating cart button with item count badge
 * Shows in bottom-right corner on mobile, can be customized for desktop
 */
const CartButton = ({ position = 'bottom-right', className = '' }) => {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { cartItemCount, cartTotal } = useCart();

  // Don't show button if no items in cart or if we're already on cart page
  const isCartPage = window.location.pathname.includes('/cart');

  if (cartItemCount === 0 || isCartPage) {
    return null;
  }

  // Handle navigation to cart
  const handleClick = () => {
    if (tableId) {
      navigate(`/cart/${tableId}`);
    } else {
      // If no tableId in URL, check if we have one in context/storage
      const storedTableId = sessionStorage.getItem('ordereasy_table_id');
      if (storedTableId) {
        navigate(`/cart/${storedTableId}`);
      } else {
        // Fallback to a default or prompt user
        navigate('/cart/0');
      }
    }
  };

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 md:bottom-6 md:right-6',
    'bottom-left': 'bottom-20 left-4 md:bottom-6 md:left-6',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2 md:bottom-6',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        fixed ${positionClasses[position] || positionClasses['bottom-right']}
        z-50
        bg-brand-lime text-white
        rounded-full shadow-lg
        hover:shadow-xl hover:scale-105
        active:scale-95
        transition-all duration-200
        flex items-center justify-center
        ${className}
      `}
      aria-label={`View cart with ${cartItemCount} items`}
    >
      {/* Mobile: Icon only */}
      <div className="md:hidden w-16 h-16 flex items-center justify-center relative">
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        {/* Badge */}
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
            {cartItemCount > 99 ? '99+' : cartItemCount}
          </span>
        )}
      </div>

      {/* Desktop: Icon + Text + Total */}
      <div className="hidden md:flex items-center gap-3 px-5 py-3">
        <div className="relative">
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
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>

          {/* Badge */}
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 border-2 border-white">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </div>

        <div className="flex flex-col items-start">
          <span className="text-xs opacity-90">View Cart</span>
          <span className="text-sm font-bold">${cartTotal.toFixed(2)}</span>
        </div>
      </div>
    </button>
  );
};

export default CartButton;
