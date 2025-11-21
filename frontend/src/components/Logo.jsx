import React from 'react';

/**
 * OrderEasy Logo Component
 * Displays the OrderEasy brand with wine glass icon
 *
 * @param {string} size - Logo size: 'sm', 'md', 'lg', 'xl'
 * @param {string} variant - Logo variant: 'default', 'stacked'
 * @param {string} className - Additional CSS classes
 */
const Logo = ({ size = 'md', variant = 'default', className = '' }) => {
  // Size configurations
  const sizes = {
    sm: {
      text: 'text-xl',
      icon: 'w-6 h-6',
      gap: 'gap-1.5'
    },
    md: {
      text: 'text-2xl',
      icon: 'w-8 h-8',
      gap: 'gap-2'
    },
    lg: {
      text: 'text-4xl',
      icon: 'w-12 h-12',
      gap: 'gap-3'
    },
    xl: {
      text: 'text-6xl',
      icon: 'w-16 h-16',
      gap: 'gap-4'
    }
  };

  const sizeConfig = sizes[size] || sizes.md;

  // Wine glass SVG icon
  const WineGlassIcon = () => (
    <svg
      className={`${sizeConfig.icon} text-brand-orange`}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wine glass path */}
      <path d="M6 3V6C6 8.5 7 11 10 12.5V19H7V21H17V19H14V12.5C17 11 18 8.5 18 6V3H6ZM8 5H16V6C16 8 15.33 9.67 13 10.67V10.5C12.67 10.67 12.33 10.67 12 10.67C11.67 10.67 11.33 10.67 11 10.5V10.67C8.67 9.67 8 8 8 6V5Z" />
      {/* Base/stem */}
      <circle cx="12" cy="8" r="1" opacity="0.7" />
    </svg>
  );

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <WineGlassIcon />
        <div className={`flex flex-col items-center ${sizeConfig.text} font-bold leading-tight mt-2`}>
          <span className="text-brand-orange">Order</span>
          <span className="text-brand-lime">Easy</span>
        </div>
      </div>
    );
  }

  // Default horizontal layout
  return (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      <WineGlassIcon />
      <div className={`${sizeConfig.text} font-bold`}>
        <span className="text-brand-orange">Order</span>
        <span className="text-brand-lime font-bold">Easy</span>
      </div>
    </div>
  );
};

export default Logo;
