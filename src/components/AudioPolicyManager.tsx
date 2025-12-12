import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAudioStore } from "@/stores/audioStore";
import AudioManager from "@/lib/audioManager";
import { logger } from "@/lib/logger";

const MUSIC_BLOCKED_ROUTES = [
  /^\/$/,               // Landing page
  /^\/desktop$/,        // Desktop landing page
  /^\/admin/,           // All admin routes including subpages
  /^\/admin-/,          // Any admin-prefixed routes
  /\/admin\//,          // Any path containing /admin/
];

function isMusicAllowed(pathname: string): boolean {
  const blocked = MUSIC_BLOCKED_ROUTES.some(pattern => pattern.test(pathname));
  return !blocked;
}

export const AudioPolicyManager = () => {
  const location = useLocation();

  useEffect(() => {
    const applyAudioPolicy = () => {
      const { musicEnabled, volume, loaded } = useAudioStore.getState();
      
      if (!loaded) {
        logger.log('[AudioPolicy] Store not loaded yet, skipping');
        return;
      }

      const audioManager = AudioManager.getInstance();
      
      // Platform detection: music ONLY on mobile/tablet, NEVER on desktop
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                       window.matchMedia('(max-width: 1024px)').matches;
      
      logger.log('[AudioPolicy] Platform check:', { isMobile, userAgent: navigator.userAgent });
      
      if (!isMobile) {
        logger.log('[AudioPolicy] Desktop detected - music DISABLED');
        audioManager.apply(false, 0);
        return;
      }
      
      // Check if music is allowed on current route (blocks admin & landing page)
      const musicAllowed = isMusicAllowed(location.pathname);
      
      logger.log('[AudioPolicy] Route check:', { 
        pathname: location.pathname, 
        musicAllowed 
      });
      
      if (!musicAllowed) {
        logger.log('[AudioPolicy] Music blocked on this route');
        audioManager.apply(false, 0);
        return;
      }
      
      // Mobile/Tablet on allowed routes: Switch track based on route
      const isGameRoute = location.pathname === '/game';
      
      logger.log('[AudioPolicy] Track selection:', { 
        isGameRoute, 
        willSwitchTo: isGameRoute ? 'game' : 'general' 
      });
      
      if (isGameRoute) {
        audioManager.switchTrack('game');
      } else {
        audioManager.switchTrack('general');
      }

      audioManager.apply(musicEnabled, volume);
      
      // CRITICAL: On game route, explicitly force play to ensure music starts
      // This works because navigation to /game happens via user interaction (Play Now button click)
      if (isGameRoute && musicEnabled && volume > 0) {
        logger.log('[AudioPolicy] Scheduling forcePlay for game music...');
        // Small delay to ensure AudioManager state is fully updated
        setTimeout(() => {
          audioManager.forcePlay().then(() => {
            const state = audioManager.getState();
            logger.log('[AudioPolicy] ✅ Game music force-start complete', { 
              track: state.track, 
              paused: state.paused,
              enabled: state.enabled,
              volume: state.volume
            });
          }).catch((err) => {
            logger.error('[AudioPolicy] ❌ Game music force-start FAILED', err);
          });
        }, 100);
      }
    };

    applyAudioPolicy();
    
    const unsubscribe = useAudioStore.subscribe((state) => {
      if (state.loaded) {
        applyAudioPolicy();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [location.pathname]);

  // Handle app lifecycle: pause music when app goes to background, resume when returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audioManager = AudioManager.getInstance();
      const { musicEnabled, volume } = useAudioStore.getState();

      if (document.hidden) {
        // App went to background - pause all music
        logger.log('[AudioPolicy] 🔴 App went to BACKGROUND - pausing all music');
        audioManager.pauseAll();
      } else {
        // App returned to foreground - check if music is allowed on current route
        const musicAllowed = isMusicAllowed(location.pathname);
        logger.log('[AudioPolicy] 🟢 App returned to FOREGROUND', { 
          pathname: location.pathname, 
          musicAllowed, 
          musicEnabled, 
          volume 
        });
        
        if (musicAllowed && musicEnabled && volume > 0) {
          audioManager.resumeIfEnabled();
        }
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page restored from back/forward cache - check if music is allowed
        const musicAllowed = isMusicAllowed(location.pathname);
        logger.log('[AudioPolicy] 📄 Page restored from cache', { 
          pathname: location.pathname, 
          musicAllowed 
        });
        
        const audioManager = AudioManager.getInstance();
        const { musicEnabled, volume } = useAudioStore.getState();
        if (musicAllowed && musicEnabled && volume > 0) {
          audioManager.resumeIfEnabled();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
};
