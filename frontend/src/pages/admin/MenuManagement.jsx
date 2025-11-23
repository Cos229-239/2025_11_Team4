import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [currentItem, setCurrentItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true,
    restaurant_id: ''
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch restaurants for dropdown
        const restRes = await fetch(`${API_URL}/api/restaurants`);
        const restData = await restRes.json();
        if (restData.success) {
          setRestaurants(restData.data);
          if (restData.data.length > 0) {
            setSelectedRestaurant(restData.data[0].id);
          }
        }
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch menu items when restaurant changes
  useEffect(() => {
    if (!selectedRestaurant) return;

    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API_URL}/api/restaurants/${selectedRestaurant}/menu`);
        const data = await res.json();
        if (data.success) setItems(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMenu();
  }, [selectedRestaurant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API_URL}/api/menu/${currentItem.id}`
        : `${API_URL}/api/menu`;

      const method = isEditing ? 'PUT' : 'POST';
      const body = {
        ...currentItem,
        restaurant_id: selectedRestaurant,
        price: parseFloat(currentItem.price)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        // Refresh list
        const menuRes = await fetch(`${API_URL}/api/restaurants/${selectedRestaurant}/menu`);
        const menuData = await menuRes.json();
        setItems(menuData.data);

        // Reset form
        setIsEditing(false);
        setCurrentItem({
          name: '', description: '', price: '', category: '', available: true, restaurant_id: ''
        });
      }
    } catch (err) {
      alert('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await fetch(`${API_URL}/api/menu/${id}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-[#000000] text-text-primary pt-20 relative overflow-hidden">
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

      {/* Header integrated into page flow */}
      <div className="container mx-auto px-6 mb-6 relative z-10">
        <div className="flex items-center gap-4 mb-2">
          <a
            href="/admin"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-white"
            title="Back to Dashboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Menu Management</h1>
        </div>
        <p className="text-sm opacity-90 ml-12 text-gray-300">
          Create and manage menu items
        </p>
      </div>

      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Restaurant Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-text-secondary mb-2">Select Restaurant</label>
          <select
            className="w-full md:w-1/3 px-4 py-3 bg-dark-card border border-dark-surface rounded-xl focus:ring-2 focus:ring-brand-orange focus:border-transparent text-text-primary shadow-sm"
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
          >
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-4">
            <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface shadow-xl sticky top-32">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-brand-orange">{isEditing ? '✏️' : '➕'}</span>
                {isEditing ? 'Edit Item' : 'Add New Item'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Item Name</label>
                  <input
                    required
                    placeholder="e.g. Truffle Burger"
                    className="w-full bg-dark-surface px-4 py-2 rounded-lg border border-dark-surface focus:ring-2 focus:ring-brand-orange outline-none transition"
                    value={currentItem.name}
                    onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                  <textarea
                    placeholder="Describe the dish..."
                    rows={3}
                    className="w-full bg-dark-surface px-4 py-2 rounded-lg border border-dark-surface focus:ring-2 focus:ring-brand-orange outline-none transition"
                    value={currentItem.description}
                    onChange={e => setCurrentItem({ ...currentItem, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Price ($)</label>
                    <input
                      type="number" step="0.01" required
                      placeholder="0.00"
                      className="w-full bg-dark-surface px-4 py-2 rounded-lg border border-dark-surface focus:ring-2 focus:ring-brand-orange outline-none transition"
                      value={currentItem.price}
                      onChange={e => setCurrentItem({ ...currentItem, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
                    <input
                      required
                      placeholder="e.g. Mains"
                      className="w-full bg-dark-surface px-4 py-2 rounded-lg border border-dark-surface focus:ring-2 focus:ring-brand-orange outline-none transition"
                      value={currentItem.category}
                      onChange={e => setCurrentItem({ ...currentItem, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-dark-surface/50 rounded-lg border border-dark-surface">
                  <input
                    type="checkbox"
                    id="available"
                    className="w-5 h-5 text-brand-orange rounded focus:ring-brand-orange bg-dark-surface border-gray-600"
                    checked={currentItem.available}
                    onChange={e => setCurrentItem({ ...currentItem, available: e.target.checked })}
                  />
                  <label htmlFor="available" className="font-medium cursor-pointer">Available for ordering</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition shadow-lg shadow-brand-orange/20"
                  >
                    {isEditing ? 'Update Item' : 'Create Item'}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setCurrentItem({ name: '', description: '', price: '', category: '', available: true });
                      }}
                      className="px-4 py-3 bg-dark-surface text-text-secondary rounded-xl font-bold hover:bg-dark-surface/80 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Menu Items <span className="text-text-secondary text-lg font-normal">({items.length})</span></h2>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 bg-dark-card rounded-2xl border border-dashed border-dark-surface">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="text-text-secondary">No menu items found.</p>
                <p className="text-sm text-text-secondary mt-1">Add your first item to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`bg-dark-card p-5 rounded-2xl border transition-all hover:shadow-lg group ${!item.available ? 'border-red-900/30 opacity-75' : 'border-dark-surface hover:border-brand-orange/30'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-text-primary">{item.name}</h3>
                          {!item.available && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full font-bold border border-red-500/20">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <p className="text-brand-lime font-bold font-mono">${Number(item.price).toFixed(2)}</p>
                      </div>
                      <span className="px-2 py-1 bg-dark-surface text-text-secondary text-xs rounded-lg font-medium border border-dark-surface">
                        {item.category}
                      </span>
                    </div>

                    <p className="text-text-secondary text-sm mb-4 line-clamp-2 h-10">
                      {item.description || <span className="italic opacity-50">No description provided</span>}
                    </p>

                    <div className="flex gap-2 pt-2 border-t border-dark-surface">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setCurrentItem(item);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 py-2 rounded-lg bg-dark-surface text-blue-400 font-medium hover:bg-blue-500/10 transition text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 py-2 rounded-lg bg-dark-surface text-red-400 font-medium hover:bg-red-500/10 transition text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;