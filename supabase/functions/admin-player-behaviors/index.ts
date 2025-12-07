import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

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

    const { startDate, endDate } = await req.json().catch(() => ({ startDate: null, endDate: null }));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user and role with anon key
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

    // Service role client to bypass RLS
    const service = createClient(supabaseUrl, supabaseServiceKey);

    // Build date filter fragments
    const startISO = startDate ? new Date(startDate).toISOString() : null;
    const endISO = endDate ? new Date(endDate).toISOString() : null;

    // Fetch ALL game_results (no category filter - aggregate everything)
    let resultsQuery = service.from('game_results')
      .select('user_id, completed, correct_answers, average_response_time, created_at');

    if (startISO) resultsQuery = resultsQuery.gte('created_at', startISO);
    if (endISO) resultsQuery = resultsQuery.lte('created_at', endISO);

    const { data: results, error: resultsError } = await resultsQuery;
    if (resultsError) {
      console.error('[admin-player-behaviors] Results error:', resultsError);
    }

    // Fetch game_exit_events for abandoned games count
    let exitQuery = service.from('game_exit_events')
      .select('user_id, exit_reason, created_at');
    
    if (startISO) exitQuery = exitQuery.gte('created_at', startISO);
    if (endISO) exitQuery = exitQuery.lte('created_at', endISO);

    const { data: exitEvents, error: exitError } = await exitQuery;
    if (exitError) {
      console.error('[admin-player-behaviors] Exit events error:', exitError);
    }

    // Fetch ALL help usage (no category filter)
    let helpQuery = service.from('game_help_usage')
      .select('help_type, used_at');
    if (startISO) helpQuery = helpQuery.gte('used_at', startISO);
    if (endISO) helpQuery = helpQuery.lte('used_at', endISO);
    
    const { data: helps, error: helpsError } = await helpQuery;
    if (helpsError) {
      console.error('[admin-player-behaviors] Helps error:', helpsError);
    }

    // Calculate aggregated stats
    const allResults = results || [];
    const allExitEvents = exitEvents || [];
    const allHelps = helps || [];

    const totalGames = allResults.length;
    const completedGames = allResults.filter(r => r.completed === true).length;
    const uniquePlayers = new Set(allResults.map(r => r.user_id)).size;

    // Abandoned games = total exit events (these are actual mid-game exits)
    const abandonedGames = allExitEvents.length;

    // Average correct answers across ALL games
    const avgCorrectAnswers = totalGames > 0
      ? (allResults.reduce((s, r) => s + (r.correct_answers || 0), 0) / totalGames)
      : 0;

    // Average response time across games that have response time
    const gamesWithTime = allResults.filter(r => r.average_response_time != null && r.average_response_time > 0);
    const avgResponseTime = gamesWithTime.length > 0
      ? (gamesWithTime.reduce((s, r) => s + Number(r.average_response_time), 0) / gamesWithTime.length)
      : 0;

    // Help usage aggregation
    const helpUsage = {
      third: allHelps.filter(h => h.help_type === 'third').length,
      skip: allHelps.filter(h => h.help_type === 'skip').length,
      audience: allHelps.filter(h => h.help_type === 'audience').length,
      '2x_answer': allHelps.filter(h => h.help_type === '2x_answer').length,
    };

    // Calculate completion rate based on completed vs total (including exits)
    const totalAttempts = totalGames + abandonedGames;
    const completionRate = totalAttempts > 0 
      ? Math.round((completedGames / totalAttempts) * 100) 
      : 0;

    const categoryStats = {
      category: 'mixed',
      uniquePlayers,
      totalGames: totalAttempts,
      completedGames,
      abandonedGames,
      completionRate,
      avgCorrectAnswers: Math.round(avgCorrectAnswers * 10) / 10,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      helpUsage,
    };
    
    return new Response(JSON.stringify({ stats: [categoryStats] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[admin-player-behaviors] Fatal', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
