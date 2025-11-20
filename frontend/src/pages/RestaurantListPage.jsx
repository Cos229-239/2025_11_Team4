import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Logo from '../components/Logo';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * RestaurantListPage Component
 * Browse restaurants for delivery/takeout with search and filters
 * Team Vision Design with mock data
 */
const RestaurantListPage = () => {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [restaurantsApi, setRestaurantsApi] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [coords, setCoords] = useState(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  // Load restaurants from API
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        let url = `${API_URL}/api/restaurants`;
        const params = new URLSearchParams();
        if (coords && nearbyOnly) {
          params.set('lat', coords.lat);
          params.set('lng', coords.lng);
          params.set('radius_km', '25');
        }
        const qs = params.toString();
        if (qs) url += `?${qs}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setRestaurantsApi(data.data);
        }
      } catch (e) {
        // ignore, fallback to mock
      } finally {
        setApiLoaded(true);
      }
    };
    fetchRestaurants();
  }, [coords, nearbyOnly]);

  // Mock restaurant data
  const mockRestaurants = [
    {
      id: 0,
      name: "OrderEasy Restaurant",
      description: "Your favorite local spot with fresh, made-to-order dishes",
      cuisine: "American",
      rating: 4.8,
      deliveryTime: "15-25 min",
      distance: "0.3 mi",
      image: "🍽️",
      source: "internal",
      priceRange: "$$",
      categories: ["American", "Burgers"]
    },
    {
      id: 1,
      name: "Pizza Paradise",
      description: "Authentic wood-fired pizza with fresh ingredients",
      cuisine: "Italian",
      rating: 4.6,
      deliveryTime: "25-35 min",
      distance: "1.2 mi",
      image: "🍕",
      source: "external",
      priceRange: "$$",
      categories: ["Pizza", "Italian"]
    },
    {
      id: 2,
      name: "Burger Empire",
      description: "Gourmet burgers and hand-cut fries",
      cuisine: "American",
      rating: 4.7,
      deliveryTime: "20-30 min",
      distance: "0.8 mi",
      image: "🍔",
      source: "external",
      priceRange: "$$$",
      categories: ["Burgers", "American"]
    },
    {
      id: 3,
      name: "Dragon Wok",
      description: "Traditional Chinese cuisine with modern twists",
      cuisine: "Chinese",
      rating: 4.5,
      deliveryTime: "30-40 min",
      distance: "1.5 mi",
      image: "🥡",
      source: "external",
      priceRange: "$$",
      categories: ["Asian", "Chinese"]
    },
    {
      id: 4,
      name: "Sushi Supreme",
      description: "Fresh sushi and Japanese specialties",
      cuisine: "Japanese",
      rating: 4.9,
      deliveryTime: "25-35 min",
      distance: "1.0 mi",
      image: "🍣",
      source: "external",
      priceRange: "$$$",
      categories: ["Asian", "Sushi"]
    },
    {
      id: 5,
      name: "Taco Fiesta",
      description: "Authentic Mexican street food and tacos",
      cuisine: "Mexican",
      rating: 4.4,
      deliveryTime: "20-30 min",
      distance: "0.9 mi",
      image: "🌮",
      source: "external",
      priceRange: "$",
      categories: ["Mexican"]
    },
    {
      id: 6,
      name: "Mediterranean Grill",
      description: "Fresh Mediterranean dishes and kebabs",
      cuisine: "Mediterranean",
      rating: 4.6,
      deliveryTime: "25-35 min",
      distance: "1.3 mi",
      image: "🥙",
      source: "external",
      priceRange: "$$",
      categories: ["Mediterranean"]
    },
    {
      id: 7,
      name: "Thai Spice",
      description: "Spicy and flavorful Thai classics",
      cuisine: "Thai",
      rating: 4.7,
      deliveryTime: "30-40 min",
      distance: "1.8 mi",
      image: "🍜",
      source: "external",
      priceRange: "$$",
      categories: ["Asian", "Thai"]
    }
  ];

  // Category options
  const categories = [
    'All',
    'American',
    'Asian',
    'Burgers',
    'Pizza',
    'Italian',
    'Mexican',
    'Mediterranean',
    'Sushi'
  ];

  // Filter restaurants based on search and category
  // Prefer live restaurants if loaded; map to existing shape expected by UI
  const restaurantsData = useMemo(() => {
    if (!apiLoaded || restaurantsApi.length === 0) return mockRestaurants;
    return restaurantsApi.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      cuisine: r.cuisine_type || 'Cuisine',
      rating: Number(r.rating || 0).toFixed(1),
      deliveryTime: '',
      distance: typeof r.distance_km === 'number' ? `${Number(r.distance_km).toFixed(1)} km` : '',
      image: '',
      source: 'external',
      priceRange: '$$'
    }));
  }, [apiLoaded, restaurantsApi]);

  const filteredRestaurants = useMemo(() => {
    let filtered = restaurantsData;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(query) ||
          (restaurant.cuisine || '').toLowerCase().includes(query) ||
          restaurant.description.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'All') {
      filtered = filtered.filter((restaurant) =>
        restaurant.cuisine === activeCategory
      );
    }

    return filtered;
  }, [searchQuery, activeCategory, restaurantsData]);

  /**
   * Handle restaurant card click
   */
  const handleRestaurantClick = (restaurant) => {
    navigate(`/restaurant/${restaurant.id}`);
  };

  /**
   * Render star rating
   */
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIconSolid key={`full-${i}`} className="w-4 h-4 text-brand-lime" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-4 h-4">
          <StarIcon className="absolute w-4 h-4 text-brand-lime" />
          <div className="absolute overflow-hidden w-2">
            <StarIconSolid className="w-4 h-4 text-brand-lime" />
          </div>
        </div>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="w-4 h-4 text-text-secondary" />
      );
    }

    return stars;
  };

  return (
    
    <div
  className="min-h-screen relative overflow-hidden pb-8 bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage: "url('/src/assets/backround.png')"
  }}
>
  {/* Overlay so text can look better */}
  <div className="absolute inset-0 bg-black/40"></div>
      {/* Background glow */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-lime/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Header */}
      <header className="bg-black shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20 transition-colors flex items-center gap-2 px-3 py-2 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <Logo size="sm" />
            <div className="w-20"></div> {/* Spacer */}
          </div>

          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              Browse Restaurants
            </h1>
            <p className="text-white/90">
              {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search restaurants, cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full
                bg-dark-card
                text-text-primary
                border-2 border-dark-surface
                focus:border-brand-lime
                rounded-2xl
                pl-12 pr-6 py-4
                outline-none
                transition-colors
                text-lg
                placeholder:text-text-secondary
              "
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-brand-orange transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 min-w-max px-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`
                  px-6 py-3 rounded-full font-semibold text-sm
                  transition-all duration-200
                  whitespace-nowrap
                  ${
                    activeCategory === category
                      ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/30'
                      : 'bg-dark-card text-text-secondary hover:bg-dark-surface hover:text-text-primary border border-dark-surface'
                  }
                `}
              >
                {category}
              </button>
            ))}
            <button
              onClick={() => setNearbyOnly((v) => !v)}
              className={`px-6 py-3 rounded-full font-semibold text-sm transition-all whitespace-nowrap border ${
                nearbyOnly
                  ? 'bg-brand-orange text-white border-brand-orange shadow-lg shadow-brand-orange/30'
                  : 'bg-dark-card text-text-secondary hover:bg-dark-surface hover:text-text-primary border-dark-surface'
              }`}
              title={coords ? 'Filter within 25 km' : 'Enable location to filter nearby'}
            >
              Near Me
            </button>
          </div>
        </div>

        {/* Results Info */}
        {searchQuery && (
          <div className="mb-6">
            <p className="text-text-secondary text-center">
              Found {filteredRestaurants.length} result{filteredRestaurants.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          </div>
        )}

        {/* Restaurant Grid */}
        {filteredRestaurants.length === 0 ? (
          // Empty State
          <div className="max-w-2xl mx-auto bg-dark-card rounded-3xl p-12 text-center border border-dark-surface">
            <div className="text-7xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              No Restaurants Found
            </h3>
            <p className="text-text-secondary mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="bg-brand-lime text-dark-bg px-8 py-3 rounded-full font-bold hover:bg-brand-lime/90 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                onClick={() => handleRestaurantClick(restaurant)}
                className="
                  bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden
                  border border-dark-surface
                  hover:border-brand-lime/50
                  transition-all duration-300
                  transform hover:-translate-y-2
                  hover:shadow-2xl hover:shadow-brand-lime/20
                  cursor-pointer
                  group
                "
              >
                {/* Image Section */}
                <div className="bg-dark-surface h-48 flex items-center justify-center relative overflow-hidden">
                  <span className="text-8xl transform group-hover:scale-110 transition-transform duration-300">
                    {restaurant.image}
                  </span>

                  {/* Distance badge (when Near Me filter used) */}
                  {restaurant.distance && (
                    <div className="absolute top-3 left-3 bg-dark-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-text-primary">
                      {restaurant.distance}
                    </div>
                  )}

                  {/* Rating badge */}
                  <div className="absolute top-3 right-3 bg-dark-card/90 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-1">
                    <StarIconSolid className="w-4 h-4 text-brand-lime" />
                    <span className="text-text-primary font-semibold text-sm">
                      {restaurant.rating}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  {/* Name & Price Range */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-brand-lime transition-colors">
                      {restaurant.name}
                    </h3>
                    <span className="text-text-secondary font-semibold text-sm">
                      {restaurant.priceRange}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-text-secondary text-sm mb-3 line-clamp-2">
                    {restaurant.description}
                  </p>

                  {/* Cuisine Badge */}
                  <div className="mb-4">
                    <span className="inline-block bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full text-xs font-semibold">
                      {restaurant.cuisine}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{restaurant.deliveryTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{restaurant.distance}</span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestaurantClick(restaurant);
                    }}
                    className="
                      w-full
                      bg-brand-lime text-dark-bg
                      px-6 py-3 rounded-full
                      font-bold
                      hover:bg-brand-lime/90
                      transform group-hover:scale-105
                      transition-all duration-200
                      shadow-lg shadow-brand-lime/20
                    "
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Notice removed: now using live data */}
      </div>
    </div>
  );
};

export default RestaurantListPage;
