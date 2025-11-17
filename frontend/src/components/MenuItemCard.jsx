import { useState } from 'react';

/**
 * MenuItemCard Component
 * Displays a single menu item with image, details, and add to cart button
 * Updated to match Team Vision dark theme design
 */
const MenuItemCard = ({ item, onAddToCart }) => {
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Handle add to cart with animation
  const handleAddToCart = async () => {
    setIsAdding(true);

    if (onAddToCart) {
      await onAddToCart(item);
    }

    // Reset animation after delay
    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  // Truncate description to specified length
  const truncateDescription = (text, maxLength = 80) => {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Default fallback image with dark theme
  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%233A3A3A" width="400" height="300"/%3E%3Ctext fill="%23736262" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E' + encodeURIComponent(item.name) + '%3C/text%3E%3C/svg%3E';

  return (
    <div className="bg-dark-card rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-brand-orange/20 transition-all duration-300 transform hover:-translate-y-1 border border-dark-surface">
      {/* Image Section */}
      <div className="relative h-48 bg-dark-surface overflow-hidden group">
        <img
          src={imageError ? fallbackImage : (item.image_url || fallbackImage)}
          alt={item.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Unavailable Overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-[#ef4444] text-white px-4 py-2 rounded-lg font-['Lora'] font-semibold shadow-lg" style={{ fontSize: '17px' }}>
              Unavailable
            </span>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 right-3 bg-brand-orange/90 backdrop-blur-sm px-3 py-1 rounded-full font-['Lora'] font-bold text-white shadow-lg" style={{ fontSize: '12px' }}>
          {item.category}
        </div>

        {/* Price Badge (top left) */}
        <div className="absolute top-3 left-3 bg-dark-surface/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-lg font-bold text-brand-lime">
            ${parseFloat(item.price).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Name */}
        <h3 className="font-['Playfair_Display'] font-bold text-text-primary mb-2 line-clamp-2" style={{ fontSize: '20px' }}>
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-text-secondary font-['Lora'] mb-4 min-h-[3rem] line-clamp-3" style={{ fontSize: '14px' }}>
          {truncateDescription(item.description)}
        </p>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={!item.available || isAdding}
          className={`w-full py-3 px-4 rounded-xl font-['Lora'] font-bold transition-all duration-300 ${
            !item.available
              ? 'bg-dark-surface text-text-secondary cursor-not-allowed'
              : isAdding
              ? 'bg-brand-lime text-dark-bg scale-95'
              : 'bg-brand-lime text-dark-bg hover:bg-brand-lime/90 hover:shadow-lg hover:shadow-brand-lime/30 active:scale-95'
          }`}
          style={{ fontSize: '17px' }}
        >
          {isAdding ? (
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
              Adding...
            </span>
          ) : !item.available ? (
            'Unavailable'
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to Cart
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MenuItemCard;
