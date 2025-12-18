import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceeded, RATE_LIMITS } from '../_shared/rateLimit.ts';
import { startMetrics, measureStage, incDbQuery, logSuccess, logError, shouldSampleSuccessLog } from '../_shared/metrics.ts';

// ============================================================================
// OPTIMIZED GAME SESSION START - CENTRALIZED METRICS & STRUCTURED LOGGING
// ============================================================================

const TOTAL_POOLS = 15;
const MIN_QUESTIONS_PER_POOL = 300;
const QUESTIONS_PER_GAME = 15;

interface Question {
  id: string;
  question: string;
  answers: any[];
  audience: number[];
  third: string;
  topic_id: number;
  source_category: string;
  correct_answer: string;
}

// ============================================================================
// IN-MEMORY DUAL-LANGUAGE POOL CACHE (HU + EN)
// ============================================================================
const POOLS_CACHE_HU = new Map<number, Question[]>();
const POOLS_CACHE_EN = new Map<number, Question[]>();
let CACHE_INITIALIZED = false;
let CACHE_INIT_PROMISE: Promise<void> | null = null;

// Fisher-Yates shuffle
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Initialize dual-language pool cache with structured metrics
async function initializePoolsCache(supabase: any): Promise<void> {
  if (CACHE_INITIALIZED) return;
  if (CACHE_INIT_PROMISE) return CACHE_INIT_PROMISE;

  CACHE_INIT_PROMISE = (async () => {
    const ctx = startMetrics({ functionName: 'question-pool-cache-init', userId: null });

    try {
      await measureStage(ctx, 'cache_load', async () => {
        incDbQuery(ctx);
        const { data: pools, error } = await supabase
          .from('question_pools')
          .select('*')
          .gte('question_count', MIN_QUESTIONS_PER_POOL)
          .order('pool_order');

        if (error) throw error;

        let totalHuQuestions = 0;
        let totalEnQuestions = 0;

        for (const poolData of pools || []) {
          const poolOrder = poolData.pool_order;

          // Parse Hungarian questions
          const questionsRawHu = poolData.questions;
          let questionsHu: Question[] = [];
          if (questionsRawHu && Array.isArray(questionsRawHu)) {
            questionsHu = questionsRawHu.map((q: any) => 
              typeof q === 'string' ? JSON.parse(q) : q
            ).filter((q: any) => q !== null);
          }

          // Parse English questions
          const questionsRawEn = poolData.questions_en;
          let questionsEn: Question[] = [];
          if (questionsRawEn && Array.isArray(questionsRawEn)) {
            questionsEn = questionsRawEn.map((q: any) => 
              typeof q === 'string' ? JSON.parse(q) : q
            ).filter((q: any) => q !== null);
          }

          POOLS_CACHE_HU.set(poolOrder, questionsHu);
          POOLS_CACHE_EN.set(poolOrder, questionsEn);

          totalHuQuestions += questionsHu.length;
          totalEnQuestions += questionsEn.length;
        }

        CACHE_INITIALIZED = true;

        logSuccess(ctx, {
          label: 'POOL_CACHE',
          hu_pools: POOLS_CACHE_HU.size,
          en_pools: POOLS_CACHE_EN.size,
          total_hu_questions: totalHuQuestions,
          total_en_questions: totalEnQuestions,
        });
      });
    } catch (error) {
      logError(ctx, error, { label: 'POOL_CACHE_INIT_FAILED' });
      CACHE_INIT_PROMISE = null;
      throw error;
    }
  })();

  return CACHE_INIT_PROMISE;
}

