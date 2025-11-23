import React from 'react';

const sizeMap = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-4',
  lg: 'h-16 w-16 border-4',
};

const LoadingSpinner = ({ label = 'Loading...', size = 'lg', className = '' }) => {
  const sizeClasses = sizeMap[size] || sizeMap.lg;
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses} border-solid border-dark-surface border-b-brand-orange`}
      />
      {label && <p className="mt-3 text-text-secondary font-['Lora']" style={{ fontSize: '17px' }}>{label}</p>}
    </div>
  );
};

export default LoadingSpinner;
