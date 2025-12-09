import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * OPTIMIZED: Admin Game Profiles with Pagination
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Pagination support (limit/offset query params)
 * - Default limit: 50 profiles per page (was: ALL 500+)
 * - Indexed queries on user_topic_stats
 * - Returns total count for pagination UI
 * 
 * BEHAVIOR: Same data structure, adds pagination metadata
 * 
 * Query params:
 * - limit: number (default 50, max 200)
 * - offset: number (default 0)
 */

const corsHeaders = getCorsHeaders();

interface AdminUserGameProfileRow {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // PAGINATION: Parse query params
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    
    const limit = Math.min(Math.max(parseInt(limitParam || '50'), 1), 200); // Max 200 per page
    const offset = Math.max(parseInt(offsetParam || '0'), 0);

    // Get total count first (for pagination UI)
    const { count: totalCount } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Get paginated user IDs
    const { data: paginatedProfiles } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (!paginatedProfiles || paginatedProfiles.length === 0) {
      return new Response(JSON.stringify({
        profiles: [],
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          hasMore: false
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = paginatedProfiles.map(p => p.id);

    // Fetch ONLY stats for paginated users
    const [statsRes, topicsRes, settingsRes] = await Promise.all([
      supabaseClient
        .from('user_topic_stats')
        .select('user_id, answered_count, correct_count, score, topic_id')
        .in('user_id', userIds),
      
      supabaseClient.from('topics').select('id, name'),
      
      supabaseClient
        .from('user_game_settings')
        .select('user_id, ai_personalized_questions_enabled')
        .in('user_id', userIds)
    ]);

    const allStats = statsRes.data || [];
    const topics = topicsRes.data || [];
    const allSettings = settingsRes.data || [];

    const topicMap = new Map(topics.map(t => [t.id, t.name]));
    const settingsMap = new Map(allSettings.map(s => [s.user_id, s.ai_personalized_questions_enabled]));
    const profileMap = new Map(paginatedProfiles.map(p => [p.id, p.username]));

    // Aggregate by user
    const userStatsMap = new Map<string, {
      totalAnswered: number;
      totalCorrect: number;
      topicScores: { topicId: number; score: number }[];
    }>();

    allStats.forEach(stat => {
      const existing = userStatsMap.get(stat.user_id) || {
        totalAnswered: 0,
        totalCorrect: 0,
        topicScores: [],
      };

      existing.totalAnswered += stat.answered_count;
      existing.totalCorrect += stat.correct_count;
      existing.topicScores.push({ topicId: stat.topic_id, score: Number(stat.score) });

      userStatsMap.set(stat.user_id, existing);
    });

    // Build response
    const result: AdminUserGameProfileRow[] = [];

    userIds.forEach(userId => {
      const stats = userStatsMap.get(userId) || {
        totalAnswered: 0,
        totalCorrect: 0,
        topicScores: []
      };

      const aiEnabled = settingsMap.get(userId) ?? true;
      const personalizationActive = stats.totalAnswered >= 1000 && aiEnabled;

      const topTopics = stats.topicScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(t => ({
          topicId: String(t.topicId),
          topicName: topicMap.get(t.topicId) || `Topic ${t.topicId}`,
          score: t.score,
        }));

      result.push({
        userId,
        username: profileMap.get(userId) || 'Unknown',
        totalAnswered: stats.totalAnswered,
        overallCorrectRatio: stats.totalAnswered > 0 ? stats.totalCorrect / stats.totalAnswered : 0,
        aiPersonalizedQuestionsEnabled: aiEnabled,
        personalizationActive,
        topTopics,
      });
    });

    return new Response(JSON.stringify({
      profiles: result,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[admin-game-profiles-paginated] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
