import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { logger } from '@/lib/logger';

/**
 * Hook to manage fullscreen mode on native iOS and Android apps via Capacitor
 * 
 * This hook hides the status bar and enables immersive fullscreen mode
 * on native mobile platforms (iOS and Android).
 * 
 * Features:
 * - iOS: Hides status bar completely
 * - Android: Enables immersive mode (hides status bar + navigation bar)
 * - Web: No effect (handled by useFullscreen hook)
 */
export const useNativeFullscreen = () => {
  useEffect(() => {
    // Only run on native platforms (iOS or Android)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupFullscreen = async () => {
      try {
        // Hide status bar on both iOS and Android
        await StatusBar.hide();
        
        // Set dark style for consistency
        await StatusBar.setStyle({ style: Style.Dark });
        
        // Enable overlay mode so content extends behind status bar area
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        // Android-specific: Set background to black
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#000000' });
        }
        
        logger.log('[Native Fullscreen] Fullscreen mode enabled on', Capacitor.getPlatform());
      } catch (error) {
        logger.error('[Native Fullscreen] Error setting up fullscreen:', error);
      }
    };

    setupFullscreen();

    // Cleanup: restore status bar on unmount (optional)
    return () => {
      if (Capacitor.isNativePlatform()) {
        StatusBar.show().catch(() => {
          // Silent fail - status bar might already be visible
        });
      }
    };
  }, []);
};
