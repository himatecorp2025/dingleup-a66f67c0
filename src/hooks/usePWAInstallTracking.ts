import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const usePWAInstallTracking = () => {
  useEffect(() => {
    let deferredPrompt: any = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Track that install prompt was shown
      trackPWAEvent('install_prompt_shown');
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      trackPWAEvent('app_installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Track if app is running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      trackPWAEvent('app_launched_standalone');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
};

const trackPWAEvent = async (eventType: string) => {
  try {
    const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('app_session_events').insert({
      user_id: user?.id || 'anonymous',
      session_id: sessionId,
      event_type: eventType,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        standalone: window.matchMedia('(display-mode: standalone)').matches
      }
    });

    logger.log('[PWAInstallTracking]', eventType);
  } catch (err) {
    logger.error('[PWAInstallTracking] Failed to track event:', err);
  }
};