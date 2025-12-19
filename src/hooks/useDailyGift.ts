import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

/**
 * Calculate milliseconds until midnight in user's timezone
 */
function getMillisecondsUntilMidnightForTimezone(userTimezone: string): number {
  try {
    const now = new Date();
    
    // Get the current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    const hours = parseInt(getPart('hour'), 10);
    const minutes = parseInt(getPart('minute'), 10);
    const seconds = parseInt(getPart('second'), 10);
    
    // Calculate milliseconds until midnight
    const msUntilMidnight = 
      ((23 - hours) * 60 * 60 * 1000) +
      ((59 - minutes) * 60 * 1000) +
      ((60 - seconds) * 1000);
    
    // Add buffer of 2 seconds to ensure we're past midnight
    return msUntilMidnight + 2000;
  } catch (e) {
    logger.error('Failed to calculate midnight for timezone:', e);
    // Fallback: 1 hour
    return 60 * 60 * 1000;
  }
}

export const useDailyGift = (userId: string | undefined, isPremium: boolean = false) => {
  const { t } = useI18n();
  const [canClaim, setCanClaim] = useState(false);
  const [weeklyEntryCount, setWeeklyEntryCount] = useState(0);
  const [nextReward, setNextReward] = useState(0);
  const [baseReward, setBaseReward] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [yesterdayRank, setYesterdayRank] = useState<number | null>(null);
  const [isTop10Yesterday, setIsTop10Yesterday] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store the user timezone for midnight watcher
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const midnightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which local date we've shown the popup for (in-memory guard)
  const shownForLocalDateRef = useRef<string | null>(null);

  const checkDailyGift = useCallback(async () => {
    if (!userId) {
      setIsInitialized(true);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-daily-gift-status');

      if (error) {
        logger.error('Daily gift status error:', error);
        setIsInitialized(true);
        return;
      }

      // Store timezone for midnight watcher
      if (data.timeZone) {
        setUserTimezone(data.timeZone);
      }

      const localDate = data.localDate as string;

      if (data.canShow) {
        // Check in-memory guard: don't show twice for the same local date
        if (shownForLocalDateRef.current === localDate) {
          logger.log('[useDailyGift] Already shown popup for local date:', localDate);
          setIsInitialized(true);
          return;
        }

        setWeeklyEntryCount(data.streak ?? 0);
        setNextReward(data.nextReward ?? 0);
        setBaseReward(data.baseReward ?? data.nextReward ?? 0);
        setMultiplier(data.multiplier ?? 1);
        setYesterdayRank(data.yesterdayRank ?? null);
        setIsTop10Yesterday(data.isTop10Yesterday ?? false);
        setCanClaim(true);
        setShowPopup(true);
        shownForLocalDateRef.current = localDate;
        trackEvent('popup_impression', 'daily');
        logger.log('[useDailyGift] Daily Gift popup triggered for:', localDate);
      } else {
        setCanClaim(false);
        setShowPopup(false);
        logger.log('[useDailyGift] Daily Gift not eligible. Reason:', data.reason || 'already claimed/seen');
      }
      
      setIsInitialized(true);
    } catch (error) {
      logger.error('Daily gift check error:', error);
      setIsInitialized(true);
    }
  }, [userId]);

  const showDailyGiftPopup = () => {
    if (canClaim) {
      setShowPopup(true);
      trackEvent('daily_gift_popup_shown', 'daily');
    }
  };

  const claimDailyGift = async (claimType: 'base' | 'ad' = 'base', refetchWallet?: () => Promise<void>): Promise<boolean> => {
    if (!userId || claiming) return false;
    
    setClaiming(true);
    
    try {
      // Call RPC with claimType parameter - backend calculates final reward
      // Using any cast because the RPC signature will be updated in migration
      const { data, error } = await (supabase.rpc as any)('claim_daily_gift', {
        p_claim_type: claimType
      });
      
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
      
      const result = data as { success: boolean; grantedCoins: number; walletBalance: number; streak: number; multiplier: number; claimType: string; error?: string };
      
      if (result.success) {
        trackEvent('daily_gift_claimed', claimType, result.grantedCoins.toString());
        
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
      const { error } = await supabase.functions.invoke('dismiss-daily-gift');
      
      if (error) {
        logger.error('Dismiss error:', error);
      }
      
      setShowPopup(false);
      setCanClaim(false);
      
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

  // Initial check on mount/userId change
  useEffect(() => {
    checkDailyGift();
  }, [checkDailyGift]);

  // MIDNIGHT WATCHER: Schedule a check when user timezone midnight is reached
  useEffect(() => {
    if (!userId || !userTimezone || userTimezone === 'UTC') return;

    // Clear any existing timeout
    if (midnightTimeoutRef.current) {
      clearTimeout(midnightTimeoutRef.current);
      midnightTimeoutRef.current = null;
    }

    const scheduleMidnightCheck = () => {
      const msUntilMidnight = getMillisecondsUntilMidnightForTimezone(userTimezone);
      
      logger.log('[useDailyGift] Midnight watcher scheduled for', userTimezone, 'in', Math.round(msUntilMidnight / 1000 / 60), 'minutes');
      
      midnightTimeoutRef.current = setTimeout(() => {
        logger.log('[useDailyGift] Midnight reached! Re-checking daily gift status');
        // Reset the shown-for guard so the new day's popup can appear
        shownForLocalDateRef.current = null;
        checkDailyGift();
        
        // Schedule the next midnight check (for if user stays on Dashboard for 24+ hours)
        scheduleMidnightCheck();
      }, msUntilMidnight);
    };

    scheduleMidnightCheck();

    return () => {
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
        midnightTimeoutRef.current = null;
      }
    };
  }, [userId, userTimezone, checkDailyGift]);

  return {
    canClaim,
    showPopup,
    weeklyEntryCount,
    nextReward,
    baseReward,
    multiplier,
    yesterdayRank,
    isTop10Yesterday,
    claiming,
    isInitialized,
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
