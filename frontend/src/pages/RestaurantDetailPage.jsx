import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuPreview, setMenuPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_URL}/api/restaurants/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load restaurant');
        setRestaurant(data.data);

        const resMenu = await fetch(`${API_URL}/api/restaurants/${id}/menu?available=true`);
        const dataMenu = await resMenu.json();
        if (dataMenu.success) setMenuPreview((dataMenu.data || []).slice(0, 6));
      } catch (e) {
        setError(e.message || 'Failed to load restaurant');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-red-400">{error}</div>;
  }
  if (!restaurant) {
    return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-text-secondary">Not found</div>;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="container mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-brand-orange mb-4">← Back</button>

        <div className="bg-dark-card rounded-3xl border border-dark-surface overflow-hidden">
          {restaurant.image_url ? (
            <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-60 object-cover" />
          ) : (
            <div className="w-full h-60 bg-dark-surface" />
          )}

          <div className="p-6">
            <h1 className="text-3xl font-bold text-text-primary">{restaurant.name}</h1>
            <p className="text-text-secondary mt-2">{restaurant.cuisine_type}</p>
            {restaurant.address && <p className="text-text-secondary/80 mt-1 text-sm">{restaurant.address}</p>}
            {restaurant.description && <p className="text-text-secondary mt-4">{restaurant.description}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/restaurant/${id}/menu`)}
                className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90"
              >
                View Menu
              </button>
              <button
                onClick={() => navigate(`/reserve/${id}`)}
                className="bg-brand-orange text-white px-6 py-3 rounded-full font-bold hover:bg-brand-orange/90"
              >
                Reserve a Table
              </button>
            </div>

            {menuPreview.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-text-primary mb-4">Popular Items</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuPreview.map((item) => (
                    <div key={item.id} className="bg-dark-surface border border-dark-card rounded-2xl p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-text-primary">{item.name}</h3>
                        <span className="text-brand-lime font-bold">${Number(item.price).toFixed(2)}</span>
                      </div>
                      <p className="text-text-secondary text-sm mt-2 line-clamp-2">{item.description}</p>
                      {item.category && (
                        <span className="inline-block mt-3 bg-brand-orange/10 text-brand-orange text-xs px-3 py-1 rounded-full font-semibold">
                          {item.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;
