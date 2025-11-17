import React from 'react';

const ErrorMessage = ({ message = 'Something went wrong.', onRetry, className = '' }) => {
  return (
    <div className={`bg-[rgb(239_68_68_/_.1)] border border-[rgb(239_68_68_/_.2)] text-[#ef4444] px-4 py-3 rounded ${className}`} role="alert">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 text-[rgb(var(--color-status-danger))]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zM9 5a1 1 0 112 0v5a1 1 0 11-2 0V5zm1 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
          </svg>
          <span className="block font-['Lora']" style={{ fontSize: '14px' }}>{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 underline font-semibold text-[#ef4444] hover:opacity-80 font-['Lora']"
            style={{ fontSize: '14px' }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;

