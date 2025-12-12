import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface AdminMetrics {
  totalUsers: number;
  activeUsersToday: number;
  totalGamesPlayed: number;
  totalInvitations: number;
  totalPurchases: number;
  totalReports: number;
  geniusUsers: number;
  totalCoins: number;
  avgSessionDuration: number;
}

const ADMIN_METRICS_KEY = 'admin-metrics';

async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const response = await supabase.functions.invoke('admin-dashboard-data');

  if (response.error) throw response.error;
  if (!response.data?.success) throw new Error('Failed to fetch admin metrics');

  return response.data.data;
}

export function useAdminMetricsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_METRICS_KEY],
    queryFn: fetchAdminMetrics,
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No garbage collection delay
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on component mount
  });

  // Real-time subscription for admin metrics updates
  useEffect(() => {
    logger.log('[useAdminMetricsQuery] Setting up realtime subscription');

    const channel = supabase
      .channel('admin-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          logger.log('[useAdminMetricsQuery] Profiles update received:', payload);
          queryClient.refetchQueries({
            queryKey: [ADMIN_METRICS_KEY],
            exact: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_results',
        },
        (payload) => {
          logger.log('[useAdminMetricsQuery] Game results update received:', payload);
          queryClient.refetchQueries({
            queryKey: [ADMIN_METRICS_KEY],
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
          logger.log('[useAdminMetricsQuery] Purchases update received:', payload);
          queryClient.refetchQueries({
            queryKey: [ADMIN_METRICS_KEY],
            exact: true,
          });
        }
      )
      .subscribe((status) => {
        logger.log('[useAdminMetricsQuery] Subscription status:', status);
      });

    return () => {
      logger.log('[useAdminMetricsQuery] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    metrics: query.data,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