// Select random questions from pool
function selectRandomQuestions(poolQuestions: Question[], count: number): Question[] {
  if (poolQuestions.length <= count) {
    return fisherYatesShuffle(poolQuestions);
  }
  return fisherYatesShuffle(poolQuestions).slice(0, count);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);

  let userId: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { 
            Authorization: authHeader,
            'X-Connection-Pooler': 'true',
          },
        },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;
    const ctx = startMetrics({ functionName: 'start-game-session', userId });

    const rateLimitResult = await checkRateLimit(supabaseClient, 'start-game-session', RATE_LIMITS.GAME);
    if (!rateLimitResult.allowed) {
      return rateLimitExceeded(corsHeaders);
    }

    // Parse request body for lang
    let requestBody: { lang?: string } = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      // No body or parse error - continue with defaults
    }

    // Parallel DB queries for profile and pool session
    const [
      { data: userProfile },
      { data: poolSession }
    ] = await measureStage(ctx, 'parallel_queries', async () => {
      incDbQuery(ctx, 2);
      return await Promise.all([
        supabaseClient
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single(),
        supabaseClient
          .from('game_session_pools')
          .select('last_pool_order')
          .eq('user_id', user.id)
          .single()
      ]);
    });

    const userLang = requestBody.lang || userProfile?.preferred_language || 'en';
    const lastPoolOrder = poolSession?.last_pool_order || null;

    // Initialize cache if needed
    await initializePoolsCache(supabaseClient);

    // Pool rotation logic
    let nextPoolOrder = 1;
    if (lastPoolOrder && typeof lastPoolOrder === 'number') {
      nextPoolOrder = (lastPoolOrder % TOTAL_POOLS) + 1;
    }

    // Select language-specific questions from cache
    const selectedQuestions = await measureStage(ctx, 'question_selection', async () => {
      const poolCache = userLang === 'en' ? POOLS_CACHE_EN : POOLS_CACHE_HU;
      const poolQuestions = poolCache.get(nextPoolOrder);

      if (!poolQuestions || poolQuestions.length < MIN_QUESTIONS_PER_POOL) {
        throw new Error(`Pool ${nextPoolOrder} (${userLang}) insufficient questions`);
      }

      return selectRandomQuestions(poolQuestions, QUESTIONS_PER_GAME);
    });

    // Update pool session
    await measureStage(ctx, 'pool_update', async () => {
      incDbQuery(ctx);
      await supabaseClient
        .from('game_session_pools')
        .upsert({
          user_id: user.id,
          last_pool_order: nextPoolOrder,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
    });

    // Create game session
    const sessionId = crypto.randomUUID();
    await measureStage(ctx, 'session_insert', async () => {
      incDbQuery(ctx);
      const sessionData = {
        user_id: user.id,
        session_id: sessionId,
        category: 'mixed',
        questions: selectedQuestions.map((q: any) => ({
          id: q.id,
          question: q.question,
          correctAnswer: q.answers.findIndex((a: any) => a.correct),
          difficulty: 'medium'
        })),
        current_question: 0,
        correct_answers: 0,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const { error: insertError } = await supabaseClient
        .from('game_sessions')
        .insert(sessionData);

      if (insertError) {
        throw insertError;
      }
    });

    const totalElapsed = Date.now() - ctx.startTime;

    // Structured log with sampling (high-frequency endpoint)
    if (shouldSampleSuccessLog()) {
      logSuccess(ctx, {
        session_id: sessionId,
        cache_status: 'HIT',
        pool_number: nextPoolOrder,
        language: userLang,
        question_count: selectedQuestions.length,
      });
    }

    return new Response(
      JSON.stringify({ 
        sessionId,
        questions: selectedQuestions,
        poolUsed: nextPoolOrder,
        lang: userLang,
        performance: {
          elapsed_ms: totalElapsed,
          parallel_queries_ms: ctx.extra['parallel_queries_ms'],
          question_selection_ms: ctx.extra['question_selection_ms'],
          pool_update_ms: ctx.extra['pool_update_ms'],
          session_insert_ms: ctx.extra['session_insert_ms'],
          db_queries_count: ctx.dbQueryCount,
          db_queries_for_questions: 0 // ZERO (cached)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    if (userId) {
      const ctx = startMetrics({ functionName: 'start-game-session', userId });
      ctx.startTime = Date.now() - 0; // Approximate
      logError(ctx, error);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
