import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
}

interface RewardSession {
  id: string;
  eventType: 'daily_gift' | 'end_game' | 'refill';
  videos: RewardVideo[];
  originalReward: number;
  requiredAds: number;
}

interface RewardVideoStore {
  // Preloaded queue
  videoQueue: RewardVideo[];
  isPreloading: boolean;
  isPreloaded: boolean;
  lastPreloadAt: number | null;
  
  // Active session
  activeSession: RewardSession | null;
  isStartingSession: boolean;
  
  // Actions
  preloadVideos: (userId: string) => Promise<void>;
  refillQueueIfNeeded: (userId: string) => Promise<void>;
  
  // Session management
  startRewardSession: (
    userId: string, 
    eventType: 'daily_gift' | 'end_game' | 'refill',
    originalReward?: number
  ) => Promise<RewardSession | null>;
  
  completeRewardSession: (watchedVideoIds: string[]) => Promise<{
    success: boolean;
    coinsDelta: number;
    livesDelta: number;
  }>;
  
  cancelSession: () => void;
  
  // Helpers
  hasEnoughVideos: (count: number) => boolean;
  getVideosFromQueue: (count: number) => RewardVideo[];
  
  reset: () => void;
}

const PRELOAD_COUNT = 10;
const REFILL_THRESHOLD = 3;

export const useRewardVideoStore = create<RewardVideoStore>((set, get) => ({
  videoQueue: [],
  isPreloading: false,
  isPreloaded: false,
  lastPreloadAt: null,
  activeSession: null,
  isStartingSession: false,

  preloadVideos: async (userId: string) => {
    if (!userId) return;
    if (get().isPreloading) return;
    
    set({ isPreloading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isPreloading: false, isPreloaded: true, videoQueue: [] });
        return;
      }

      const { data, error } = await supabase.functions.invoke('preload-reward-videos', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error('[RewardVideoStore] Preload error:', error);
        set({ isPreloading: false, isPreloaded: true, videoQueue: [] });
        return;
      }

      const videos: RewardVideo[] = data?.videos || [];
      
      console.log(`[RewardVideoStore] Preloaded ${videos.length} videos`);
      
      set({ 
        videoQueue: videos, 
        isPreloading: false, 
        isPreloaded: true,
        lastPreloadAt: Date.now(),
      });
    } catch (err) {
      console.error('[RewardVideoStore] Preload error:', err);
      set({ isPreloading: false, isPreloaded: true, videoQueue: [] });
    }
  },

  refillQueueIfNeeded: async (userId: string) => {
    const { videoQueue, isPreloading } = get();
    
    // Only refill if below threshold and not already loading
    if (videoQueue.length > REFILL_THRESHOLD || isPreloading) return;
    
    console.log(`[RewardVideoStore] Queue at ${videoQueue.length}, refilling...`);
    
    set({ isPreloading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isPreloading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke('preload-reward-videos', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.videos) {
        set({ isPreloading: false });
        return;
      }

      const newVideos: RewardVideo[] = data.videos || [];
      
      // Append to existing queue
      set(state => ({ 
        videoQueue: [...state.videoQueue, ...newVideos],
        isPreloading: false,
        lastPreloadAt: Date.now(),
      }));
      
      console.log(`[RewardVideoStore] Refilled, queue now has ${get().videoQueue.length} videos`);
    } catch (err) {
      console.error('[RewardVideoStore] Refill error:', err);
      set({ isPreloading: false });
    }
  },

  hasEnoughVideos: (count: number) => {
    return get().videoQueue.length >= count;
  },

  getVideosFromQueue: (count: number) => {
    const { videoQueue } = get();
    
    if (videoQueue.length === 0) return [];
    
    // If we have enough, return first N
    if (videoQueue.length >= count) {
      return videoQueue.slice(0, count);
    }
    
    // If not enough, reuse videos (cycle through)
    const result: RewardVideo[] = [];
    for (let i = 0; i < count; i++) {
      result.push(videoQueue[i % videoQueue.length]);
    }
    return result;
  },

  startRewardSession: async (userId, eventType, originalReward = 0) => {
    if (!userId) return null;
    if (get().isStartingSession) return null;
    
    set({ isStartingSession: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isStartingSession: false });
        return null;
      }

      // Call backend to create session
      const { data, error } = await supabase.functions.invoke('reward-start', {
        body: { eventType, originalReward },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.success) {
        console.error('[RewardVideoStore] Start session error:', error || data?.error);
        set({ isStartingSession: false });
        return null;
      }

      const rewardSession: RewardSession = {
        id: data.rewardSessionId,
        eventType,
        videos: data.videos,
        originalReward,
        requiredAds: data.requiredAds,
      };

      // Consume videos from queue (remove used ones)
      const usedIds = new Set(data.videos.map((v: RewardVideo) => v.id));
      set(state => ({
        videoQueue: state.videoQueue.filter(v => !usedIds.has(v.id)),
        activeSession: rewardSession,
        isStartingSession: false,
      }));

      // Trigger refill check in background
      get().refillQueueIfNeeded(userId);

      console.log(`[RewardVideoStore] Session started: ${rewardSession.id} with ${rewardSession.videos.length} videos`);
      
      return rewardSession;
    } catch (err) {
      console.error('[RewardVideoStore] Start session error:', err);
      set({ isStartingSession: false });
      return null;
    }
  },

  completeRewardSession: async (watchedVideoIds: string[]) => {
    const { activeSession } = get();
    
    if (!activeSession) {
      console.warn('[RewardVideoStore] No active session to complete');
      return { success: false, coinsDelta: 0, livesDelta: 0 };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ activeSession: null });
        return { success: false, coinsDelta: 0, livesDelta: 0 };
      }

      const { data, error } = await supabase.functions.invoke('reward-complete', {
        body: {
          rewardSessionId: activeSession.id,
          watchedVideoIds,
          eventType: activeSession.eventType,
          originalReward: activeSession.originalReward,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Clear session regardless of result
      set({ activeSession: null });

      if (error || !data?.success) {
        console.error('[RewardVideoStore] Complete session error:', error || data?.error);
        return { success: false, coinsDelta: 0, livesDelta: 0 };
      }

      console.log(`[RewardVideoStore] Session completed, reward: ${data.reward?.coinsDelta} coins, ${data.reward?.livesDelta} lives`);
      
      return {
        success: true,
        coinsDelta: data.reward?.coinsDelta || 0,
        livesDelta: data.reward?.livesDelta || 0,
      };
    } catch (err) {
      console.error('[RewardVideoStore] Complete session error:', err);
      set({ activeSession: null });
      return { success: false, coinsDelta: 0, livesDelta: 0 };
    }
  },

  cancelSession: () => {
    set({ activeSession: null });
  },

  reset: () => {
    set({
      videoQueue: [],
      isPreloading: false,
      isPreloaded: false,
      lastPreloadAt: null,
      activeSession: null,
      isStartingSession: false,
    });
  },
}));
