import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface VideoAdStore {
  isAvailable: boolean;
  isLoading: boolean;
  lastChecked: number | null;
  checkAvailability: (userId: string) => Promise<boolean>;
  reset: () => void;
}

export const useVideoAdStore = create<VideoAdStore>((set, get) => ({
  isAvailable: false,
  isLoading: false,
  lastChecked: null,

  checkAvailability: async (userId: string) => {
    // Skip if already loading
    if (get().isLoading) {
      return get().isAvailable;
    }

    // Skip if checked within last 5 minutes
    const lastChecked = get().lastChecked;
    if (lastChecked && Date.now() - lastChecked < 5 * 60 * 1000) {
      return get().isAvailable;
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
      console.error('[VideoAdStore] Error checking availability:', err);
      set({ isAvailable: false, isLoading: false });
      return false;
    }
  },

  reset: () => {
    set({ isAvailable: false, isLoading: false, lastChecked: null });
  },
}));
