import { useState, useCallback } from 'react';
import { getCoinsForQuestion, START_GAME_REWARD } from '@/types/game';

interface UseGameRewardsOptions {
  userId: string | undefined;
  gameInstanceId: string;
  currentQuestionIndex: number;
  coinsEarned: number;
  broadcast: (event: string, data: any) => Promise<boolean>;
}

/**
 * SIMPLIFIED REWARD SYSTEM:
 * - Frontend-only coin animations during gameplay (no backend calls per question)
 * - Coins accumulate in memory only
 * - Single backend credit at game end via complete-game or claim-video-reward
 */
export const useGameRewards = ({
  userId,
  gameInstanceId,
  currentQuestionIndex,
  coinsEarned,
  broadcast
}: UseGameRewardsOptions) => {
  const [localCoinsEarned, setLocalCoinsEarned] = useState(coinsEarned);
  const [coinRewardAmount, setCoinRewardAmount] = useState(0);
  const [coinRewardTrigger, setCoinRewardTrigger] = useState(0);

  // Start reward - frontend only, adds to visual counter
  // Only trigger animation if there's actually a reward (START_GAME_REWARD > 0)
  const creditStartReward = useCallback(async () => {
    if (START_GAME_REWARD > 0) {
      setLocalCoinsEarned(START_GAME_REWARD);
      setCoinRewardAmount(START_GAME_REWARD);
      setCoinRewardTrigger(prev => prev + 1);
      await broadcast('wallet:update', { source: 'game_start', coinsDelta: START_GAME_REWARD });
    }
    // If START_GAME_REWARD = 0, do nothing (no animation, no coins)
  }, [broadcast]);

  // Correct answer reward - frontend only, no backend calls
  const creditCorrectAnswer = useCallback(async () => {
    const reward = getCoinsForQuestion(currentQuestionIndex);

    // Frontend-only: update visual counter immediately
    setLocalCoinsEarned(prev => prev + reward);
    setCoinRewardAmount(reward);
    setCoinRewardTrigger(prev => prev + 1);

    // Broadcast for UI sync only (no DB call)
    broadcast('wallet:update', { source: 'correct_answer', coinsDelta: reward });
  }, [currentQuestionIndex, broadcast]);

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
