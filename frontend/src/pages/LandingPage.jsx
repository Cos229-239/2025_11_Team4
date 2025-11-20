import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import {
  QrCodeIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

/**
 * LandingPage Component
 * Team Vision Design - Clean, modern landing with two clear customer paths
 */
const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Subtle background glow effects */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-brand-lime/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-6xl w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8 transform hover:scale-105 transition-transform duration-300">
          <Logo size="xl" />
        </div>

        {/* Tagline */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-center mb-16 text-text-primary/90 italic leading-relaxed">
          Let's
          <br />
          <span className="font-normal not-italic text-text-primary">Dine without a whine</span>
        </h1>

        {/* Customer Option Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Card 1: Dine In */}
          <div className="bg-dark-card rounded-3xl p-8 sm:p-10 border border-dark-surface hover:border-brand-orange/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-orange/20 group">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-brand-orange/10 p-6 rounded-2xl group-hover:bg-brand-orange/20 transition-colors duration-300">
                <QrCodeIcon className="w-16 h-16 sm:w-20 sm:h-20 text-brand-orange" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-3">
              Dine In
            </h2>

            {/* Description */}
            <p className="text-text-secondary text-center mb-8 text-lg">
              Order from your table
            </p>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/qr-check')}
              className="
                w-full
                bg-brand-orange text-white
                px-8 py-4 rounded-full
                text-lg font-bold uppercase tracking-wide
                hover:bg-brand-orange/90
                transform hover:scale-105 active:scale-95
                transition-all duration-200
                shadow-xl shadow-brand-orange/30 hover:shadow-brand-orange/50
              "
            >
              Start Ordering
            </button>
          </div>

          {/* Card 2: Browse Restaurants */}
          <div className="bg-dark-card rounded-3xl p-8 sm:p-10 border border-dark-surface hover:border-brand-lime/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-lime/20 group">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-brand-lime/10 p-6 rounded-2xl group-hover:bg-brand-lime/20 transition-colors duration-300">
                <BuildingStorefrontIcon className="w-16 h-16 sm:w-20 sm:h-20 text-brand-lime" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-3">
              Browse Restaurants
            </h2>

            {/* Description */}
            <p className="text-text-secondary text-center mb-8 text-lg">
              Explore delivery & takeout
            </p>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/restaurants')}
              className="
                w-full
                bg-brand-lime text-dark-bg
                px-8 py-4 rounded-full
                text-lg font-bold uppercase tracking-wide
                hover:bg-brand-lime/90
                transform hover:scale-105 active:scale-95
                transition-all duration-200
                shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
              "
            >
              View Restaurants
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
