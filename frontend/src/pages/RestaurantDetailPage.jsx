import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

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

            {/* Rating Badge (Top Right) */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1 border border-white/10">
              <StarIconSolid className="w-4 h-4 text-brand-lime" />
              <span className="text-white font-bold">{Number(restaurant.rating || 0).toFixed(1)}</span>
            </div>

            {/* Text overlay on image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-4xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                {restaurant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <p className="text-white/95 text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-semibold bg-brand-orange/20 px-3 py-0.5 rounded-full backdrop-blur-sm border border-brand-orange/30">
                  {restaurant.cuisine_type}
                </p>
              </div>

              {restaurant.address && (
                <div className="flex items-center gap-2 mt-3 text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <MapPinIcon className="w-5 h-5 text-brand-lime" />
                  <p className="text-sm font-medium">{restaurant.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Left Column: Description & Actions */}
              <div className="lg:col-span-2 space-y-6">
                {restaurant.description && (
                  <p className="text-text-primary/90 text-lg leading-relaxed">
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
              </div>

              {/* Right Column: Info Card */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4 h-fit">
                <h3 className="text-xl font-bold text-white mb-2">Information</h3>

                {/* Contact */}
                <div className="space-y-3">
                  {restaurant.phone && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <PhoneIcon className="w-5 h-5 text-brand-lime" />
                      <span>{restaurant.phone}</span>
                    </div>
                  )}
                  {restaurant.email && (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <EnvelopeIcon className="w-5 h-5 text-brand-lime" />
                      <span className="break-all">{restaurant.email}</span>
                    </div>
                  )}
                </div>

                <hr className="border-white/10 my-4" />

                {/* Hours */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-white">
                    <ClockIcon className="w-5 h-5 text-brand-lime" />
                    <span className="font-bold">Opening Hours</span>
                  </div>
                  <div className="space-y-1 text-sm text-text-secondary">
                    {restaurant.opening_hours ? (
                      // Handle both object (Days) and simple text formats if needed. 
                      // Assuming standard JSON object { "Monday": "10:00-22:00", ... }
                      typeof restaurant.opening_hours === 'object' ? (
                        Object.entries(restaurant.opening_hours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}</span>
                            <span className="text-white/90">{hours}</span>
                          </div>
                        ))
                      ) : (
                        <span>{String(restaurant.opening_hours)}</span>
                      )
                    ) : (
                      <span className="italic opacity-60">Hours not available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {menuPreview.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10">
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
