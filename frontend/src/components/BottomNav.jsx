import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUserAuth } from '../context/UserAuthContext';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  UserCircleIcon as UserCircleIconSolid
} from '@heroicons/react/24/solid';

/**
 * BottomNav Component
 * Fixed bottom navigation bar for mobile-friendly navigation
 * Shows Home, Browse (Menu), Cart, and Profile
 * Orange highlighting for active tab
 */
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItemCount } = useCart();
  const { token } = useUserAuth ? useUserAuth() : { token: null };

  // Don't show bottom nav on kitchen/admin/special pages
  const hideOnRoutes = ['/kitchen', '/kitchen-login', '/tables', '/admin', '/scan-qr'];
  const shouldHide = hideOnRoutes.some(route => location.pathname.startsWith(route));

  if (shouldHide) {
    return null;
  }

  // Navigation items configuration
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: HomeIcon,
      iconSolid: HomeIconSolid
    },
    {
      id: 'browse',
      label: 'Browse',
      path: '/restaurants',
      icon: MagnifyingGlassIcon,
      iconSolid: MagnifyingGlassIconSolid
    },
    {
      id: 'cart',
      label: 'Cart',
      path: '/cart',
      icon: ShoppingCartIcon,
      iconSolid: ShoppingCartIconSolid,
      badge: cartItemCount > 0 ? cartItemCount : null
    },
    {
      id: 'profile',
      label: 'Profile',
      path: token ? '/profile' : '/login',
      icon: UserCircleIcon,
      iconSolid: UserCircleIconSolid
    }
  ];

  // Determine if a nav item is active
  const isItemActive = (item) => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    // Consider restaurants route active for /restaurants and /restaurant/:id
    if (item.path === '/restaurants') {
      return location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/restaurant/');
    }
    return location.pathname.startsWith(item.path.split('/')[1] ? `/${item.path.split('/')[1]}` : item.path);
  };

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-bg border-t border-brand-orange/20 shadow-2xl z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-20 max-w-screen-xl mx-auto px-4">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = isActive ? item.iconSolid : item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`
                flex flex-col items-center justify-center
                w-full h-full gap-1
                transition-all duration-200
                ${isActive ? 'text-brand-orange scale-110' : 'text-text-secondary'}
                hover:text-brand-orange
                active:scale-95
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-7 h-7" strokeWidth={isActive ? 2.5 : 2} />

                {/* Badge for cart count */}
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`
                text-[10px] font-semibold tracking-wide
                ${isActive ? 'text-brand-orange' : 'text-text-secondary'}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
