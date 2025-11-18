import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MenuItemCard from '../components/MenuItemCard';
import CategoryTabs from '../components/CategoryTabs';
import { useCart } from '../context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5020';

const RestaurantMenuPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

    const filtered =
    activeCategory && activeCategory !== 'All Items'
      ? menuItems.filter((m) => m.category === activeCategory)
      : menuItems;


  const handleAdd = async (item) => {
    addToCart(item, 1);
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">Loading...</div>;
  if (error) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      <header className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white shadow-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Menu</h1>
          <button onClick={() => navigate(-1)} className="hover:bg-white/20 px-3 py-2 rounded-lg">Back</button>
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
        <div className="text-center text-text-secondary mt-6 text-sm">You can select a table on checkout.</div>
      </div>
    </div>
  );
};

export default RestaurantMenuPage;

