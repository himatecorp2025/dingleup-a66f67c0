import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useUserGameProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserGameProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No session');
        setLoading(false);
        return;
      }
      
      const { data, error: invokeError } = await supabase.functions.invoke(
        'get-user-game-profile',
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (invokeError) throw invokeError;
      setProfile(data);
    } catch (err) {
      console.error('[useUserGameProfile] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (settings: { aiPersonalizedQuestionsEnabled: boolean }) => {
    try {
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No session');
        return;
      }
      
      const { error: invokeError } = await supabase.functions.invoke(
        'update-user-game-settings',
        {
          method: 'POST',
          body: settings,
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (invokeError) throw invokeError;

      // Refetch profile after update
      await fetchProfile();
    } catch (err) {
      console.error('[useUserGameProfile] updateSettings error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    loading,
    error,
    profile,
    updateSettings,
    refetch: fetchProfile,
  };
}
