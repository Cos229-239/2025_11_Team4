import React from 'react';

const ErrorMessage = ({ message = 'Something went wrong.', onRetry, className = '' }) => {
  return (
    <div className={`bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded ${className}`} role="alert">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zM9 5a1 1 0 112 0v5a1 1 0 11-2 0V5zm1 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
          </svg>
          <span className="block">{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 underline font-semibold text-red-400 hover:text-red-300"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;

