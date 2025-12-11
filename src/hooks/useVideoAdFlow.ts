import { useState, useCallback, useEffect } from 'react';
import { useVideoAd, VideoData } from './useVideoAd';

interface UseVideoAdFlowOptions {
  userId: string | undefined;
  onRewardClaimed?: (coins: number, lives: number) => void;
}

interface VideoAdFlowState {
  showPrompt: boolean;
  showVideo: boolean;
  videos: VideoData[];
  totalDuration: number;
  isLoading: boolean;
  context: 'daily_gift' | 'game_end' | 'refill' | null;
  originalReward: number;
}

export const useVideoAdFlow = ({ userId, onRewardClaimed }: UseVideoAdFlowOptions) => {
  const [state, setState] = useState<VideoAdFlowState>({
    showPrompt: false,
    showVideo: false,
    videos: [],
    totalDuration: 15,
    isLoading: false,
    context: null,
    originalReward: 0,
  });

  const videoAd = useVideoAd();

  // Check if daily gift doubling is available
  const checkDailyGiftDoubleAvailable = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    return await videoAd.checkAvailability('daily_gift');
  }, [userId, videoAd]);

  // Check if game end doubling is available
  const checkGameEndDoubleAvailable = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    return await videoAd.checkAvailability('game_end');
  }, [userId, videoAd]);

  // Check if refill is available (2 videos)
  const checkRefillAvailable = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const videos = await videoAd.fetchRefillVideos();
    return videos.length >= 2;
  }, [userId, videoAd]);

  // Start daily gift double flow
  const startDailyGiftDouble = useCallback(async (originalCoins: number) => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    const available = await videoAd.checkAvailability('daily_gift');
    
    if (!available || videoAd.videos.length === 0) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setState({
      showPrompt: true,
      showVideo: false,
      videos: videoAd.videos,
      totalDuration: 15,
      isLoading: false,
      context: 'daily_gift',
      originalReward: originalCoins,
    });
  }, [userId, videoAd]);

  // Start game end double flow
  const startGameEndDouble = useCallback(async (coinsEarned: number) => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    const available = await videoAd.checkAvailability('game_end');
    
    if (!available || videoAd.videos.length === 0) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setState({
      showPrompt: true,
      showVideo: false,
      videos: videoAd.videos,
      totalDuration: 15,
      isLoading: false,
      context: 'game_end',
      originalReward: coinsEarned,
    });
  }, [userId, videoAd]);

  // Start refill flow (2 videos, 30 seconds total)
  const startRefillFlow = useCallback(async () => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    const videos = await videoAd.fetchRefillVideos();
    
    if (videos.length < 2) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setState({
      showPrompt: true,
      showVideo: false,
      videos,
      totalDuration: 30,
      isLoading: false,
      context: 'refill',
      originalReward: 0,
    });
  }, [userId, videoAd]);

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

  // Video watching completed - claim reward
  const onVideoComplete = useCallback(async () => {
    if (!state.context) return;

    const idempotencyKey = `video-ad-${state.context}-${userId}-${Date.now()}`;

    // Log impressions for all videos
    for (let i = 0; i < state.videos.length; i++) {
      await videoAd.logImpression(
        state.videos[i].id,
        state.context,
        true, // watched full 15s
        videoAd.isRelevant,
        i + 1
      );
    }

    // Claim reward based on context
    let rewardType: 'daily_gift_double' | 'game_end_double' | 'refill';
    
    if (state.context === 'daily_gift') {
      rewardType = 'daily_gift_double';
    } else if (state.context === 'game_end') {
      rewardType = 'game_end_double';
    } else {
      rewardType = 'refill';
    }

    const result = await videoAd.claimReward(
      rewardType,
      state.originalReward,
      idempotencyKey
    );

    if (result.success && onRewardClaimed) {
      onRewardClaimed(result.coinsCredited || 0, result.livesCredited || 0);
    }

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
  }, [state, userId, videoAd, onRewardClaimed]);

  // Cancel video watching (before completion)
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
    isLoading: state.isLoading || videoAd.isLoading,
    context: state.context,
    originalReward: state.originalReward,
    isAvailable: videoAd.isAvailable,
    
    // Availability checks
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
