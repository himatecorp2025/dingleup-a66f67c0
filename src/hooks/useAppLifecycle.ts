import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

interface AppLifecycleCallbacks {
  onBackground?: () => void;
  onForeground?: () => void;
  onBeforeUnload?: () => void;
}

export const useAppLifecycle = (callbacks: AppLifecycleCallbacks) => {
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background
        backgroundTimeRef.current = Date.now();
        callbacks.onBackground?.();
      } else {
        // App came to foreground
        if (backgroundTimeRef.current) {
          const timeInBackground = Date.now() - backgroundTimeRef.current;
          logger.log(`[AppLifecycle] Was in background for ${timeInBackground}ms`);
          backgroundTimeRef.current = null;
        }
        callbacks.onForeground?.();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      callbacks.onBeforeUnload?.();
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from back/forward cache
        callbacks.onForeground?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [callbacks]);
};
