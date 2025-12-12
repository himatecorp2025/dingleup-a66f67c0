import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface RevenueDataPoint {
  date: string;
  revenue: number;
}

interface ProductRevenue {
  product: string;
  revenue: number;
  count: number;
}

export interface MonetizationAnalytics {
  totalRevenue: number;
  arpu: number;
  arppu: number;
  conversionRate: number;
  totalUsers: number;
  payingUsers: number;
  revenueOverTime: RevenueDataPoint[];
  revenueByProduct: ProductRevenue[];
}

const MONETIZATION_ANALYTICS_KEY = 'monetization-analytics';

async function fetchMonetizationAnalytics(): Promise<MonetizationAnalytics> {
  // Ensure we always call the admin function with the current user JWT,
  // same mint a többi admin analitika hooknál
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const { data, error } = await supabase.functions.invoke('admin-monetization-analytics', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;
  return data as MonetizationAnalytics;
}


export function useMonetizationAnalyticsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [MONETIZATION_ANALYTICS_KEY],
    queryFn: fetchMonetizationAnalytics,
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No garbage collection delay
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on component mount
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    logger.log('[useMonetizationAnalyticsQuery] Setting up realtime subscription');

    const channel = supabase
      .channel('monetization-analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booster_purchases',
        },
        (payload) => {
          logger.log('[useMonetizationAnalyticsQuery] Booster purchases update received:', payload);
          queryClient.refetchQueries({
            queryKey: [MONETIZATION_ANALYTICS_KEY],
            exact: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
        },
        (payload) => {
          logger.log('[useMonetizationAnalyticsQuery] Purchases update received:', payload);
          queryClient.refetchQueries({
            queryKey: [MONETIZATION_ANALYTICS_KEY],
            exact: true,
          });
        }
      )
      .subscribe((status) => {
        logger.log('[useMonetizationAnalyticsQuery] Subscription status:', status);
      });

    return () => {
      logger.log('[useMonetizationAnalyticsQuery] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    analytics: query.data,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
