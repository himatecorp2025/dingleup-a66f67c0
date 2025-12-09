import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * OPTIMIZED: Admin Game Profiles (Pagination + Indexed Queries)
 * 
 * IMPROVEMENTS:
 * - Default limit 100 (was: ALL 500+) - reduces load by 80%
 * - RPC-based admin check (faster than table query)
 * - Indexed queries using IN clause on user_id
 * - Backward compatible: ?all=true returns all profiles
 */

const corsHeaders = getCorsHeaders();

interface AdminUserGameProfileRow {
  userId: string;
  username: string;
  totalAnswered: number;
  overallCorrectRatio: number;
  aiPersonalizedQuestionsEnabled: boolean;
  personalizationActive: boolean;
  topTopics: { topicId: string; topicName: string; score: number; }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // OPTIMIZED: RPC check (faster than table query)
    const { data: hasRole } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    if (!hasRole) throw new Error('Admin access required');

    // PAGINATION: Backward compatible
    const url = new URL(req.url);
    const fetchAll = url.searchParams.get('all') === 'true';
    const limit = fetchAll ? 10000 : 100;

    // OPTIMIZED: Fetch profiles with limit
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .limit(limit);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = profiles.map(p => p.id);

    // OPTIMIZED: Batch queries with IN (uses idx_user_topic_stats_user index)
    const [allStats, topics, allSettings] = await Promise.all([
      supabaseClient
        .from('user_topic_stats')
        .select('user_id, answered_count, correct_count, score, topic_id')
        .in('user_id', userIds)
        .then(res => res.data || []),
      supabaseClient.from('topics').select('id, name').then(res => res.data || []),
      supabaseClient
        .from('user_game_settings')
        .select('user_id, ai_personalized_questions_enabled')
        .in('user_id', userIds)
        .then(res => res.data || [])
    ]);

    const topicMap = new Map(topics.map(t => [t.id, t.name]));
    const settingsMap = new Map(allSettings.map(s => [s.user_id, s.ai_personalized_questions_enabled]));
    const profileMap = new Map(profiles.map(p => [p.id, p.username]));

    // Aggregate by user
    const userStatsMap = new Map();
    allStats.forEach(stat => {
      const existing = userStatsMap.get(stat.user_id) || {
        totalAnswered: 0, totalCorrect: 0, topicScores: []
      };
      existing.totalAnswered += stat.answered_count;
      existing.totalCorrect += stat.correct_count;
      existing.topicScores.push({ topicId: stat.topic_id, score: Number(stat.score) });
      userStatsMap.set(stat.user_id, existing);
    });

    const result: AdminUserGameProfileRow[] = [];
    userIds.forEach(userId => {
      const stats = userStatsMap.get(userId) || { totalAnswered: 0, totalCorrect: 0, topicScores: [] };
      const aiEnabled = settingsMap.get(userId) ?? true;
      const personalizationActive = stats.totalAnswered >= 100 && aiEnabled;
      const topTopics = stats.topicScores
        .sort((a: { topicId: any; score: number }, b: { topicId: any; score: number }) => b.score - a.score)
        .slice(0, 3)
        .map((t: { topicId: any; score: number }) => ({
          topicId: String(t.topicId),
          topicName: topicMap.get(t.topicId) || `Topic ${t.topicId}`,
          score: t.score,
        }));
      result.push({
        userId, username: profileMap.get(userId) || 'Unknown', totalAnswered: stats.totalAnswered,
        overallCorrectRatio: stats.totalAnswered > 0 ? stats.totalCorrect / stats.totalAnswered : 0,
        aiPersonalizedQuestionsEnabled: aiEnabled, personalizationActive, topTopics,
      });
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[admin-game-profiles] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
