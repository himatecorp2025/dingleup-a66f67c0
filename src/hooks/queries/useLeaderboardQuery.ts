import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_correct_answers: number;
  country_code: string;
}

interface RankReward {
  rank: number;
  gold: number;
  life: number;
}

export interface DailyRewardsData {
  day: string;
  type: 'NORMAL' | 'JACKPOT';
  rewards: RankReward[];
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  dailyRewards: DailyRewardsData;
}

const LEADERBOARD_QUERY_KEY = (countryCode: string) => ['leaderboard', 'v2', countryCode];

async function fetchLeaderboard(countryCode: string): Promise<LeaderboardResponse> {
  const response = await supabase.functions.invoke('get-daily-leaderboard-by-country', {
    body: { countryCode }
  });

  if (response.error) throw response.error;
  if (!response.data?.success) throw new Error('Failed to fetch leaderboard');

  return {
    leaderboard: response.data.leaderboard || [],
    dailyRewards: response.data.dailyRewards,
  };
}

export function useLeaderboardQuery(countryCode: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: LEADERBOARD_QUERY_KEY(countryCode || ''),
    queryFn: () => fetchLeaderboard(countryCode!),
    enabled: !!countryCode,
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No garbage collection delay
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on component mount
    refetchInterval: false, // Disable polling, rely on real-time subscriptions
  });

  // Real-time subscription for leaderboard updates (optimized for instant updates)
  useEffect(() => {
    if (!countryCode) return;

    logger.log('[useLeaderboardQuery] Setting up realtime subscription for country:', countryCode);

    const channel = supabase
      .channel(`leaderboard-realtime-${countryCode}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'leaderboard_cache',
          filter: `country_code=eq.${countryCode}`,
        },
        (payload) => {
          logger.log('[useLeaderboardQuery] Realtime update received:', payload);
          // Immediately refetch with zero delay
          queryClient.refetchQueries({ 
            queryKey: LEADERBOARD_QUERY_KEY(countryCode),
            exact: true 
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_rankings',
        },
        (payload) => {
          logger.log('[useLeaderboardQuery] Daily rankings update received:', payload);
          // Also refetch when daily_rankings changes
          queryClient.refetchQueries({ 
            queryKey: LEADERBOARD_QUERY_KEY(countryCode),
            exact: true 
          });
        }
      )
      .subscribe((status) => {
        logger.log('[useLeaderboardQuery] Subscription status:', status);
      });

    return () => {
      logger.log('[useLeaderboardQuery] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [countryCode, queryClient]);

  return {
    leaderboard: query.data?.leaderboard || [],
    dailyRewards: query.data?.dailyRewards || null,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

// Prefetch leaderboard before navigation (with zero cache)
export function prefetchLeaderboard(countryCode: string, queryClient: any) {
  return queryClient.prefetchQuery({
    queryKey: LEADERBOARD_QUERY_KEY(countryCode),
    queryFn: () => fetchLeaderboard(countryCode),
    staleTime: 0, // No cache on prefetch either
  });
}
