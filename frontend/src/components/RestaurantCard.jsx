import React from 'react';

const RestaurantCard = ({ restaurant, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="text-left bg-dark-card rounded-2xl border border-dark-surface hover:border-brand-orange/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-orange/10 overflow-hidden"
    >
      {restaurant.cover_image_url ? (
        <img
          src={restaurant.cover_image_url.startsWith('http')
            ? restaurant.cover_image_url
            : `${import.meta.env.VITE_API_URL}${restaurant.cover_image_url}`}
          alt={restaurant.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-dark-surface" />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-text-primary line-clamp-2">
            {restaurant.name}
          </h3>
          <span className="flex items-center gap-1 text-brand-lime font-semibold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.036a1 1 0 00-1.175 0l-2.802 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {Number(restaurant.rating || 0).toFixed(1)}
          </span>
        </div>

        <p className="text-text-secondary text-sm mt-1">
          {restaurant.cuisine_type}
        </p>
        {restaurant.address && (
          <p className="text-text-secondary/80 text-xs mt-2 line-clamp-1">
            {restaurant.address}
          </p>
        )}
      </div>
    </button>
  );
};

export default RestaurantCard;

