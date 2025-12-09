import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';

export interface WalletData {
  coins: number;
  coinsCurrent: number; // Alias for backward compatibility
  lives: number;
  livesCurrent: number; // Alias for backward compatibility
  maxLives: number;
  livesMax: number; // Alias for backward compatibility
  nextLifeAt: string | null;
  serverDriftMs: number;
  activeSpeedToken?: {
    speedCount: number;
    speedDurationMinutes: number;
    expiresAt: string;
  } | null;
}

const WALLET_QUERY_KEY = (userId: string) => ['wallet', userId];

async function fetchWallet(userId: string): Promise<WalletData> {
  const requestTime = Date.now();

  // Get current session for authenticated function call
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error('No session');
  }

  // Request only the fields we actually need (smaller payload)
  const fields = 'livesCurrent,livesMax,coinsCurrent,nextLifeAt,regenIntervalSec,regenMinutes,activeSpeedToken';

  const { data, error } = await supabase.functions.invoke('get-wallet', {
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: { fields },
  });

  const responseTime = Date.now();
  const roundTripTime = responseTime - requestTime;
  const estimatedServerTime = responseTime - roundTripTime / 2;
  const clientServerDrift = estimatedServerTime - Date.now();

  if (error) throw error;
  if (!data) throw new Error('Failed to fetch wallet');

  const wallet = data as any;

  return {
    coins: wallet.coinsCurrent ?? 0,
    coinsCurrent: wallet.coinsCurrent ?? 0,
    lives: wallet.livesCurrent ?? 0,
    livesCurrent: wallet.livesCurrent ?? 0,
    maxLives: wallet.livesMax ?? 0,
    livesMax: wallet.livesMax ?? 0,
    nextLifeAt: wallet.nextLifeAt ?? null,
    serverDriftMs: clientServerDrift,
    activeSpeedToken: wallet.activeSpeedToken || null,
  };
}

export function useWalletQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WALLET_QUERY_KEY(userId || ''),
    queryFn: () => fetchWallet(userId!),
    enabled: !!userId,
    staleTime: 30000, // OPTIMIZATION: 30s cache - realtime subscription handles updates
    gcTime: 60000, // Keep in memory for 1 minute
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: 'always', // Refetch on component mount
  });

  // Manual refetch function
  const refetchWallet = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY(userId) });
  }, [userId, queryClient]);

  // Real-time subscription for instant wallet updates
  useEffect(() => {
    if (!userId) return;

    console.log('[useWalletQuery] Setting up realtime subscription for user:', userId);

    const channel = supabase
      .channel(`wallet-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useWalletQuery] Profile update received:', payload);
          // Immediately refetch with zero delay
          queryClient.refetchQueries({
            queryKey: WALLET_QUERY_KEY(userId),
            exact: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_ledger',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useWalletQuery] Wallet ledger update received:', payload);
          // Immediately refetch with zero delay
          queryClient.refetchQueries({
            queryKey: WALLET_QUERY_KEY(userId),
            exact: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lives_ledger',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useWalletQuery] Lives ledger update received:', payload);
          // Immediately refetch with zero delay
          queryClient.refetchQueries({
            queryKey: WALLET_QUERY_KEY(userId),
            exact: true,
          });
        }
      )
      .subscribe((status) => {
        console.log('[useWalletQuery] Subscription status:', status);
      });

    return () => {
      console.log('[useWalletQuery] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    walletData: query.data,
    loading: query.isLoading,
    refetchWallet,
    serverDriftMs: query.data?.serverDriftMs ?? 0,
  };
}

// Prefetch wallet data before navigation (with zero cache)
export function prefetchWallet(userId: string, queryClient: any) {
  return queryClient.prefetchQuery({
    queryKey: WALLET_QUERY_KEY(userId),
    queryFn: () => fetchWallet(userId),
    staleTime: 0, // No cache on prefetch either
  });
}
