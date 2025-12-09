import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  coins: number;
  lives: number;
  max_lives: number;
  total_correct_answers: number;
  country_code: string | null;
  preferred_language: string;
  invitation_code: string;
  daily_gift_streak: number;
  biometric_enabled: boolean;
  pin_hash: string | null;
  last_username_change?: string;
  birth_date?: string | null;
  lives_regeneration_rate?: number;
  created_at?: string;
  age_verified?: boolean;
  user_timezone?: string;
}

const PROFILE_QUERY_KEY = (userId: string) => ['profile', userId];

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export function useProfileQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY(userId || ''),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 0, // REAL-TIME: Always fetch fresh data
    gcTime: 0, // No garbage collection delay
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on component mount
  });

  // Update profile helper function
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId) return;

    // Optimistic update
    queryClient.setQueryData(
      PROFILE_QUERY_KEY(userId),
      (old: UserProfile | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      }
    );

    // Backend update
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY(userId) });
      throw error;
    }
  }, [userId, queryClient]);

  // Refresh profile helper
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY(userId) });
  }, [userId, queryClient]);

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          // Optimistic update - immediately update cache
          queryClient.setQueryData(
            PROFILE_QUERY_KEY(userId),
            (old: UserProfile | undefined) => {
              if (!old) return payload.new as UserProfile;
              return { ...old, ...payload.new } as UserProfile;
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    profile: query.data,
    loading: query.isLoading,
    updateProfile,
    refreshProfile,
    refetch: query.refetch,
  };
}

// Prefetch function to load profile data before navigation
export function prefetchProfile(userId: string, queryClient: any) {
  return queryClient.prefetchQuery({
    queryKey: PROFILE_QUERY_KEY(userId),
    queryFn: () => fetchProfile(userId),
    staleTime: 0, // REAL-TIME: No cache on prefetch
  });
}
