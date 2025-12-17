import { useEffect, useState } from 'react';
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

  // Construct image URL or use placeholder
  const imageUrl = restaurant.cover_image_url
    ? (restaurant.cover_image_url.startsWith('http') ? restaurant.cover_image_url : `${API_URL}${restaurant.cover_image_url}`)
    : null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] pt-20">
      {/* BACKGROUND GRADIENT */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
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

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/restaurants')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-white"
            title="Back to Restaurants"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="text-text-secondary text-sm uppercase tracking-wider font-bold">Back to List</span>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-xl">

          {/* Hero Image with Text Overlay */}
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={restaurant.name}
                className="w-full h-60 object-cover object-center"
              />
            ) : (
              <div className="w-full h-60 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
            )}


            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Text overlay on image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-4xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                {restaurant.name}
              </h1>
              <p className="text-white/95 mt-2 text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-semibold">
                {restaurant.cuisine_type}
              </p>
              {restaurant.address && (
                <p className="text-white/90 mt-1 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {restaurant.address}
                </p>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            {restaurant.description && (
              <p className="text-text-primary/90 text-lg mb-6 leading-relaxed">
                {restaurant.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  navigate(`/restaurant/${id}/menu`, {
                    state: {
                      orderType: 'browse',
                      restaurantId: id
                    }
                  })
                }
                className="bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90 shadow-lg"
              >
                View Menu
              </button>
              <button
                onClick={() =>
                  navigate(`/restaurant/${id}/menu`, {
                    state: {
                      orderType: 'takeout',
                      restaurantId: id
                    }
                  })
                }
                className="bg-dark-surface text-text-primary px-6 py-3 rounded-full font-bold border border-dark-surface hover:border-brand-lime/70"
              >
                Order Takeout
              </button>
              <button
                onClick={() => navigate(`/restaurant/${id}/reserve`)}
                className="bg-brand-orange text-white px-6 py-3 rounded-full font-bold hover:bg-brand-orange/90 shadow-lg"
              >
                Reserve a Table
              </button>
            </div>

            {menuPreview.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                  Popular Items
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuPreview.map((item) => (
                    <div
                      key={item.id}
                      className="
                      bg-white/10
                      backdrop-blur-xl
                      border border-white/20
                      rounded-2xl
                      p-4
                      shadow-sm shadow-black/30
                      hover:bg-white/15
                      hover:border-brand-lime/40
                      transition-all
                    "
                    >

                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-text-primary">{item.name}</h3>
                        <span className="text-brand-lime font-bold text-lg">${Number(item.price).toFixed(2)}</span>
                      </div>
                      <p className="text-text-primary/80 text-sm mt-2 line-clamp-2">{item.description}</p>
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
