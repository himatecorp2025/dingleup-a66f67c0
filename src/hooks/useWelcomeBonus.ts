import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

export const useWelcomeBonus = (userId: string | undefined) => {
  const { t } = useI18n();
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLater, setShowLater] = useState(false);

  const checkWelcomeBonus = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // TESTING MODE: Check if this is DingleUP admin user
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('welcome_bonus_claimed, username')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Normal logic: if already claimed, don't show
      if (profile?.welcome_bonus_claimed) {
        setCanClaim(false);
        setLoading(false);
        return;
      }

      setCanClaim(true);
      trackEvent('popup_impression', 'welcome');
      setLoading(false);
    } catch (error) {
      setCanClaim(false);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkWelcomeBonus();
  }, [checkWelcomeBonus]);

  const claimWelcomeBonus = async () => {
    if (!userId || claiming) return false;

    setClaiming(true);

    try {
      // Normal claim logic
      const { data, error } = await supabase.rpc('claim_welcome_bonus');
      
      if (error) {
        const errorMsg = error.message || t('welcome.claim_error');
        toast.error(errorMsg);
        return false;
      }
      
      const result = data as { success: boolean; coins: number; lives: number; error?: string };
      if (result.success) {
        // Track claim BEFORE showing success message
        trackEvent('popup_cta_click', 'welcome', 'claim');
        
        setCanClaim(false);
        
        // Show success toast with actual amounts
        toast.success(`${t('welcome.claimed_success_emoji')} +${result.coins} ${t('welcome.gold')}, +${result.lives} ${t('welcome.life')}`);
        
        return true;
      } else {
        toast.error(result.error || t('welcome.claim_error'));
        return false;
      }
    } catch (error: any) {
      const errorMsg = error?.message || t('welcome.claim_error');
      toast.error(errorMsg);
      return false;
    } finally {
      setClaiming(false);
    }
  };

  const handleLater = async () => {
    if (!userId) return;
    
    try {
      // Mark as claimed so it won't appear again
      await supabase
        .from('profiles')
        .update({ welcome_bonus_claimed: true })
        .eq('id', userId);
      
      setCanClaim(false);
      
      // Track later action (user dismissed without claiming)
      trackEvent('popup_cta_click', 'welcome', 'dismissed');
    } catch (error) {
      console.error('Error marking welcome bonus as dismissed:', error);
      // Even if error, close the popup locally
      setCanClaim(false);
    }
  };

  return {
    canClaim,
    claiming,
    loading,
    claimWelcomeBonus,
    handleLater
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
  
  logger.log(`[Analytics] ${event}`, { type, action });
};
