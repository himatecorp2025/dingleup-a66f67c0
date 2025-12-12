import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

export interface DailyRankReward {
  rank: number;
  gold: number;
  lives: number;
  isSundayJackpot: boolean;
  dayDate: string;
  username: string;
  rewardPayload?: any;
}

/**
 * Hook to manage daily rank reward popup
 * Shows popup when user has pending rank reward from yesterday
 */
export const useDailyRankReward = (userId: string | undefined) => {
  const { t } = useI18n();
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [pendingReward, setPendingReward] = useState<DailyRankReward | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Fetch pending reward on mount and when userId changes
  useEffect(() => {
    if (!userId) {
      setPendingReward(null);
      setShowRewardPopup(false);
      return;
    }

  const fetchPendingReward = async () => {
    setIsLoading(true);
    try {
      // Ensure valid session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[RANK-REWARD] No active session');
        setPendingReward(null);
        setShowRewardPopup(false);
        setIsLoading(false);
        return;
      }

      // Check profile exists
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!profileCheck) {
        console.log('[RANK-REWARD] Profile not found');
        setPendingReward(null);
        setShowRewardPopup(false);
        setIsLoading(false);
        return;
      }

      // CRITICAL: Trigger on-demand daily winners processing via RPC (bypasses edge function auth issues)
      console.log('[RANK-REWARD] Triggering on-demand daily winners processing via RPC...');
      try {
        // Calculate yesterday's date in user's local timezone
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        
        const { data: processResult, error: processError } = await supabase
          .rpc('process_daily_winners_for_date', { p_target_date: yesterdayDate });
        
        if (processError) {
          console.warn('[RANK-REWARD] Daily winners RPC error (non-blocking):', processError);
        } else {
          console.log('[RANK-REWARD] Daily winners processing completed:', processResult);
        }
      } catch (processException) {
        console.warn('[RANK-REWARD] Daily winners processing exception (non-blocking):', processException);
      }

      // Call edge function to check pending reward
      const { data, error } = await supabase.functions.invoke('get-pending-rank-reward', {
        body: {}
      });

      if (error) {
        console.error('[RANK-REWARD] Error fetching pending reward:', error);
        setPendingReward(null);
        setShowRewardPopup(false);
        return;
      }

      if (data.hasPendingReward && data.reward) {
        console.log('[RANK-REWARD] Found pending reward:', data.reward);
        setPendingReward(data.reward);
        setShowRewardPopup(true);
      } else {
        setPendingReward(null);
        setShowRewardPopup(false);
      }
    } catch (error) {
      console.error('[RANK-REWARD] Exception:', error);
      setPendingReward(null);
      setShowRewardPopup(false);
    } finally {
      setIsLoading(false);
    }
  };

    fetchPendingReward();
  }, [userId]);

  const claimReward = async () => {
    if (!pendingReward || isClaiming) return { success: false };

    setIsClaiming(true);
    try {
      // CRITICAL FIX: Refresh session to ensure valid token before calling edge function
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        console.error('[RANK-REWARD] Session refresh failed when claiming reward:', sessionError);
        toast({
          title: t('rank_reward.claim_error_title'),
          description: t('errors.session_expired'),
          variant: 'destructive',
          duration: 4000,
        });
        return { success: false };
      }

      const { data, error } = await supabase.functions.invoke('claim-daily-rank-reward', {
        body: { day_date: pendingReward.dayDate }
      });

      if (error || !data?.success) {
        console.error('[RANK-REWARD] Error claiming reward:', error);

        toast({
          title: t('rank_reward.claim_error_title'),
          description: t('rank_reward.claim_error_desc'),
          variant: 'destructive',
          duration: 4000,
        });

        return { success: false };
      }

      console.log('[RANK-REWARD] Reward claimed successfully:', data);

      // Close popup and clear state on success
      setShowRewardPopup(false);
      setPendingReward(null);

      // Show success toast
      toast({
        title: t('rank_reward.claim_success_title'),
        description: t('rank_reward.claim_success_desc')
          .replace('{gold}', data.goldCredited.toString())
          .replace('{lives}', data.livesCredited.toString()),
        duration: 3000,
      });
      
      return { success: true };
    } catch (error) {
      console.error('[RANK-REWARD] Exception claiming reward:', error);

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
      const { error } = await supabase.functions.invoke('dismiss-daily-rank-reward', {
        body: { day_date: pendingReward.dayDate }
      });

      if (error) {
        console.error('[RANK-REWARD] Error dismissing reward:', error);
      }

      console.log('[RANK-REWARD] Reward dismissed (lost)');
      
      // Close popup and clear state
      setShowRewardPopup(false);
      setPendingReward(null);
    } catch (error) {
      console.error('[RANK-REWARD] Exception dismissing reward:', error);
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
