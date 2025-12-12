import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
export interface VideoData {
  id: string;
  video_url: string;
  embed_url: string | null;
  platform: string;
  duration_seconds: number | null;
  creator_id: string;
  topics: number[];
}

interface VideoAdState {
  isLoading: boolean;
  isAvailable: boolean;
  videos: VideoData[];
  isRelevant: boolean;
}

type VideoAdContext = 'daily_gift' | 'game_end' | 'refill';

export const useVideoAd = () => {
  const [state, setState] = useState<VideoAdState>({
    isLoading: false,
    isAvailable: false,
    videos: [],
    isRelevant: false,
  });

  // Check if video ad is available for a context - returns video data directly to avoid stale closure
  const checkAvailability = useCallback(async (context: VideoAdContext): Promise<{ available: boolean; video?: VideoData; isRelevant?: boolean }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, isLoading: false, isAvailable: false }));
        return { available: false };
      }

      const { data, error } = await supabase.functions.invoke('get-ad-video', {
        body: { context },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.available) {
        setState(prev => ({ ...prev, isLoading: false, isAvailable: false }));
        return { available: false };
      }

      const video = data.video as VideoData;
      const isRelevant = data.is_relevant || false;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAvailable: true,
        videos: [video],
        isRelevant,
      }));

      return { available: true, video, isRelevant };
    } catch (err) {
      logger.error('[useVideoAd] Error checking availability:', err);
      setState(prev => ({ ...prev, isLoading: false, isAvailable: false }));
      return { available: false };
    }
  }, []);

  // Fetch videos for refill (2 videos)
  const fetchRefillVideos = useCallback(async (): Promise<VideoData[]> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, isLoading: false }));
        return [];
      }

      const videos: VideoData[] = [];
      const excludeVideoIds: string[] = [];
      const excludeCreatorIds: string[] = [];

      // Fetch first video
      const { data: first } = await supabase.functions.invoke('get-ad-video', {
        body: { context: 'refill', exclude_video_ids: excludeVideoIds, exclude_creator_ids: excludeCreatorIds },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (first?.available && first.video) {
        videos.push(first.video);
        excludeVideoIds.push(first.video.id);
        excludeCreatorIds.push(first.video.creator_id);
      }

      // Fetch second video (different creator if possible)
      const { data: second } = await supabase.functions.invoke('get-ad-video', {
        body: { context: 'refill', exclude_video_ids: excludeVideoIds, exclude_creator_ids: excludeCreatorIds },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (second?.available && second.video) {
        videos.push(second.video);
      } else if (videos.length === 1) {
        // If no second video from different creator, try same creator
        const { data: fallback } = await supabase.functions.invoke('get-ad-video', {
          body: { context: 'refill', exclude_video_ids: excludeVideoIds },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (fallback?.available && fallback.video) {
          videos.push(fallback.video);
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAvailable: videos.length >= 2,
        videos,
      }));

      return videos;
    } catch (err) {
      logger.error('[useVideoAd] Error fetching refill videos:', err);
      setState(prev => ({ ...prev, isLoading: false }));
      return [];
    }
  }, []);

  // Log video impression
  const logImpression = useCallback(async (
    videoId: string,
    context: VideoAdContext,
    watchedFull15s: boolean,
    isRelevant: boolean,
    sequencePosition: number = 1
  ): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('log-video-impression', {
        body: {
          video_id: videoId,
          context,
          watched_full_15s: watchedFull15s,
          is_relevant: isRelevant,
          sequence_position: sequencePosition,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch (err) {
      logger.error('[useVideoAd] Error logging impression:', err);
    }
  }, []);

  // Claim video reward
  const claimReward = useCallback(async (
    rewardType: 'daily_gift_double' | 'game_end_double' | 'refill',
    originalReward: number = 0,
    idempotencyKey: string,
    multiplier: number = 2 // 1 = declined video (1× base), 2 = watched video (2× base)
  ): Promise<{ success: boolean; coinsCredited?: number; livesCredited?: number }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false };
      }

      const { data, error } = await supabase.functions.invoke('claim-video-reward', {
        body: {
          reward_type: rewardType,
          original_reward: originalReward,
          idempotency_key: idempotencyKey,
          multiplier: multiplier,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.success) {
        logger.error('[useVideoAd] Error claiming reward:', error);
        return { success: false };
      }

      return {
        success: true,
        coinsCredited: data.coins_credited,
        livesCredited: data.lives_credited,
      };
    } catch (err) {
      logger.error('[useVideoAd] Error claiming reward:', err);
      return { success: false };
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isAvailable: false,
      videos: [],
      isRelevant: false,
    });
  }, []);

  return {
    ...state,
    checkAvailability,
    fetchRefillVideos,
    logImpression,
    claimReward,
    reset,
  };
};
