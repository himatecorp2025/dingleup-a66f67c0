import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreatorSubscription {
  id: string;
  user_id: string;
  package_type: 'starter' | 'creator_plus' | 'creator_pro' | 'creator_max';
  status: 'inactive' | 'active_trial' | 'active' | 'cancelled' | 'expired';
  max_videos: number;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
}

export const useCreatorSubscription = (userId: string | undefined) => {
  const [subscription, setSubscription] = useState<CreatorSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('creator_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setSubscription(data as CreatorSubscription);
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Error fetching creator subscription:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  const hasActiveSubscription = subscription && 
    ['active_trial', 'active'].includes(subscription.status);

  const maxVideos = subscription?.max_videos || 0;

  return {
    subscription,
    isLoading,
    error,
    hasActiveSubscription,
    maxVideos,
    refetch: async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('creator_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setSubscription(data as CreatorSubscription);
        } else {
          setSubscription(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
  };
};
