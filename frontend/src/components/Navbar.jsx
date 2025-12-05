import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useUserAuth } from '../hooks/useUserAuth';
import Logo from './Logo';

/**
 * Navbar Component
 * Mobile-friendly navigation with sticky scroll behavior
 * Updated to match Team Vision dark theme design
 */
const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItemCount } = useCart();
  const { token, user, logout } = useUserAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Track scroll to toggle glass effect and show/hide on direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);

      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
        setIsMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      // Always visible at the very top
      if (currentScrollY < 8) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleCartClick = () => {
    navigate('/cart');
  };

  // Don't show navbar on certain pages
  const hideNavbarPages = ['/kitchen', '/admin', '/admin/tables', '/scan-qr'];
  const shouldHide = hideNavbarPages.some(route => location.pathname.startsWith(route));
  if (shouldHide) {
    return null;
  }

  // Check if we're on a menu or cart page to show cart button
  const showCartButton = location.pathname.includes('/menu') || location.pathname.includes('/cart');

  return (
    <>
      <nav

  className={`fixed left-0 right-0 z-50 
    bg-white/10 backdrop-blur-xl 
    border-b border-white/20 
    transition-all duration-300
    ${isScrolled ? 'shadow-xl shadow-black/20' : ''}
    ${isVisible ? 'top-0' : '-top-20'}
  `}
>

        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="group transform hover:scale-105 transition-transform"
            >
              <Logo size="sm" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`font-medium transition-colors ${location.pathname === '/'
                  ? 'text-brand-orange'
                  : 'text-text-secondary hover:text-brand-orange'
                  }`}
              >
                Home
              </Link>
              <Link
                to="/restaurants"
                className={`font-medium transition-colors ${location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/restaurant/')
                  ? 'text-brand-orange'
                  : 'text-text-secondary hover:text-brand-orange'
                  }`}
              >
                Restaurants
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Cart Button */}
              {showCartButton && (
                <button
                  onClick={handleCartClick}
                  className="relative p-2 text-text-secondary hover:text-brand-orange transition-colors"
                  aria-label="Shopping Cart"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              )}

              {/* Auth actions (desktop) */}
              {token ? (
                <>
                  <button
                    onClick={() => navigate('/profile')}
                    className="hidden md:inline px-3 py-2 rounded-lg text-text-secondary hover:text-brand-orange transition"
                  >
                    {user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Profile'}
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="px-3 py-2 rounded-lg bg-dark-card text-text-secondary hover:text-brand-orange border border-dark-card transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-2 rounded-lg bg-brand-lime text-dark-bg font-bold hover:bg-brand-lime/90 transition"
                >
                  Sign In
                </button>
              )}

              {/* Hamburger Menu Button (Mobile) */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-brand-orange transition-colors"
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`md:hidden bg-dark-card border-t border-dark-surface transition-all duration-300 ease-in-out ${isMenuOpen
            ? 'max-h-screen opacity-100'
            : 'max-h-0 opacity-0 overflow-hidden'
            }`}
        >
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link
              to="/"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname === '/'
                ? 'bg-brand-orange text-white'
                : 'text-text-secondary hover:bg-dark-surface'
                }`}
            >
              🏠 Home
            </Link>
            <Link
              to="/restaurants"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/restaurant/')
                ? 'bg-brand-orange text-white'
                : 'text-text-secondary hover:bg-dark-surface'
                }`}
            >
              Restaurants
            </Link>
            {/* Auth actions (mobile) */}
            {token ? (
              <>
                <Link
                  to="/profile"
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/profile')
                    ? 'bg-brand-orange text-white'
                    : 'text-text-secondary hover:bg-dark-surface'
                    }`}
                >
                  Profile
                </Link>
                <Link
                  to="/my-reservations"
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/my-reservations')
                    ? 'bg-brand-orange text-white'
                    : 'text-text-secondary hover:bg-dark-surface'
                    }`}
                >
                  My Reservations
                </Link>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="block w-full text-left px-4 py-3 rounded-lg font-medium text-text-secondary hover:bg-dark-surface"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`block px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/login')
                  ? 'bg-brand-orange text-white'
                  : 'text-text-secondary hover:bg-dark-surface'
                  }`}
              >
                Sign In
              </Link>
            )}

            {/* Mobile Cart Link */}
            {showCartButton && (
              <Link
                to="/cart"
                className={`block px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname.includes('/cart')
                  ? 'bg-brand-orange text-white'
                  : 'text-text-secondary hover:bg-dark-surface'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>🛒 View Cart</span>
                  {cartItemCount > 0 && (
                    <span className="bg-brand-lime text-white px-3 py-1 rounded-full text-sm font-bold">
                      {cartItemCount}
                    </span>
                  )}
                </div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from going under fixed navbar - Hidden on pages with transparent header */}
      <div
        className="transition-[height] duration-500 ease-out"
        style={{
          height: ['/', '/cart', '/profile', '/restaurants', '/reservation', '/my-reservations', '/admin/menu', '/admin/settings', '/restaurant', '/login', '/signup', '/payment', '/order-status', '/about'].some(path => location.pathname === path || location.pathname.startsWith(path + '/'))
            ? '0px'
            : '64px'
        }}
      ></div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
