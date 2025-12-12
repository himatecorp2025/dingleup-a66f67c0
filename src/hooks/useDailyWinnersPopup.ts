import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * SIMPLIFIED Hook: Show Daily Winners popup once per day
 * Logic: 
 * - If user is in yesterday's winners (has pending reward) → DON'T show (PersonalWinner shows instead)
 * - Otherwise show DailyWinners once per day (tracked in daily_winners_popup_views)
 */
export const useDailyWinnersPopup = (userId: string | undefined, hasPendingReward: boolean) => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!userId) {
      setShowPopup(false);
      return;
    }

    // If user has pending reward, PersonalWinner will show - skip DailyWinners
    if (hasPendingReward) {
      setShowPopup(false);
      return;
    }

    const checkIfShouldShow = async () => {
      try {
        // Get today's date in local timezone
        const today = new Date().toISOString().split('T')[0];

        // Check if already shown today
        const { data: viewRecord } = await supabase
          .from('daily_winners_popup_views')
          .select('last_shown_day')
          .eq('user_id', userId)
          .maybeSingle();

        if (viewRecord?.last_shown_day === today) {
          // Already shown today
          setShowPopup(false);
          return;
        }

        // Show popup
        setShowPopup(true);
      } catch (error) {
        logger.error('[DAILY-WINNERS-POPUP] Error:', error);
        setShowPopup(false);
      }
    };

    checkIfShouldShow();
  }, [userId, hasPendingReward]);

  const closePopup = async () => {
    if (!userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Mark as shown for today
      await supabase
        .from('daily_winners_popup_views')
        .upsert(
          {
            user_id: userId,
            last_shown_day: today,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      setShowPopup(false);
    } catch (error) {
      logger.error('[DAILY-WINNERS-POPUP] Close error:', error);
      setShowPopup(false);
    }
  };

  return {
    showPopup,
    closePopup,
  };
};
