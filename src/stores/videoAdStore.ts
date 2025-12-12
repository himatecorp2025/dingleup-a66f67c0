import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface VideoAdStore {
  isAvailable: boolean;
  isLoading: boolean;
  isPreloaded: boolean;
  lastChecked: number | null;
  checkAvailability: (userId: string, force?: boolean) => Promise<boolean>;
  preloadOnLogin: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useVideoAdStore = create<VideoAdStore>((set, get) => ({
  isAvailable: false,
  isLoading: false,
  isPreloaded: false,
  lastChecked: null,

  // Preload video availability on login - runs immediately
  preloadOnLogin: async (userId: string) => {
    if (!userId) return;
    
    // Don't block - run in background
    set({ isLoading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isAvailable: false, isLoading: false, isPreloaded: true });
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-ad-video', {
        body: { context: 'game_end' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const available = !error && data?.available === true;
      
      set({ 
        isAvailable: available, 
        isLoading: false,
        isPreloaded: true,
        lastChecked: Date.now()
      });
      
      logger.log('[VideoAdStore] Preloaded availability:', available);
    } catch (err) {
      logger.error('[VideoAdStore] Error preloading:', err);
      set({ isAvailable: false, isLoading: false, isPreloaded: true });
    }
  },

  checkAvailability: async (userId: string, force: boolean = false) => {
    // Skip if already loading
    if (get().isLoading) {
      return get().isAvailable;
    }

    // Use cache unless forced
    if (!force) {
      const lastChecked = get().lastChecked;
      // Use 5 minute cache
      if (lastChecked && Date.now() - lastChecked < 5 * 60 * 1000) {
        return get().isAvailable;
      }
    }

    set({ isLoading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isAvailable: false, isLoading: false });
        return false;
      }

      const { data, error } = await supabase.functions.invoke('get-ad-video', {
        body: { context: 'game_end' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const available = !error && data?.available === true;
      
      set({ 
        isAvailable: available, 
        isLoading: false,
        lastChecked: Date.now()
      });

      return available;
    } catch (err) {
      logger.error('[VideoAdStore] Error checking availability:', err);
      set({ isAvailable: false, isLoading: false });
      return false;
    }
  },

  reset: () => {
    set({ isAvailable: false, isLoading: false, isPreloaded: false, lastChecked: null });
  },
}));
