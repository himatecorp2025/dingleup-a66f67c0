import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCoinsForQuestion, START_GAME_REWARD } from '@/types/game';
import { useI18n } from '@/i18n';
import { useWalletStore } from '@/stores/walletStore';

interface UseGameRewardsOptions {
  userId: string | undefined;
  gameInstanceId: string;
  currentQuestionIndex: number;
  coinsEarned: number;
  broadcast: (event: string, data: any) => Promise<boolean>;
}

export const useGameRewards = ({
  userId,
  gameInstanceId,
  currentQuestionIndex,
  coinsEarned,
  broadcast
}: UseGameRewardsOptions) => {
  const { t } = useI18n();
  const [localCoinsEarned, setLocalCoinsEarned] = useState(coinsEarned);
  const [coinRewardAmount, setCoinRewardAmount] = useState(0);
  const [coinRewardTrigger, setCoinRewardTrigger] = useState(0);

  const creditStartReward = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const startSourceId = `${Date.now()}-start`;
      await supabase.functions.invoke('credit-gameplay-reward', {
        body: { amount: START_GAME_REWARD, sourceId: startSourceId, reason: 'game_start' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      setLocalCoinsEarned(START_GAME_REWARD);
      setCoinRewardAmount(START_GAME_REWARD);
      setCoinRewardTrigger(prev => prev + 1);
      
      // CRITICAL: Force immediate wallet refresh
      useWalletStore.getState().fetchWallet();
      
      await broadcast('wallet:update', { source: 'game_start', coinsDelta: START_GAME_REWARD });
    } catch (err) {
      console.error('[GameStart] Start reward credit failed:', err);
    }
  }, [broadcast]);

  const creditCorrectAnswer = useCallback(async () => {
    const reward = getCoinsForQuestion(currentQuestionIndex);

    // OPTIMIZED: Optimistic UI update FIRST for instant feedback
    setLocalCoinsEarned(prev => prev + reward);
    setCoinRewardAmount(reward);
    setCoinRewardTrigger(prev => prev + 1);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Rollback on error
        setLocalCoinsEarned(prev => prev - reward);
        toast.error(t('game.reward.session_expired'));
        return;
      }
      
      const sourceId = `${gameInstanceId}-q${currentQuestionIndex}`;
      
      // Non-blocking backend call (fire-and-forget for speed)
      supabase.functions.invoke('credit-gameplay-reward', {
        body: { amount: reward, sourceId, reason: 'correct_answer' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(({ error }) => {
        if (error) {
          console.error('[GameRewards] Backend credit failed:', error);
          // Backend failed, but UI already updated optimistically
        } else {
          // CRITICAL: Force wallet refresh after backend confirms
          useWalletStore.getState().fetchWallet();
        }
      });
      
      // Broadcast immediately (don't wait for backend)
      broadcast('wallet:update', { source: 'correct_answer', coinsDelta: reward });
    } catch (err) {
      console.error('[GameRewards] Error:', err);
      // UI already updated, no need to show error to user
    }
  }, [gameInstanceId, currentQuestionIndex, broadcast, t]);

  const resetRewardAnimation = useCallback(() => {
    setCoinRewardTrigger(0);
  }, []);

  return {
    coinsEarned: localCoinsEarned,
    coinRewardAmount,
    coinRewardTrigger,
    creditStartReward,
    creditCorrectAnswer,
    resetRewardAnimation,
    setCoinsEarned: setLocalCoinsEarned
  };
};
