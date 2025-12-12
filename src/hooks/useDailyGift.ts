import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';
export const useDailyGift = (userId: string | undefined, isPremium: boolean = false) => {
  const { t } = useI18n();
  const [canClaim, setCanClaim] = useState(false);
  const [weeklyEntryCount, setWeeklyEntryCount] = useState(0);
  const [nextReward, setNextReward] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const checkDailyGift = async () => {
    if (!userId) return;

    try {
      // Call backend edge function to get status (timezone-aware)
      const { data, error } = await supabase.functions.invoke('get-daily-gift-status');

      if (error) {
        logger.error('Daily gift status error:', error);
        return;
      }

      if (data.canShow) {
        setWeeklyEntryCount(data.streak ?? 0);
        setNextReward(data.nextReward ?? 0);
        setCanClaim(true);
        setShowPopup(true);
        trackEvent('popup_impression', 'daily');
      } else {
        setCanClaim(false);
        setShowPopup(false);
      }
    } catch (error) {
      logger.error('Daily gift check error:', error);
    }
  };

  const showDailyGiftPopup = () => {
    if (canClaim) {
      setShowPopup(true);
      trackEvent('daily_gift_popup_shown', 'daily');
    }
  };

  const claimDailyGift = async (refetchWallet?: () => Promise<void>): Promise<boolean> => {
    if (!userId || claiming) return false;
    
    setClaiming(true);
    
    try {
      const { data, error } = await supabase.rpc('claim_daily_gift');
      
      if (error) {
        const errorMsg = error.message || t('daily.claim_error');
        toast({
          title: t('errors.error_title'),
          description: errorMsg,
          variant: 'destructive',
          duration: 4000,
        });
        return false;
      }
      
      const result = data as { success: boolean; grantedCoins: number; walletBalance: number; streak: number; error?: string };
      
      if (result.success) {
        trackEvent('daily_gift_claimed', 'daily', result.grantedCoins.toString());
        
        setCanClaim(false);
        setShowPopup(false);
        
        toast({
          title: t('daily.claimed_title'),
          description: `+${result.grantedCoins} ${t('daily.gold')}`,
          duration: 3000,
        });
        
        if (refetchWallet) await refetchWallet();
        
        return true;
      } else {
        let errorKey = 'daily.claim_error';
        if (result.error === 'NOT_LOGGED_IN') {
          errorKey = 'daily.error.not_logged_in';
        } else if (result.error === 'PROFILE_NOT_FOUND') {
          errorKey = 'daily.error.profile_not_found';
        } else if (result.error === 'ALREADY_CLAIMED_TODAY') {
          errorKey = 'daily.error.already_claimed_today';
        } else if (result.error === 'SERVER_ERROR') {
          errorKey = 'daily.error.server_error';
        }
        
        toast({
          title: t('errors.error_title'),
          description: t(errorKey),
          variant: 'destructive',
          duration: 4000,
        });
        return false;
      }
    } catch (error: any) {
      const errorMsg = error?.message || t('daily.claim_error');
      toast({
        title: t('errors.error_title'),
        description: errorMsg,
        variant: 'destructive',
        duration: 4000,
      });
      return false;
    } finally {
      setClaiming(false);
    }
  };

  const handleLater = async () => {
    if (!userId) return;
    
    try {
      // Call backend to mark as dismissed (timezone-aware)
      const { error } = await supabase.functions.invoke('dismiss-daily-gift');
      
      if (error) {
        logger.error('Dismiss error:', error);
      }
      
      setShowPopup(false);
      
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'popup_dismissed', {
          event_category: 'daily_gift',
          event_label: 'user_dismissed',
        });
      }
    } catch (error) {
      logger.error('Dismiss catch error:', error);
      setShowPopup(false);
    }
  };

  useEffect(() => {
    checkDailyGift();
  }, [userId, isPremium]);

  return {
    canClaim,
    showPopup,
    weeklyEntryCount,
    nextReward,
    claiming,
    claimDailyGift,
    checkDailyGift,
    handleLater,
    showDailyGiftPopup,
    setShowPopup
  };
};

// Analytics helper
const trackEvent = (event: string, type: string, action?: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      type,
      action,
      timestamp: new Date().toISOString()
    });
  }
};
