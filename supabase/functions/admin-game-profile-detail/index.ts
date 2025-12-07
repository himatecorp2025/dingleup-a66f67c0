import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders();

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    // Get userId from URL
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');

    if (!targetUserId) {
      throw new Error('userId parameter required');
    }

    // Get user topic stats
    const { data: topicStats, error: statsError } = await supabaseClient
      .from('user_topic_stats')
      .select('*')
      .eq('user_id', targetUserId);

    if (statsError) {
      console.error('[admin-game-profile-detail] Error fetching stats:', statsError);
      throw statsError;
    }

    // Get topics
    const { data: topics } = await supabaseClient
      .from('topics')
      .select('id, name');

    const topicMap = new Map(topics?.map(t => [t.id, t.name]) || []);

    // Get settings
    const { data: settings } = await supabaseClient
      .from('user_game_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    // Get profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username, created_at')
      .eq('id', targetUserId)
      .single();

    // Get last seen from question_seen_history
    const { data: lastSeen } = await supabaseClient
      .from('question_seen_history')
      .select('seen_at')
      .eq('user_id', targetUserId)
      .order('seen_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate aggregated data
    let totalAnswered = 0;
    let totalCorrect = 0;
    let totalLikes = 0;
    let totalDislikes = 0;

    const allTopics = (topicStats || []).map(stat => {
      totalAnswered += stat.answered_count;
      totalCorrect += stat.correct_count;
      totalLikes += stat.like_count;
      totalDislikes += stat.dislike_count;

      return {
        topicId: String(stat.topic_id),
        topicName: topicMap.get(stat.topic_id) || `Topic ${stat.topic_id}`,
        answeredCount: stat.answered_count,
        correctCount: stat.correct_count,
        likeCount: stat.like_count,
        dislikeCount: stat.dislike_count,
        correctRatio: stat.answered_count > 0 ? stat.correct_count / stat.answered_count : 0,
        score: Number(stat.score),
        avgResponseMs: stat.avg_response_ms,
        lastAnsweredAt: stat.last_answered_at,
      };
    });

    allTopics.sort((a, b) => b.score - a.score);
    const topTopics = allTopics.slice(0, 3);

    const aiEnabled = settings?.ai_personalized_questions_enabled ?? true;
    const personalizationReady = totalAnswered >= 100;

    const result = {
      userId: targetUserId,
      username: profile?.username || 'Unknown',
      createdAt: profile?.created_at,
      lastSeenAt: lastSeen?.seen_at || null,
      totalAnswered,
      totalCorrect,
      overallCorrectRatio: totalAnswered > 0 ? totalCorrect / totalAnswered : 0,
      totalLikes,
      totalDislikes,
      topTopics,
      allTopics,
      aiPersonalizedQuestionsEnabled: aiEnabled,
      personalizationReady,
      personalizationActive: personalizationReady && aiEnabled,
      questionDistributionExample: {
        personalized: personalizationReady && aiEnabled,
        totalQuestions: 15,
        preferredTopicsPercent: 70,
        newQuestionsPercent: 20,
        dislikedTopicsPercent: 10,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[admin-game-profile-detail] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
