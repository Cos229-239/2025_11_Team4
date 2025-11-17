import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LockClosedIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  BackspaceIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

/**
 * KitchenLoginPage Component
 * PIN authentication page for Kitchen Dashboard access
 * Features: 4-digit PIN input, number pad, Team Vision design
 */
const KitchenLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/kitchen';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  /**
   * Handle PIN input change
   */
  const handlePinChange = (value) => {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
      setError('');
    }
  };

  /**
   * Handle number pad button click
   */
  const handleNumberClick = (number) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);
      setError('');

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => handleSubmit(newPin), 100);
      }
    }
  };

  /**
   * Handle backspace
   */
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (pinToSubmit = pin) => {
    if (pinToSubmit.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate slight delay for better UX
    setTimeout(() => {
      const success = login(pinToSubmit);

      if (success) {
        // Navigate to kitchen dashboard
        const from = location.state?.from?.pathname || '/kitchen';
        navigate(from, { replace: true });
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
        setIsLoading(false);
      }
    }, 300);
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleSubmit();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (/^\d$/.test(e.key) && pin.length < 4) {
      handleNumberClick(e.key);
      e.preventDefault();
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-brand-lime/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 text-text-secondary hover:text-brand-orange transition-colors flex items-center gap-2 z-20"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Back</span>
      </button>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-brand-orange/10 p-6 rounded-3xl">
              <LockClosedIcon className="w-16 h-16 text-brand-orange" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Kitchen Access
          </h1>
          <p className="text-text-secondary text-lg">
            Enter your 4-digit PIN to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-card rounded-3xl p-8 border border-dark-surface shadow-2xl">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3">
              <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-500 font-semibold">Error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* PIN Display */}
          <div className="mb-8">
            <label className="block text-text-secondary text-sm mb-3 text-center">
              PIN Code
            </label>
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`
                    w-14 h-14 sm:w-16 sm:h-16
                    rounded-2xl
                    flex items-center justify-center
                    border-2
                    transition-all duration-200
                    ${
                      pin.length > index
                        ? 'border-brand-lime bg-brand-lime/10'
                        : 'border-dark-surface bg-dark-surface'
                    }
                  `}
                >
                  {pin.length > index ? (
                    <div className="w-3 h-3 rounded-full bg-brand-lime"></div>
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-text-secondary/30"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Input for Mobile Keyboards */}
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="4"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            onKeyDown={handleKeyPress}
            className="sr-only"
            autoFocus
            aria-label="PIN input"
          />

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
              <button
                key={number}
                onClick={() => handleNumberClick(number.toString())}
                disabled={isLoading}
                className="
                  bg-dark-surface
                  hover:bg-brand-orange hover:text-white
                  text-text-primary
                  text-2xl font-bold
                  py-4 rounded-xl
                  transition-all duration-200
                  transform hover:scale-105 active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border border-dark-card
                "
              >
                {number}
              </button>
            ))}

            {/* Empty Space */}
            <div></div>

            {/* Zero Button */}
            <button
              onClick={() => handleNumberClick('0')}
              disabled={isLoading}
              className="
                bg-dark-surface
                hover:bg-brand-orange hover:text-white
                text-text-primary
                text-2xl font-bold
                py-4 rounded-xl
                transition-all duration-200
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                border border-dark-card
              "
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              onClick={handleBackspace}
              disabled={isLoading || pin.length === 0}
              className="
                bg-dark-surface
                hover:bg-red-500 hover:text-white
                text-text-secondary
                py-4 rounded-xl
                transition-all duration-200
                transform hover:scale-105 active:scale-95
                disabled:opacity-30 disabled:cursor-not-allowed
                border border-dark-card
                flex items-center justify-center
              "
            >
              <BackspaceIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Enter Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={pin.length !== 4 || isLoading}
            className="
              w-full
              bg-brand-lime text-dark-bg
              px-8 py-4 rounded-full
              text-lg font-bold uppercase tracking-wide
              hover:bg-brand-lime/90
              disabled:opacity-50 disabled:cursor-not-allowed
              transform hover:scale-105 active:scale-95
              transition-all duration-200
              shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
              flex items-center justify-center gap-2
            "
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                Verifying...
              </>
            ) : (
              <>
                <LockClosedIcon className="w-5 h-5" />
                Enter
              </>
            )}
          </button>

          {/* Help Text */}
          <p className="text-text-secondary text-xs text-center mt-6">
            For demo purposes, the PIN is <span className="text-brand-lime font-semibold">1234</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KitchenLoginPage;
