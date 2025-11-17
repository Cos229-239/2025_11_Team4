import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MenuItemCard from '../components/MenuItemCard';
import CategoryTabs from '../components/CategoryTabs';
import { useCart } from '../context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RestaurantMenuPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, setPreOrderContext, setOrderContext, cartItemCount, orderContext } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get order context from navigation state
  const stateContext = location.state || {};
  const {
    orderType = 'browse',
    tableNumber = null,
    reservationId = null,
    restaurantId = id
  } = stateContext;

  // Set order context when component mounts
  useEffect(() => {
    if (orderType && !orderContext.orderType) {
      setOrderContext({
        orderType,
        restaurantId,
        tableNumber,
        reservationId
      });
    }
  }, [orderType, restaurantId, tableNumber, reservationId, orderContext.orderType, setOrderContext]);

  // Check if we're in pre-order mode from reservation confirmation / intent
  useEffect(() => {
    if (location.state?.preOrderContext) {
      const {
        reservation_id,
        reservation_intent,
        scheduled_for
      } = location.state.preOrderContext;

      // New intent-based flow
      if (reservation_intent && scheduled_for) {
        console.log('Setting pre-order context from intent:', {
          reservation_intent,
          scheduled_for
        });
        setPreOrderContext({
          reservation_intent,
          scheduled_for,
          restaurant_id: Number(restaurantId)
        });
      } else if (reservation_id && scheduled_for) {
        // Legacy reservation-id based flow
        console.log('Setting pre-order context:', {
          reservation_id,
          scheduled_for
        });
        setPreOrderContext({
          reservation_id,
          scheduled_for,
          restaurant_id: Number(restaurantId)
        });
      }
    }
  }, [location.state, setPreOrderContext]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_URL}/api/restaurants/${id}/menu`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load menu');
        setMenuItems(data.data || []);

        const resCat = await fetch(`${API_URL}/api/restaurants/${id}/menu/categories`);
        const dataCat = await resCat.json();
        if (dataCat.success) setCategories(dataCat.data || []);
      } catch (e) {
        setError(e.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const filtered = activeCategory ? menuItems.filter(m => m.category === activeCategory) : menuItems;

  const handleAdd = async (item) => {
    // Pass context when adding to cart
    addToCart(item, 1, '', {
      orderType,
      restaurantId,
      tableNumber,
      reservationId
    });
  };

  // Context-aware back navigation
  const handleBack = () => {
    if (orderType === 'dine-in' && tableNumber) {
      navigate(`/qr-check?restaurant=${restaurantId}&table=${tableNumber}`);
    } else if (orderType === 'reservation') {
      navigate(`/restaurant/${restaurantId}/reserve`);
    } else {
      navigate(-1);
    }
  };

  // Get context display text
  const getContextDisplay = () => {
    if (orderType === 'dine-in' && tableNumber) {
      return `Table ${tableNumber} Order`;
    } else if (orderType === 'reservation') {
      return 'Pre-Order for Reservation';
    } else if (orderType === 'takeout') {
      return 'Takeout Order';
    }
    return 'Browse Menu';
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">Loading...</div>;
  if (error) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      <header className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white shadow-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Menu</h1>
            <button onClick={handleBack} className="hover:bg-white/20 px-3 py-2 rounded-lg">Back</button>
          </div>
          <p className="text-sm opacity-90">{getContextDisplay()}</p>
        </div>
      </header>

      <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <div className="container mx-auto px-4">
        {filtered.length === 0 ? (
          <div className="text-center text-text-secondary py-12">No items found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <MenuItemCard key={item.id} item={item} onAddToCart={handleAdd} />
            ))}
          </div>
        )}

        {/* Cart button - floating */}
        {cartItemCount > 0 && (
          <div className="fixed bottom-20 right-4 z-50">
            <button
              onClick={() => navigate('/cart', { state: stateContext })}
              className="bg-brand-lime text-dark-bg px-6 py-4 rounded-full font-bold shadow-xl hover:shadow-brand-lime/50 transition-all flex items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Cart ({cartItemCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantMenuPage;

