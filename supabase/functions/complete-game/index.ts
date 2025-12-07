import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceeded, RATE_LIMITS } from '../_shared/rateLimit.ts';
import { validateInteger, validateEnum, validateString } from '../_shared/validation.ts';
import { startMetrics, measureStage, incDbQuery, logSuccess, logError, shouldSampleSuccessLog } from '../_shared/metrics.ts';

interface QuestionAnalytic {
  questionId: string;
  topicId: string;
  wasCorrect: boolean;
  responseTimeSeconds: number;
  questionIndex: number;
}

interface GameCompletion {
  category: string;
  correctAnswers: number;
  totalQuestions: number;
  averageResponseTime: number;
  questionAnalytics?: QuestionAnalytic[];
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);
  const correlationId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // OPTIMIZATION: Enable connection pooler for both clients
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { 
        headers: { 
          Authorization: authHeader,
          'X-Connection-Pooler': 'true', // Connection pooling
        } 
      },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Admin client for DB operations (bypasses RLS) with pooling
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: { 'X-Connection-Pooler': 'true' },
      },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Authenticate user using JWT token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const ctx = startMetrics({ functionName: 'complete-game', userId: user.id });
    ctx.extra['correlation_id'] = correlationId;

    // SECURITY: Rate limiting check
    const rateLimitResult = await measureStage(ctx, 'rate_limit', async () => {
      return await checkRateLimit(supabaseAuth, 'complete-game', { maxRequests: 20, windowMinutes: 1 });
    });
    if (!rateLimitResult.allowed) {
      logError(ctx, new Error('RATE_LIMIT_EXCEEDED'), { correlation_id: correlationId });
      return rateLimitExceeded(corsHeaders);
    }

    const body: GameCompletion = await req.json();

    // SECURITY: Comprehensive input validation
    if (!body.category || typeof body.category !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid category' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validCategories = ['mixed'];
    if (!validCategories.includes(body.category)) {
      return new Response(
        JSON.stringify({ error: 'Category must be "mixed"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body.correctAnswers !== 'number' || body.correctAnswers < 0 || body.correctAnswers > 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid correctAnswers (must be 0-15)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body.totalQuestions !== 'number' || body.totalQuestions !== 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid totalQuestions (must be 15)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body.averageResponseTime !== 'number' || body.averageResponseTime < 0 || body.averageResponseTime > 30000) {
      return new Response(
        JSON.stringify({ error: 'Invalid averageResponseTime (0-30000ms)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total coins (already credited after each correct answer)
    // This is only for statistics in game_results table
    let totalCoinsEarned = 1; // Start jutalom
    for (let i = 0; i < body.correctAnswers; i++) {
      if (i >= 0 && i <= 3) totalCoinsEarned += 1;      // 1-4. kérdés
      else if (i >= 4 && i <= 8) totalCoinsEarned += 3; // 5-9. kérdés
      else if (i >= 9 && i <= 13) totalCoinsEarned += 5; // 10-14. kérdés
      else if (i === 14) totalCoinsEarned += 55;         // 15. kérdés
    }
    const coinsEarned = totalCoinsEarned;

    // Idempotency check: prevent duplicate game result insertion
    const idempotencyKey = `game_complete:${user.id}:${Date.now()}`;
    
    // Check if game was already completed recently (within last 10 seconds) with same stats
    const { data: recentCompletion } = await measureStage(ctx, 'duplicate_check', async () => {
      incDbQuery(ctx);
      return await supabaseAdmin
        .from('game_results')
        .select('id, completed_at')
        .eq('user_id', user.id)
        .eq('correct_answers', body.correctAnswers)
        .eq('total_questions', body.totalQuestions)
        .gte('completed_at', new Date(Date.now() - 10000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    });

    if (recentCompletion) {
      if (shouldSampleSuccessLog()) {
        logSuccess(ctx, { 
          correlation_id: correlationId,
          cached: true, 
          correct_answers: body.correctAnswers 
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          coinsEarned,
          message: 'Game completed successfully!',
          cached: true,
          correlation_id: correlationId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session ID for this game
    const sessionId = crypto.randomUUID();

    // Insert game result using ADMIN client (bypasses RLS) - TRANSACTION START
    const { data: gameResult, error: insertError } = await measureStage(ctx, 'insert_result', async () => {
      incDbQuery(ctx);
      return await supabaseAdmin
        .from('game_results')
        .insert({
          user_id: user.id,
          category: body.category,
          correct_answers: body.correctAnswers,
          total_questions: body.totalQuestions,
          coins_earned: coinsEarned,
          average_response_time: body.averageResponseTime,
          completed: true,
          completed_at: new Date().toISOString()
        })
        .select('id')
        .single();
    });

    if (insertError) {
      logError(ctx, insertError, { correlation_id: correlationId, stage: 'insert_result' });
      throw new Error('Failed to save game result');
    }

    // NEW: Save question analytics for ad profiling (game_question_analytics)
    if (body.questionAnalytics && Array.isArray(body.questionAnalytics) && body.questionAnalytics.length > 0) {
      await measureStage(ctx, 'question_analytics', async () => {
        try {
          const analyticsRows = body.questionAnalytics!.map((qa) => ({
            user_id: user.id,
            session_id: sessionId,
            question_id: qa.questionId || null,
            category: body.category,
            question_index: qa.questionIndex,
            was_correct: qa.wasCorrect,
            response_time_seconds: qa.responseTimeSeconds,
            game_result_id: gameResult?.id || null,
          }));

          incDbQuery(ctx);
          const { error: analyticsError } = await supabaseAdmin
            .from('game_question_analytics')
            .insert(analyticsRows);

          if (analyticsError) {
            console.error('[complete-game] Question analytics insert error:', analyticsError);
          } else {
            console.log(`[complete-game] Saved ${analyticsRows.length} question analytics records`);
          }
        } catch (analyticsErr) {
          console.error('[complete-game] Question analytics exception:', analyticsErr);
        }
      });

      // NEW: Update user_topic_stats for ad profiling
      await measureStage(ctx, 'topic_stats', async () => {
        try {
          // Group analytics by topic - topic_id is INTEGER in DB
          const topicStats: Record<number, { correct: number; total: number }> = {};
          
          for (const qa of body.questionAnalytics!) {
            // Parse topic_id to integer (DB column is INTEGER)
            const topicIdRaw = qa.topicId;
            if (!topicIdRaw) continue;
            
            const topicId = typeof topicIdRaw === 'string' ? parseInt(topicIdRaw, 10) : topicIdRaw;
            if (isNaN(topicId)) continue;
            
            if (!topicStats[topicId]) {
              topicStats[topicId] = { correct: 0, total: 0 };
            }
            topicStats[topicId].total++;
            if (qa.wasCorrect) {
              topicStats[topicId].correct++;
            }
          }

          // Upsert topic stats for each topic
          for (const [topicIdStr, stats] of Object.entries(topicStats)) {
            const topicId = parseInt(topicIdStr, 10);
            incDbQuery(ctx);
            
            // First, try to get existing stats
            const { data: existing } = await supabaseAdmin
              .from('user_topic_stats')
              .select('answered_count, correct_count')
              .eq('user_id', user.id)
              .eq('topic_id', topicId)
              .maybeSingle();

            const newAnsweredCount = (existing?.answered_count || 0) + stats.total;
            const newCorrectCount = (existing?.correct_count || 0) + stats.correct;

            incDbQuery(ctx);
            const { error: upsertError } = await supabaseAdmin
              .from('user_topic_stats')
              .upsert({
                user_id: user.id,
                topic_id: topicId,
                answered_count: newAnsweredCount,
                correct_count: newCorrectCount,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,topic_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`[complete-game] Topic stats upsert error for ${topicId}:`, upsertError);
            }
          }

          console.log(`[complete-game] Updated topic stats for ${Object.keys(topicStats).length} topics`);
        } catch (topicErr) {
          console.error('[complete-game] Topic stats exception:', topicErr);
        }
      });
    }

    // NOTE: Rewards were already credited after each correct answer
    // by the credit-gameplay-reward edge function, so we do NOT credit again here

    // Get user profile for leaderboard display
    const { data: userProfile, error: profileError } = await measureStage(ctx, 'profile_fetch', async () => {
      incDbQuery(ctx);
      return await supabaseAdmin
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
    });

    if (profileError) {
      console.error('[complete-game] Profile fetch error:', profileError);
      // Not critical, use default username
    }

    // PHASE 1 OPTIMIZATION: Update daily_rankings WITHOUT rank recalculation
    // Ranks are now computed every 5 minutes by materialized view refresh
    await measureStage(ctx, 'daily_ranking', async () => {
      try {
        incDbQuery(ctx);
        const { error: dailyRankError } = await supabaseAdmin.rpc(
          'upsert_daily_ranking_aggregate',
          {
            p_user_id: user.id,
            p_correct_answers: body.correctAnswers,
            p_average_response_time: body.averageResponseTime,
          },
        );

        if (dailyRankError) {
          console.error('[complete-game] Daily ranking aggregate RPC error:', dailyRankError);
        }
      } catch (rankErr) {
        console.error('[complete-game] Daily ranking exception:', rankErr);
      }
    });

    // Update global_leaderboard using ADMIN client (AGGREGATE LIFETIME TOTAL)
    await measureStage(ctx, 'global_leaderboard', async () => {
      try {
        incDbQuery(ctx, 2);
        const { data: existingGlobal } = await supabaseAdmin
          .from('global_leaderboard')
          .select('total_correct_answers, username')
          .eq('user_id', user.id)
          .maybeSingle();

        const newGlobalTotal = (existingGlobal?.total_correct_answers || 0) + body.correctAnswers;

        const { error: leaderboardError } = await supabaseAdmin
          .from('global_leaderboard')
          .upsert({
            user_id: user.id,
            username: userProfile?.username || existingGlobal?.username || 'Player',
            total_correct_answers: newGlobalTotal,
            avatar_url: userProfile?.avatar_url || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (leaderboardError) {
          console.error('[complete-game] Global leaderboard update error:', leaderboardError);
        }
      } catch (globalErr) {
        console.error('[complete-game] Global leaderboard exception:', globalErr);
      }
    });

    if (shouldSampleSuccessLog()) {
      logSuccess(ctx, { 
        correlation_id: correlationId,
        correct_answers: body.correctAnswers,
        coins_earned: coinsEarned,
        question_analytics_count: body.questionAnalytics?.length || 0
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        coinsEarned,
        message: 'Game completed successfully!',
        correlation_id: correlationId,
        performance: {
          elapsed_ms: Date.now() - ctx.startTime,
          db_queries: ctx.dbQueryCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const ctx = startMetrics({ functionName: 'complete-game', userId: undefined });
    logError(ctx, error, { correlation_id: correlationId });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        correlation_id: correlationId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});