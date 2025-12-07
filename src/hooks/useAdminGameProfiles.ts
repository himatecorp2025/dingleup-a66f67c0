import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUserGameProfileRow {
  userId: string;
  username: string;
  totalAnswered: number;
  overallCorrectRatio: number;
  aiPersonalizedQuestionsEnabled: boolean;
  personalizationActive: boolean;
  topTopics: {
    topicId: string;
    topicName: string;
    score: number;
  }[];
}

export function useAdminGameProfiles() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AdminUserGameProfileRow[]>([]);
  const isInitialLoad = useRef(true);

  const fetchProfiles = useCallback(async (isBackground = false) => {
    try {
      // Only show loading spinner on initial load, not background refreshes
      if (!isBackground && isInitialLoad.current) {
        setLoading(true);
      }
      if (!isBackground && !isInitialLoad.current) {
        setIsRefreshing(true);
      }
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No session');
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      const { data, error: invokeError } = await supabase.functions.invoke(
        'admin-game-profiles',
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (invokeError) throw invokeError;
      setProfiles(data || []);
      isInitialLoad.current = false;
    } catch (err) {
      console.error('[useAdminGameProfiles] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh function (shows refresh indicator)
  const refetch = useCallback(() => {
    return fetchProfiles(false);
  }, [fetchProfiles]);

  // Background refresh function (silent, no UI change)
  const backgroundRefresh = useCallback(() => {
    return fetchProfiles(true);
  }, [fetchProfiles]);

  useEffect(() => {
    fetchProfiles(false);

    // Realtime subscriptions for automatic background updates
    const gameResultsChannel = supabase
      .channel('admin-game-profiles-results')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_results'
      }, () => {
        backgroundRefresh();
      })
      .subscribe();

    const analyticsChannel = supabase
      .channel('admin-game-profiles-analytics')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_question_analytics'
      }, () => {
        backgroundRefresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameResultsChannel);
      supabase.removeChannel(analyticsChannel);
    };
  }, [fetchProfiles, backgroundRefresh]);

  return {
    loading,
    isRefreshing,
    error,
    profiles,
    refetch,
  };
}

export function useAdminGameProfileDetail(userId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const isInitialLoad = useRef(true);

  const fetchProfile = useCallback(async (isBackground = false) => {
    if (!userId) return;

    try {
      if (!isBackground && isInitialLoad.current) {
        setLoading(true);
      }
      if (!isBackground && !isInitialLoad.current) {
        setIsRefreshing(true);
      }
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No session');
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      const { data, error: invokeError } = await supabase.functions.invoke(
        `admin-game-profile-detail?userId=${userId}`,
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (invokeError) throw invokeError;
      setProfile(data);
      isInitialLoad.current = false;
    } catch (err) {
      console.error('[useAdminGameProfileDetail] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  const refetch = useCallback(() => {
    return fetchProfile(false);
  }, [fetchProfile]);

  const backgroundRefresh = useCallback(() => {
    return fetchProfile(true);
  }, [fetchProfile]);

  useEffect(() => {
    isInitialLoad.current = true;
    fetchProfile(false);

    if (!userId) return;

    // Realtime subscriptions for automatic background updates
    const gameResultsChannel = supabase
      .channel(`admin-profile-detail-results-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_results'
      }, (payload) => {
        if (payload.new && (payload.new as any).user_id === userId) {
          backgroundRefresh();
        }
      })
      .subscribe();

    const analyticsChannel = supabase
      .channel(`admin-profile-detail-analytics-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_question_analytics'
      }, (payload) => {
        if (payload.new && (payload.new as any).user_id === userId) {
          backgroundRefresh();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameResultsChannel);
      supabase.removeChannel(analyticsChannel);
    };
  }, [fetchProfile, backgroundRefresh, userId]);

  return {
    loading,
    isRefreshing,
    error,
    profile,
    refetch,
  };
}
