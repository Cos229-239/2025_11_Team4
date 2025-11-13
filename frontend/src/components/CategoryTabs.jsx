import React, { useState, useRef, useEffect } from 'react';

/**
 * CategoryTabs Component
 * Displays category filters as tabs with horizontal scrolling
 * Updated to match Team Vision dark theme design
 */
const CategoryTabs = ({ categories, activeCategory, onCategoryChange }) => {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef(null);

  // Check if scrolling is needed
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Scroll left
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  // Scroll right
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Check scroll buttons on mount and resize
  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [categories]);

  return (
    <div className="relative bg-dark-surface border-b border-dark-card sticky top-16 z-10 mb-6 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        {/* Scroll Left Button */}
        {showLeftArrow && (
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-dark-card shadow-lg rounded-full p-2 z-10 hover:bg-brand-orange hover:text-white transition-all border border-dark-surface"
            aria-label="Scroll left"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Categories Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* All Categories Tab */}
          <button
            onClick={() => onCategoryChange(null)}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all duration-200 ${
              activeCategory === null
                ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30 scale-105'
                : 'bg-dark-card text-text-secondary hover:bg-dark-card/60 hover:text-brand-orange border border-dark-surface'
            }`}
          >
            All Items
          </button>

          {/* Individual Category Tabs */}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all duration-200 ${
                activeCategory === category
                  ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/30 scale-105'
                  : 'bg-dark-card text-text-secondary hover:bg-dark-card/60 hover:text-brand-lime border border-dark-surface'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Scroll Right Button */}
        {showRightArrow && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-dark-card shadow-lg rounded-full p-2 z-10 hover:bg-brand-orange hover:text-white transition-all border border-dark-surface"
            aria-label="Scroll right"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CategoryTabs;
