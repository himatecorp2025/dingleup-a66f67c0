import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreatorSubscription {
  status: string | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  package_type: string | null;
}

export const useCreatorSubscription = (userId: string | undefined) => {
  const [subscription, setSubscription] = useState<CreatorSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('check-creator-subscription', {});

      if (invokeError) throw invokeError;

      if (data?.has_subscription) {
        setSubscription({
          status: data.status,
          trial_ends_at: data.trial_ends_at,
          current_period_ends_at: data.current_period_ends_at,
          package_type: data.package_type,
        });
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error fetching creator subscription:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasActiveSubscription = subscription && 
    ['active', 'active_trial', 'cancel_at_period_end'].includes(subscription.status || '');

  const isTrialing = subscription?.status === 'active_trial';
  const isCanceling = subscription?.status === 'cancel_at_period_end';

  return {
    subscription,
    isLoading,
    error,
    hasActiveSubscription,
    isTrialing,
    isCanceling,
    refetch: fetchSubscription,
  };
};
