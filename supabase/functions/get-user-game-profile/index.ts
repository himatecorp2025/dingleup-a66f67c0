import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders();

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TopicProfile {
  topicId: string;
  topicName: string;
  answeredCount: number;
  correctCount: number;
  likeCount: number;
  dislikeCount: number;
  correctRatio: number;
  score: number;
  isInTop3: boolean;
}

interface UserGameProfile {
  userId: string;
  totalAnswered: number;
  totalCorrect: number;
  overallCorrectRatio: number;
  totalLikes: number;
  totalDislikes: number;
  topTopics: TopicProfile[];
  allTopics: TopicProfile[];
  aiPersonalizedQuestionsEnabled: boolean;
  personalizationReady: boolean;
  questionDistributionExample: {
    personalized: boolean;
    totalQuestions: number;
    preferredTopicsPercent: number;
    newQuestionsPercent: number;
    dislikedTopicsPercent: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    // Get user game settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_game_settings')
      .select('ai_personalized_questions_enabled')
      .eq('user_id', userId)
      .single();

    const aiEnabled = settings?.ai_personalized_questions_enabled ?? true;

    // Get user topic stats
    const { data: topicStats, error: statsError } = await supabaseClient
      .from('user_topic_stats')
      .select(`
        topic_id,
        answered_count,
        correct_count,
        like_count,
        dislike_count,
        score
      `)
      .eq('user_id', userId);

    if (statsError) {
      console.error('[get-user-game-profile] Error fetching topic stats:', statsError);
    }

    // Get topic names
    const { data: topics, error: topicsError } = await supabaseClient
      .from('topics')
      .select('id, name');

    if (topicsError) {
      console.error('[get-user-game-profile] Error fetching topics:', topicsError);
    }

    const topicMap = new Map(topics?.map(t => [t.id, t.name]) || []);

    // Calculate aggregated stats
    let totalAnswered = 0;
    let totalCorrect = 0;
    let totalLikes = 0;
    let totalDislikes = 0;

    const allTopics: TopicProfile[] = (topicStats || []).map(stat => {
      totalAnswered += stat.answered_count;
      totalCorrect += stat.correct_count;
      totalLikes += stat.like_count;
      totalDislikes += stat.dislike_count;

      const correctRatio = stat.answered_count > 0 
        ? stat.correct_count / stat.answered_count 
        : 0;

      return {
        topicId: String(stat.topic_id),
        topicName: topicMap.get(stat.topic_id) || `Topic ${stat.topic_id}`,
        answeredCount: stat.answered_count,
        correctCount: stat.correct_count,
        likeCount: stat.like_count,
        dislikeCount: stat.dislike_count,
        correctRatio,
        score: Number(stat.score),
        isInTop3: false,
      };
    });

    // Sort by score and mark TOP3
    allTopics.sort((a, b) => b.score - a.score);
    const topTopics = allTopics.slice(0, 3).map(t => ({ ...t, isInTop3: true }));
    topTopics.forEach(t => {
      const found = allTopics.find(a => a.topicId === t.topicId);
      if (found) found.isInTop3 = true;
    });

    const overallCorrectRatio = totalAnswered > 0 ? totalCorrect / totalAnswered : 0;
    const personalizationReady = totalAnswered >= 100;

    const profile: UserGameProfile = {
      userId,
      totalAnswered,
      totalCorrect,
      overallCorrectRatio,
      totalLikes,
      totalDislikes,
      topTopics,
      allTopics,
      aiPersonalizedQuestionsEnabled: aiEnabled,
      personalizationReady,
      questionDistributionExample: {
        personalized: personalizationReady && aiEnabled,
        totalQuestions: 15,
        preferredTopicsPercent: 70,
        newQuestionsPercent: 20,
        dislikedTopicsPercent: 10,
      },
    };

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-user-game-profile] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
