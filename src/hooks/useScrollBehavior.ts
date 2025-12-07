import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Fixed routes that should NOT scroll - minden oldal legyen fixed
const FIXED_ROUTES = ['/dashboard', '/coin-shop', '/profile', '/leaderboard', '/invitation', '/about'];

// Game routes where modals should NOT appear
const GAME_ROUTES = ['/game', '/play'];

export const useScrollBehavior = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check if current route is fixed (no scroll)
    const isFixedRoute = FIXED_ROUTES.some(route => currentPath === route);
    
    // Check if in gameplay (no modals)
    const isGameplay = GAME_ROUTES.some(route => currentPath.startsWith(route));

    // Apply or remove scroll lock
    if (isFixedRoute) {
      // Lock scroll for fixed routes
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
    } else {
      // Allow scroll for other routes
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [location.pathname]);

  return {
    isFixedRoute: FIXED_ROUTES.some(route => location.pathname === route),
    isGameplay: GAME_ROUTES.some(route => location.pathname.startsWith(route)),
    canMountModals: !GAME_ROUTES.some(route => location.pathname.startsWith(route))
  };
};
