import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuItemCard from '../components/MenuItemCard';
import CategoryTabs from '../components/CategoryTabs';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * MenuPage Component
 * Browse and order from restaurant menu
 * Updated to match Team Vision dark theme design
 */
const MenuPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItemCount, cartTotal, setTableId, } = useCart();

  // State management
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set table ID in cart context (always run hooks, branch inside)
useEffect(() => {
  const n = Number(tableId);
  if (!Number.isNaN(n) && n > 0) {
    setTableId(n);
  }
}, [tableId, setTableId]);

// Parse once for reuse
const parsedTableId = Number(tableId);

// Unified fetcher (used by Retry button too)
const fetchMenuData = useCallback(async () => {
  // Don't fetch if tableId isn't valid
  if (!parsedTableId || Number.isNaN(parsedTableId)) return;

  try {
    setLoading(true);
    setError(null);

    // 1) Table → restaurant_id
    const tableRes = await fetch(`${API_URL}/api/tables/${parsedTableId}`);
    const tableData = await tableRes.json();
    if (!tableData.success || !tableData.data?.restaurant_id) {
      throw new Error('Failed to resolve restaurant for table');
    }
    const rid = tableData.data.restaurant_id;

    // 2) Menu
    const menuRes = await fetch(`${API_URL}/api/restaurants/${rid}/menu?available=true`);
    const menuData = await menuRes.json();
    if (!menuData.success) throw new Error('Failed to load menu items');
    setMenuItems(menuData.data || []);

    // 3) Categories (non-fatal)
    const catRes = await fetch(`${API_URL}/api/restaurants/${rid}/menu/categories`);
    const catData = await catRes.json();
    if (catData?.success) setCategories(catData.data || []);
  } catch (err) {
    console.error('Error fetching menu:', err);
    setError('Failed to load menu. Please try again.');
  } finally {
    setLoading(false);
  }
}, [parsedTableId]);

// Kick off the fetch on mount/when table changes
useEffect(() => {
  fetchMenuData();
}, [fetchMenuData]);


  // Filter menu items by category
  const filteredMenuItems = activeCategory
    ? menuItems.filter((item) => item.category === activeCategory)
    : menuItems;

  // Add item to cart using CartContext
  const handleAddToCart = (item) => {
    return new Promise((resolve) => {
      addToCart(item, 1);
      // Resolve after brief delay for animation
      setTimeout(resolve, 300);
    });
  };

  // Navigate to cart
  const goToCart = () => {
    navigate(`/cart/${tableId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSpinner label="Loading delicious menu..." />
      </div>
    );
  }

  // Error state
    if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dark-surface">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Oops!</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={fetchMenuData}
            className="bg-brand-orange text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-dark-bg pb-32">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-1">Browse Menu</h1>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                  Table #{tableId}
                </span>
                <span className="text-white/80 text-sm">
                  • {menuItems.length} items available
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20 rounded-xl px-3 py-3 transition-all"
              aria-label="Close menu"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Menu Items Grid */}
      <div className="container mx-auto px-4 pb-6">
        {/* Active Category Title */}
        {activeCategory && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-primary">{activeCategory}</h2>
            <p className="text-text-secondary">
              {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}

        {/* Empty State */}
        {filteredMenuItems.length === 0 ? (
          <div className="bg-dark-card rounded-2xl shadow-xl p-12 text-center border border-dark-surface">
            <div className="text-7xl mb-4">🍽️</div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              No Items Found
            </h3>
            <p className="text-text-secondary mb-6">
              {activeCategory
                ? `No items available in ${activeCategory} category`
                : 'No menu items available at the moment'}
            </p>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition-all shadow-lg"
              >
                View All Items
              </button>
            )}
          </div>
        ) : (
          /* Menu Items Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMenuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fixed Cart Button - Only show if items in cart */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-dark-surface/95 backdrop-blur-lg shadow-2xl border-t border-dark-card z-30">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={goToCart}
              className="w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-between bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-lg hover:shadow-brand-lime/30 active:scale-98"
            >
              <span className="flex items-center">
                <svg
                  className="w-6 h-6 mr-2"
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
                View Cart
                <span className="ml-3 bg-dark-bg text-brand-lime px-3 py-1 rounded-full text-sm font-bold">
                  {cartItemCount}
                </span>
              </span>
              <span className="text-xl font-bold">
                ${cartTotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;



