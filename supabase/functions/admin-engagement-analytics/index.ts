import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

/**
 * Admin Engagement Analytics - Uses raw tables for reliable data
 */

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(origin);
  }
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user and admin role using anon key
    const anon = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hasAdminRole } = await anon.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for data fetch (bypass RLS)
    const service = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch raw data from tables (last 30 days for more data)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const [sessionRes, profilesRes, featureRes, gameResultsRes, topicsRes] = await Promise.all([
      service
        .from('app_session_events')
        .select('event_type, session_id, user_id, session_duration_seconds, created_at')
        .gte('created_at', thirtyDaysAgo)
        .limit(10000),
      service.from('profiles').select('id, username').limit(5000),
      service
        .from('feature_usage_events')
        .select('feature_name, user_id')
        .gte('created_at', thirtyDaysAgo)
        .limit(10000),
      service
        .from('game_results')
        .select('user_id, correct_answers, category')
        .eq('completed', true)
        .gte('created_at', thirtyDaysAgo)
        .limit(10000),
      service.from('topics').select('id, name')
    ]);

    const sessionEvents = sessionRes.data || [];
    const profiles = profilesRes.data || [];
    const featureEvents = featureRes.data || [];
    const gameResults = gameResultsRes.data || [];
    const topicsData = topicsRes.data || [];

    // Calculate session metrics
    const sessionMap = new Map<string, number[]>();
    sessionEvents.forEach((event: any) => {
      if (event.session_duration_seconds) {
        if (!sessionMap.has(event.user_id)) sessionMap.set(event.user_id, []);
        sessionMap.get(event.user_id)!.push(event.session_duration_seconds);
      }
    });

    const totalSessions = Array.from(sessionMap.values()).reduce((sum, arr) => sum + arr.length, 0);
    const totalDuration = Array.from(sessionMap.values()).reduce((sum, arr) => sum + arr.reduce((s, d) => s + d, 0), 0);
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const avgSessionsPerUser = sessionMap.size > 0 ? Math.round(totalSessions / sessionMap.size) : 0;

    // Feature usage
    const featureUsageMap = new Map<string, { count: number; users: Set<string> }>();
    featureEvents.forEach((e: any) => {
      if (!featureUsageMap.has(e.feature_name)) {
        featureUsageMap.set(e.feature_name, { count: 0, users: new Set() });
      }
      const feature = featureUsageMap.get(e.feature_name)!;
      feature.count++;
      feature.users.add(e.user_id);
    });
    const featureUsage = Array.from(featureUsageMap.entries())
      .map(([feature_name, data]) => ({ 
        feature_name, 
        usage_count: data.count, 
        unique_users: data.users.size 
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);

    // Hourly engagement
    const hourlyEngagement = new Array(24).fill(0);
    sessionEvents.forEach((event: any) => {
      const hour = new Date(event.created_at).getHours();
      hourlyEngagement[hour]++;
    });
    const engagementByTime = hourlyEngagement.map((sessions, hour) => ({ hour, sessions }));

    // Most active users (last 24 hours)
    const recentSessionRes = await service
      .from('app_session_events')
      .select('user_id, session_id, session_duration_seconds')
      .eq('event_type', 'app_opened')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(3000);

    const recentSessions = recentSessionRes.data || [];
    const userSessionMap = new Map<string, { count: number; totalDuration: number }>();
    recentSessions.forEach((e: any) => {
      const existing = userSessionMap.get(e.user_id) || { count: 0, totalDuration: 0 };
      userSessionMap.set(e.user_id, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + (e.session_duration_seconds || 0)
      });
    });

    const mostActiveUsers = Array.from(userSessionMap.entries())
      .map(([user_id, data]) => {
        const profile = profiles.find((p: any) => p.id === user_id);
        return {
          user_id,
          username: profile?.username || 'Unknown',
          session_count: data.count,
          total_duration: data.totalDuration,
        };
      })
      .sort((a, b) => b.session_count - a.session_count)
      .slice(0, 10);

    // Game engagement
    const gamesPerUser = new Map<string, number>();
    let totalCorrectAnswers = 0;
    gameResults.forEach((g: any) => {
      gamesPerUser.set(g.user_id, (gamesPerUser.get(g.user_id) || 0) + 1);
      totalCorrectAnswers += g.correct_answers || 0;
    });
    const avgGamesPerUserRaw = gamesPerUser.size > 0
      ? Array.from(gamesPerUser.values()).reduce((s, c) => s + c, 0) / gamesPerUser.size
      : 0;
    const avgGamesPerUser = Math.round(avgGamesPerUserRaw * 10) / 10;
    const avgCorrectAnswers = gameResults.length > 0
      ? Math.round((totalCorrectAnswers / gameResults.length) * 10) / 10
      : 0;

    // Topic popularity (from game_results category + correct_answers)
    const categoryScoreMap = new Map<string, number>();
    gameResults.forEach((g: any) => {
      const category = g.category || 'unknown';
      categoryScoreMap.set(category, (categoryScoreMap.get(category) || 0) + (g.correct_answers || 0));
    });
    
    const topicPopularity = Array.from(categoryScoreMap.entries())
      .map(([category, count]) => {
        // Try to find matching topic name for better display
        const topic = topicsData.find((t: any) => 
          t.name?.toLowerCase() === category.toLowerCase() ||
          t.name?.toLowerCase().includes(category.toLowerCase())
        );
        return {
          category: topic?.name || category,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log('[admin-engagement-analytics] Data fetched:', {
      sessionCount: sessionEvents.length,
      featureCount: featureEvents.length,
      gameResultsCount: gameResults.length,
      topicsCount: topicsData.length
    });

    return new Response(JSON.stringify({
      avgSessionDuration,
      avgSessionsPerUser,
      totalSessions,
      featureUsage,
      engagementByTime,
      mostActiveUsers,
      gameEngagement: {
        avgGamesPerUser,
        avgCorrectAnswers,
        mostPlayedCategories: topicPopularity,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[admin-engagement-analytics] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
