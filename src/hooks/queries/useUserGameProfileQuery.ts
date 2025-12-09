import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect } from 'react';

export interface TopicProfile {
  topicId: string;
  topicName: string;
  answeredCount: number;
  correctCount: number;
  correctRatio: number;
  score: number;
  isInTop3: boolean;
}

export interface UserGameProfile {
  userId: string;
  totalAnswered: number;
  totalCorrect: number;
  overallCorrectRatio: number;
  topTopics: TopicProfile[];
  allTopics: TopicProfile[];
  aiPersonalizedQuestionsEnabled: boolean;
  personalizationReady: boolean;
  questionDistributionExample: {
    personalized: boolean;
    totalQuestions: number;
    preferredTopicsPercent: number;
    newQuestionsPercent: number;
  };
}

const USER_GAME_PROFILE_KEY = (userId: string) => ['user-game-profile', userId];

async function fetchUserGameProfile(userId: string): Promise<UserGameProfile> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');

  const { data, error } = await supabase.functions.invoke('get-user-game-profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  return data;
}

export function useUserGameProfileQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: USER_GAME_PROFILE_KEY(userId || ''),
    queryFn: () => fetchUserGameProfile(userId!),
    enabled: !!userId,
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No garbage collection delay
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on component mount
  });

  // Real-time subscription for instant game profile updates
  useEffect(() => {
    if (!userId) return;

    console.log('[useUserGameProfileQuery] Setting up realtime subscription for user:', userId);

    const channel = supabase
      .channel(`user-game-profile-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_results',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useUserGameProfileQuery] Game results update received:', payload);
          queryClient.refetchQueries({
            queryKey: USER_GAME_PROFILE_KEY(userId),
            exact: true,
          });
        }
      )
      .subscribe((status) => {
        console.log('[useUserGameProfileQuery] Subscription status:', status);
      });

    return () => {
      console.log('[useUserGameProfileQuery] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const updateSettings = useCallback(
    async (settings: { aiPersonalizedQuestionsEnabled: boolean }) => {
      if (!userId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('update-user-game-settings', {
        method: 'POST',
        body: settings,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      // Invalidate and refetch profile
      await queryClient.invalidateQueries({ queryKey: USER_GAME_PROFILE_KEY(userId) });
    },
    [userId, queryClient]
  );

  return {
    profile: query.data,
    loading: query.isLoading,
    error: query.error?.message || null,
    updateSettings,
    refetch: query.refetch,
  };
}
