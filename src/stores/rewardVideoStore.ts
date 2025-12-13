import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useWalletStore } from './walletStore';
import { logger } from '@/lib/logger';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  videoUrl?: string | null;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  creatorName?: string | null;
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

const PRELOAD_COUNT = 20; // Increased from 10 for instant video availability
const REFILL_THRESHOLD = 5; // Increased from 3 to maintain buffer

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

      const { data, error } = await supabase.functions.invoke('preload-reward-videos?count=20', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        logger.error('[RewardVideoStore] Preload error:', error);
        set({ isPreloading: false, isPreloaded: true, videoQueue: [] });
        return;
      }

      const videos: RewardVideo[] = data?.videos || [];
      
      logger.log(`[RewardVideoStore] Preloaded ${videos.length} videos`);
      
      set({ 
        videoQueue: videos, 
        isPreloading: false, 
        isPreloaded: true,
        lastPreloadAt: Date.now(),
      });
    } catch (err) {
      logger.error('[RewardVideoStore] Preload error:', err);
      set({ isPreloading: false, isPreloaded: true, videoQueue: [] });
    }
  },

  refillQueueIfNeeded: async (userId: string) => {
    const { videoQueue, isPreloading } = get();
    
    // Only refill if below threshold and not already loading
    if (videoQueue.length > REFILL_THRESHOLD || isPreloading) return;
    
    logger.log(`[RewardVideoStore] Queue at ${videoQueue.length}, refilling...`);
    
    set({ isPreloading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isPreloading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke('preload-reward-videos?count=20', {
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
      
      logger.log(`[RewardVideoStore] Refilled, queue now has ${get().videoQueue.length} videos`);
    } catch (err) {
      logger.error('[RewardVideoStore] Refill error:', err);
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
      const requiredVideos = eventType === 'refill' ? 2 : 1;
      
      // PERFORMANCE OPTIMIZATION: Use preloaded videos from queue instead of calling backend
      // This eliminates the slow reward-start API call and makes video playback instant
      let videosToUse = get().getVideosFromQueue(requiredVideos);
      
      // If queue is empty, try to refill synchronously
      if (videosToUse.length < requiredVideos) {
        logger.log(`[RewardVideoStore] Queue empty, forcing sync refill...`);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          set({ isStartingSession: false });
          return null;
        }

        const { data: refillData } = await supabase.functions.invoke('preload-reward-videos?count=20', {
          body: {},
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (refillData?.videos && refillData.videos.length > 0) {
          set(state => ({ 
            videoQueue: [...state.videoQueue, ...refillData.videos],
            lastPreloadAt: Date.now(),
          }));
          videosToUse = get().getVideosFromQueue(requiredVideos);
        }
      }

      // If still no videos, fail gracefully
      if (videosToUse.length === 0) {
        logger.warn('[RewardVideoStore] No videos available for session');
        set({ isStartingSession: false });
        return null;
      }

      // Generate session ID locally (no backend call needed!)
      const rewardSessionId = `${userId}-${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const rewardSession: RewardSession = {
        id: rewardSessionId,
        eventType,
        videos: videosToUse,
        originalReward,
        requiredAds: requiredVideos,
      };

      // Consume videos from queue (remove used ones)
      const usedIds = new Set(videosToUse.map((v: RewardVideo) => v.id));
      set(state => ({
        videoQueue: state.videoQueue.filter(v => !usedIds.has(v.id)),
        activeSession: rewardSession,
        isStartingSession: false,
      }));

      // Trigger refill check in background (non-blocking)
      get().refillQueueIfNeeded(userId);

      logger.log(`[RewardVideoStore] Session started INSTANTLY: ${rewardSession.id} with ${rewardSession.videos.length} videos`);
      
      return rewardSession;
    } catch (err) {
      logger.error('[RewardVideoStore] Start session error:', err);
      set({ isStartingSession: false });
      return null;
    }
  },

  completeRewardSession: async (watchedVideoIds: string[]) => {
    const { activeSession } = get();
    
    if (!activeSession) {
      logger.warn('[RewardVideoStore] No active session to complete');
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
        logger.error('[RewardVideoStore] Complete session error:', error || data?.error);
        return { success: false, coinsDelta: 0, livesDelta: 0 };
      }

      logger.log(`[RewardVideoStore] Session completed, reward: ${data.reward?.coinsDelta} coins, ${data.reward?.livesDelta} lives`);
      
      // CRITICAL: Force immediate wallet refresh after reward credited
      // This ensures frontend shows updated coins/lives instantly
      const walletStore = useWalletStore.getState();
      walletStore.fetchWallet();
      
      return {
        success: true,
        coinsDelta: data.reward?.coinsDelta || 0,
        livesDelta: data.reward?.livesDelta || 0,
      };
    } catch (err) {
      logger.error('[RewardVideoStore] Complete session error:', err);
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
