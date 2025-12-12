import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface UseFullscreenOptions {
  enabled?: boolean;
  autoReenter?: boolean;
}

/**
 * Hook to manage fullscreen mode on web browsers
 * 
 * This hook enables fullscreen mode using the Fullscreen API for web browsers.
 * For native platforms (iOS/Android), use useNativeFullscreen instead.
 * 
 * @param options.enabled - Whether fullscreen should be enabled (default: true)
 * @param options.autoReenter - Whether to automatically re-enter fullscreen if user exits (default: false)
 */
export const useFullscreen = (options: UseFullscreenOptions = {}) => {
  const { enabled = true, autoReenter = false } = options;

  useEffect(() => {
    if (!enabled) return;

    const enterFullscreen = async () => {
      try {
        // Request fullscreen on document element
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          logger.log('[Web Fullscreen] Fullscreen mode enabled');
        }
      } catch (error) {
        logger.error('[Web Fullscreen] Error entering fullscreen:', error);
      }
    };

    // Attempt to enter fullscreen
    enterFullscreen();

    // Handle fullscreen change events (for autoReenter)
    const handleFullscreenChange = () => {
      if (autoReenter && !document.fullscreenElement) {
        logger.log('[Web Fullscreen] User exited fullscreen, re-entering...');
        enterFullscreen();
      }
    };

    if (autoReenter) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    // Cleanup: exit fullscreen on unmount
    return () => {
      if (autoReenter) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Silent fail - fullscreen might already be exited
        });
      }
    };
  }, [enabled, autoReenter]);
};
