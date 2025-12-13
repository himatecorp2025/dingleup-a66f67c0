import { useState, useCallback } from 'react';
import { useRewardVideoStore, RewardVideo } from '@/stores/rewardVideoStore';
import { logger } from '@/lib/logger';

interface UseVideoAdFlowOptions {
  userId: string | undefined;
  onRewardStarted?: () => void; // Called SYNCHRONOUSLY when video session starts
  onRewardClaimed?: (coins: number, lives: number) => void;
}

interface VideoAdFlowState {
  showPrompt: boolean;
  showVideo: boolean;
  videos: RewardVideo[];
  totalDuration: number;
  isLoading: boolean;
  context: 'daily_gift' | 'game_end' | 'refill' | null;
  originalReward: number;
}

export const useVideoAdFlow = ({ userId, onRewardStarted, onRewardClaimed }: UseVideoAdFlowOptions) => {
  const [state, setState] = useState<VideoAdFlowState>({
    showPrompt: false,
    showVideo: false,
    videos: [],
    totalDuration: 15,
    isLoading: false,
    context: null,
    originalReward: 0,
  });

  const rewardVideoStore = useRewardVideoStore();

  // Check if daily gift doubling is available - INSTANT from preloaded queue
  const checkDailyGiftDoubleAvailable = useCallback((): boolean => {
    return rewardVideoStore.hasEnoughVideos(1);
  }, [rewardVideoStore]);

  // Check if game end doubling is available - INSTANT from preloaded queue
  const checkGameEndDoubleAvailable = useCallback((): boolean => {
    return rewardVideoStore.hasEnoughVideos(1);
  }, [rewardVideoStore]);

  // Check if refill is available (2 videos) - INSTANT from preloaded queue
  const checkRefillAvailable = useCallback((): boolean => {
    return rewardVideoStore.hasEnoughVideos(2);
  }, [rewardVideoStore]);

  // Start daily gift double flow - INSTANT, no backend call
  const startDailyGiftDouble = useCallback(async (originalCoins: number, skipPrompt: boolean = false): Promise<boolean> => {
    if (!userId) return false;
    
    // INSTANT: Get video from preloaded queue
    const videos = rewardVideoStore.getVideosFromQueue(1);
    
    if (videos.length === 0) {
      logger.warn('[useVideoAdFlow] No videos in queue for daily gift');
      return false;
    }

    logger.log('[useVideoAdFlow] Starting daily gift double INSTANTLY with preloaded video');

    setState({
      showPrompt: !skipPrompt,
      showVideo: skipPrompt, // Go directly to video if skipping prompt
      videos,
      totalDuration: 15,
      isLoading: false,
      context: 'daily_gift',
      originalReward: originalCoins,
    });
    
    return true;
  }, [userId, rewardVideoStore]);

  // Start game end double flow - INSTANT, no backend call
  const startGameEndDouble = useCallback(async (coinsEarned: number): Promise<boolean> => {
    if (!userId) return false;
    
    // CRITICAL: Call onRewardStarted IMMEDIATELY before any work
    onRewardStarted?.();
    
    // INSTANT: Get video from preloaded queue
    const videos = rewardVideoStore.getVideosFromQueue(1);
    
    if (videos.length === 0) {
      logger.warn('[useVideoAdFlow] No videos in queue for game end');
      return false;
    }

    logger.log('[useVideoAdFlow] Starting game end double INSTANTLY with preloaded video');

    setState({
      showPrompt: false,
      showVideo: true, // Go directly to video, skip prompt
      videos,
      totalDuration: 15,
      isLoading: false,
      context: 'game_end',
      originalReward: coinsEarned,
    });
    
    return true;
  }, [userId, rewardVideoStore, onRewardStarted]);

  // Start refill flow (2 videos, 30 seconds total) - INSTANT, no backend call
  const startRefillFlow = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    
    // INSTANT: Get 2 videos from preloaded queue
    const videos = rewardVideoStore.getVideosFromQueue(2);
    
    if (videos.length < 2) {
      logger.warn('[useVideoAdFlow] Not enough videos in queue for refill');
      return false;
    }

    logger.log('[useVideoAdFlow] Starting refill INSTANTLY with preloaded videos');

    setState({
      showPrompt: false,
      showVideo: true, // Go directly to video, no prompt
      videos,
      totalDuration: 30,
      isLoading: false,
      context: 'refill',
      originalReward: 0,
    });
    
    return true;
  }, [userId, rewardVideoStore]);

  // Accept prompt - start watching videos
  const acceptPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPrompt: false,
      showVideo: true,
    }));
  }, []);

  // Decline prompt - close everything
  const declinePrompt = useCallback(() => {
    setState({
      showPrompt: false,
      showVideo: false,
      videos: [],
      totalDuration: 15,
      isLoading: false,
      context: null,
      originalReward: 0,
    });
  }, []);

  // Video watching completed - claim reward and close
  const onVideoComplete = useCallback(async () => {
    if (!state.context || !userId) {
      setState({
        showPrompt: false,
        showVideo: false,
        videos: [],
        totalDuration: 15,
        isLoading: false,
        context: null,
        originalReward: 0,
      });
      return;
    }

    // Use rewardVideoStore to complete session and credit reward
    const eventType = state.context === 'daily_gift' ? 'daily_gift' : 
                      state.context === 'game_end' ? 'end_game' : 'refill';
    
    // Start session (uses preloaded videos internally)
    const session = await rewardVideoStore.startRewardSession(
      userId,
      eventType,
      state.originalReward
    );
    
    if (session) {
      // Complete the session
      const result = await rewardVideoStore.completeRewardSession(
        state.videos.map(v => v.id)
      );
      
      if (result.success && onRewardClaimed) {
        onRewardClaimed(result.coinsDelta, result.livesDelta);
      }
    }

    // Consume videos from queue after use
    const usedIds = new Set(state.videos.map(v => v.id));
    useRewardVideoStore.setState(store => ({
      videoQueue: store.videoQueue.filter(v => !usedIds.has(v.id)),
    }));

    // Trigger background refill
    rewardVideoStore.refillQueueIfNeeded(userId);

    // Reset state
    setState({
      showPrompt: false,
      showVideo: false,
      videos: [],
      totalDuration: 15,
      isLoading: false,
      context: null,
      originalReward: 0,
    });
  }, [state, userId, rewardVideoStore, onRewardClaimed]);

  // Cancel video - just reset state, no reward
  const cancelVideo = useCallback(() => {
    setState({
      showPrompt: false,
      showVideo: false,
      videos: [],
      totalDuration: 15,
      isLoading: false,
      context: null,
      originalReward: 0,
    });
  }, []);

  return {
    // State
    showPrompt: state.showPrompt,
    showVideo: state.showVideo,
    videos: state.videos,
    totalDuration: state.totalDuration,
    isLoading: state.isLoading,
    context: state.context,
    originalReward: state.originalReward,
    isAvailable: rewardVideoStore.isPreloaded && rewardVideoStore.videoQueue.length > 0,
    
    // Availability checks - NOW SYNCHRONOUS, INSTANT
    checkDailyGiftDoubleAvailable,
    checkGameEndDoubleAvailable,
    checkRefillAvailable,
    
    // Flow starters
    startDailyGiftDouble,
    startGameEndDouble,
    startRefillFlow,
    
    // Actions
    acceptPrompt,
    declinePrompt,
    onVideoComplete,
    cancelVideo,
  };
};
