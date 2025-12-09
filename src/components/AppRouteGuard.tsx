import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import loadingLogo from '@/assets/dingleup-loading-logo.png';

interface AppRouteGuardProps {
  children: React.ReactNode;
}

export const AppRouteGuard = ({ children }: AppRouteGuardProps) => {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isPWAOrNative, setIsPWAOrNative] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();

  // Detect device type
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobileOrTablet(width <= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Set ready state when all detection is complete
  useEffect(() => {
    if (isMobileOrTablet !== null && hasSession !== null) {
      setIsReady(true);
    }
  }, [isMobileOrTablet, hasSession]);

  // Detect PWA/native mode
  useEffect(() => {
    const checkPWAMode = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isNativeApp = !!(window as any).ReactNativeWebView;
      setIsPWAOrNative(isStandalone || isIOSStandalone || isNativeApp);
    };
    checkPWAMode();
  }, []);

  // Optimized session check - use cached session first
  useEffect(() => {
    // Try to get cached session synchronously first
    const cachedSession = localStorage.getItem('sb-wdpxmwsxhckazwxufttk-auth-token');
    if (cachedSession) {
      try {
        const parsed = JSON.parse(cachedSession);
        setHasSession(!!parsed?.access_token);
      } catch {
        setHasSession(false);
      }
    } else {
      setHasSession(false);
    }

    // Then verify with actual session (background)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen until platform and session detection complete
  if (!isReady) {
    return (
      <div className="h-dvh h-svh w-screen flex items-center justify-center bg-gradient-to-br from-primary-darker via-primary-dark to-primary-darker">
        <div className="animate-pulse">
          <img 
            src={loadingLogo} 
            alt="DingleUP!" 
            className="w-40 h-40 object-contain"
          />
        </div>
      </div>
    );
  }

  // CRITICAL: Mobilon/táblagépen (PWA és natív módban is) MINDIG a login/register legyen az első oldal
  // Ha handheld eszközön (telefon, tablet) vagyunk ÉS a landing page-en vagyunk → mindig átirányít login-ra
  if (
    isMobileOrTablet && 
    location.pathname === '/'
  ) {
    return <Navigate to="/auth/login" replace />;
  }

  // Admin pages always accessible
  if (location.pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Desktop: only landing and admin pages accessible
  // CRITICAL: This message must ONLY appear on desktop, never on mobile/tablet
  if (!isMobileOrTablet && location.pathname !== '/' && location.pathname !== '/desktop' && !location.pathname.startsWith('/admin')) {
    // Extra safety check: verify screen width to ensure we're on desktop
    const screenWidth = window.innerWidth;
    if (screenWidth > 1024) {
      return (
        <div className="h-dvh h-svh w-screen flex items-center justify-center bg-gradient-to-br from-primary-darker via-primary-dark to-primary-darker">
          <div className="text-center px-6 max-w-md">
            <h1 className="text-3xl font-black text-foreground mb-4">📱 Csak mobilon és táblagépen elérhető</h1>
            <p className="text-foreground/80 mb-6">
              Ez az alkalmazás csak telefonon és táblagépen használható. 
              Kérjük, nyisd meg mobil eszközön!
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all"
            >
              Vissza a főoldalra
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
