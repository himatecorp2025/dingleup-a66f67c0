import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

export interface DailyRankReward {
  rank: number;
  gold: number;
  lives: number;
  isSundayJackpot: boolean;
  dayDate: string;
  username: string;
}

/**
 * SIMPLIFIED Hook: Check if user has pending reward from yesterday
 * Logic: Query daily_winner_awarded where user_id + status='pending'
 */
export const useDailyRankReward = (userId: string | undefined) => {
  const { t } = useI18n();
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [pendingReward, setPendingReward] = useState<DailyRankReward | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPendingReward(null);
      setShowRewardPopup(false);
      return;
    }

    const checkPendingReward = async () => {
      setIsLoading(true);
      try {
        // Simple direct query: does this user have a pending reward?
        const { data: reward, error } = await supabase
          .from('daily_winner_awarded')
          .select('rank, gold_awarded, lives_awarded, is_sunday_jackpot, day_date, username')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .maybeSingle();

        if (error) {
          logger.error('[RANK-REWARD] Query error:', error);
          setPendingReward(null);
          setShowRewardPopup(false);
          return;
        }

        if (reward) {
          logger.log('[RANK-REWARD] Found pending reward:', reward);
          setPendingReward({
            rank: reward.rank,
            gold: reward.gold_awarded,
            lives: reward.lives_awarded,
            isSundayJackpot: reward.is_sunday_jackpot || false,
            dayDate: reward.day_date,
            username: reward.username || 'Player',
          });
          setShowRewardPopup(true);
        } else {
          setPendingReward(null);
          setShowRewardPopup(false);
        }
      } catch (error) {
        logger.error('[RANK-REWARD] Exception:', error);
        setPendingReward(null);
        setShowRewardPopup(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPendingReward();
  }, [userId]);

  const claimReward = async () => {
    if (!pendingReward || isClaiming) return { success: false };

    setIsClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-daily-rank-reward', {
        body: { day_date: pendingReward.dayDate }
      });

      if (error || !data?.success) {
        logger.error('[RANK-REWARD] Claim error:', error);
        toast({
          title: t('rank_reward.claim_error_title'),
          description: t('rank_reward.claim_error_desc'),
          variant: 'destructive',
          duration: 4000,
        });
        return { success: false };
      }

      logger.log('[RANK-REWARD] Claimed successfully:', data);
      setShowRewardPopup(false);
      setPendingReward(null);

      toast({
        title: t('rank_reward.claim_success_title'),
        description: t('rank_reward.claim_success_desc')
          .replace('{gold}', data.goldCredited.toString())
          .replace('{lives}', data.livesCredited.toString()),
        duration: 3000,
      });
      
      return { success: true };
    } catch (error) {
      logger.error('[RANK-REWARD] Claim exception:', error);
      toast({
        title: t('rank_reward.claim_error_title'),
        description: t('rank_reward.claim_exception_desc'),
        variant: 'destructive',
        duration: 4000,
      });
      return { success: false };
    } finally {
      setIsClaiming(false);
    }
  };

  const dismissReward = async () => {
    if (!pendingReward) return;

    try {
      // Update status to 'lost' directly
      const { error } = await supabase
        .from('daily_winner_awarded')
        .update({ 
          status: 'lost', 
          dismissed_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('day_date', pendingReward.dayDate)
        .eq('status', 'pending');

      if (error) {
        logger.error('[RANK-REWARD] Dismiss error:', error);
      }

      logger.log('[RANK-REWARD] Dismissed (lost)');
      setShowRewardPopup(false);
      setPendingReward(null);
    } catch (error) {
      logger.error('[RANK-REWARD] Dismiss exception:', error);
    }
  };

  return {
    showRewardPopup,
    pendingReward,
    isLoading,
    isClaiming,
    claimReward,
    dismissReward
  };
};
