import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Mobile WebView Fallback: Polling-based payment verification
 * 
 * If user closes Stripe popup without redirect (iOS Safari/WebView edge case),
 * this hook polls localStorage for pending payment sessions and attempts verification.
 */
export const usePaymentPolling = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVerifyingRef = useRef(false);
  const retryCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const checkPendingPayments = async () => {
      if (isVerifyingRef.current) return;

      const pendingSpeed = localStorage.getItem('pending_speed_session');
      const pendingPremium = localStorage.getItem('pending_premium_session');
      const pendingRescue = localStorage.getItem('pending_rescue_session');

      if (!pendingSpeed && !pendingPremium && !pendingRescue) {
        return;
      }

      isVerifyingRef.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          isVerifyingRef.current = false;
          return;
        }

        // Try to verify each pending session

        if (pendingSpeed) {
          const { sessionId, timestamp } = JSON.parse(pendingSpeed);
          const retryKey = `speed_${sessionId}`;
          
          if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('pending_speed_session');
            delete retryCountsRef.current[retryKey];
          } else {
            const { data, error } = await supabase.functions.invoke('verify-speed-boost-payment', {
              body: { sessionId },
              headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!error && data?.success) {
              localStorage.removeItem('pending_speed_session');
              delete retryCountsRef.current[retryKey];
              toast.success(t('payment.polling.speed_verified'), { duration: 3000 });
              queryClient.invalidateQueries({ queryKey: ['wallet'] });
            } else {
              retryCountsRef.current[retryKey] = (retryCountsRef.current[retryKey] || 0) + 1;
              if (retryCountsRef.current[retryKey] >= 3) {
                localStorage.removeItem('pending_speed_session');
                delete retryCountsRef.current[retryKey];
                console.log('[usePaymentPolling] Speed boost payment verification failed after 3 attempts, cleared from localStorage');
              }
            }
          }
        }

        if (pendingPremium) {
          const { sessionId, timestamp } = JSON.parse(pendingPremium);
          const retryKey = `premium_${sessionId}`;
          
          if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('pending_premium_session');
            delete retryCountsRef.current[retryKey];
          } else {
            const { data, error } = await supabase.functions.invoke('verify-premium-booster-payment', {
              body: { sessionId },
              headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!error && data?.success) {
              localStorage.removeItem('pending_premium_session');
              delete retryCountsRef.current[retryKey];
              const successMsg = `${t('payment.success.rewards_prefix')} +${data.grantedRewards?.gold} ${t('payment.success.gold')} ${t('payment.success.and')} +${data.grantedRewards?.lives} ${t('payment.success.lives')} ${t('payment.success.rewards_suffix')}`;
              toast.success(successMsg, { duration: 3000 });
              queryClient.invalidateQueries({ queryKey: ['wallet'] });
            } else {
              retryCountsRef.current[retryKey] = (retryCountsRef.current[retryKey] || 0) + 1;
              if (retryCountsRef.current[retryKey] >= 3) {
                localStorage.removeItem('pending_premium_session');
                delete retryCountsRef.current[retryKey];
                console.log('[usePaymentPolling] Premium booster payment verification failed after 3 attempts, cleared from localStorage');
              }
            }
          }
        }

        if (pendingRescue) {
          const { sessionId, timestamp } = JSON.parse(pendingRescue);
          const retryKey = `rescue_${sessionId}`;
          
          if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('pending_rescue_session');
            delete retryCountsRef.current[retryKey];
          } else {
            const { data, error } = await supabase.functions.invoke('verify-instant-rescue-payment', {
              body: { sessionId },
              headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!error && data?.success) {
              localStorage.removeItem('pending_rescue_session');
              delete retryCountsRef.current[retryKey];
              const successMsg = `${t('payment.success.rewards_prefix')} +${data.grantedRewards?.gold} ${t('payment.success.gold')} ${t('payment.success.and')} +${data.grantedRewards?.lives} ${t('payment.success.lives')} ${t('payment.success.rewards_suffix')}`;
              toast.success(successMsg, { duration: 3000 });
              queryClient.invalidateQueries({ queryKey: ['wallet'] });
            } else {
              retryCountsRef.current[retryKey] = (retryCountsRef.current[retryKey] || 0) + 1;
              if (retryCountsRef.current[retryKey] >= 3) {
                localStorage.removeItem('pending_rescue_session');
                delete retryCountsRef.current[retryKey];
                console.log('[usePaymentPolling] Instant rescue payment verification failed after 3 attempts, cleared from localStorage');
              }
            }
          }
        }
      } catch (err) {
        console.error('[usePaymentPolling] Error during polling verification:', err);
      } finally {
        isVerifyingRef.current = false;
      }
    };

    // Check immediately on mount
    checkPendingPayments();

    // Poll every 10 seconds
    pollingIntervalRef.current = setInterval(checkPendingPayments, 10000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [t, queryClient]);
};
