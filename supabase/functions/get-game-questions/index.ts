import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRITICAL: 15 GLOBAL POOLS (pool_1 ... pool_15)
const TOTAL_POOLS = 15;
const MIN_QUESTIONS_PER_POOL = 300;
const QUESTIONS_PER_GAME = 15;

// PERSONALIZATION: 70-20-10 ratio after 100 answers
const PERSONALIZATION_THRESHOLD = 100;
const PREFERRED_TOPICS_PERCENT = 0.70; // 70% from top 3 topics
const NEW_TOPICS_PERCENT = 0.20; // 20% from topics user hasn't answered much
const OTHER_TOPICS_PERCENT = 0.10; // 10% from remaining topics

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

interface QuestionTranslation {
  question_id: string;
  question_text: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
}

interface TopicScore {
  topic_id: number;
  score: number;
  answered_count: number;
  correct_ratio: number;
}

// ============================================================================
// IN-MEMORY DUAL-LANGUAGE POOL CACHE - ALL 15 POOLS (HU + EN) LOADED AT STARTUP
// ============================================================================
const POOLS_CACHE_HU = new Map<number, Question[]>();
const POOLS_CACHE_EN = new Map<number, Question[]>();
let CACHE_INITIALIZED = false;
let CACHE_INIT_PROMISE: Promise<void> | null = null;

// Fisher-Yates shuffle for random question selection from memory
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Initialize all 15 pools into memory at startup
async function initializePoolsCache(supabase: any): Promise<void> {
  if (CACHE_INITIALIZED) return;
  if (CACHE_INIT_PROMISE) return CACHE_INIT_PROMISE;

  CACHE_INIT_PROMISE = (async () => {
    console.log('[POOL CACHE] Initializing all 15 pools (HU + EN) into memory...');
    const startTime = Date.now();

    try {
      const { data: pools, error } = await supabase
        .from('question_pools')
        .select('*')
        .gte('question_count', MIN_QUESTIONS_PER_POOL)
        .order('pool_order');

      if (error) {
        console.error('[POOL CACHE] Failed to load pools:', error);
        throw error;
      }

      if (!pools || pools.length < TOTAL_POOLS) {
        console.warn(`[POOL CACHE] Only ${pools?.length || 0} pools found, expected ${TOTAL_POOLS}`);
      }

      // Load all pools into memory (both HU and EN)
      for (const poolData of pools || []) {
        const poolOrder = poolData.pool_order;

        // ========== HUNGARIAN QUESTIONS ==========
        const questionsRawHu = poolData.questions;
        let questionsHu: Question[] = [];

        if (questionsRawHu && Array.isArray(questionsRawHu)) {
          questionsHu = questionsRawHu.map((q: any) => {
            if (typeof q === 'string') {
              try {
                return JSON.parse(q);
              } catch (err) {
                console.error(`[POOL CACHE] Failed to parse HU question:`, err);
                return null;
              }
            }
            return q;
          }).filter((q: any) => q !== null);
        }

        // ========== ENGLISH QUESTIONS ==========
        const questionsRawEn = poolData.questions_en;
        let questionsEn: Question[] = [];

        if (questionsRawEn && Array.isArray(questionsRawEn)) {
          questionsEn = questionsRawEn.map((q: any) => {
            if (typeof q === 'string') {
              try {
                return JSON.parse(q);
              } catch (err) {
                console.error(`[POOL CACHE] Failed to parse EN question:`, err);
                return null;
              }
            }
            return q;
          }).filter((q: any) => q !== null);
        }

        // ✅ VALIDATION
        if (questionsHu.length < MIN_QUESTIONS_PER_POOL) {
          console.error(`[POOL CACHE] ❌ Pool ${poolOrder} (HU) has only ${questionsHu.length} questions`);
        } else {
          console.log(`[POOL CACHE] ✅ Pool ${poolOrder} (HU) loaded: ${questionsHu.length} questions`);
        }

        if (questionsEn.length < MIN_QUESTIONS_PER_POOL) {
          console.warn(`[POOL CACHE] ⚠️  Pool ${poolOrder} (EN) has only ${questionsEn.length} questions (may need population)`);
        } else {
          console.log(`[POOL CACHE] ✅ Pool ${poolOrder} (EN) loaded: ${questionsEn.length} questions`);
        }

        POOLS_CACHE_HU.set(poolOrder, questionsHu);
        POOLS_CACHE_EN.set(poolOrder, questionsEn);
      }

      CACHE_INITIALIZED = true;
      const elapsed = Date.now() - startTime;
      console.log(`[POOL CACHE] ✅ All pools loaded in ${elapsed}ms. HU pools: ${POOLS_CACHE_HU.size}, EN pools: ${POOLS_CACHE_EN.size}`);
    } catch (err) {
      console.error('[POOL CACHE] Initialization failed:', err);
      CACHE_INIT_PROMISE = null;
      throw err;
    }
  })();

  return CACHE_INIT_PROMISE;
}

// Select 15 random questions from pool (in-memory, 0-5ms)
function selectRandomQuestionsFromMemory(poolQuestions: Question[], count: number): Question[] {
  if (poolQuestions.length <= count) {
    return fisherYatesShuffle(poolQuestions);
  }
  
  // Fisher-Yates shuffle and take first 'count' items
  const shuffled = fisherYatesShuffle(poolQuestions);
  return shuffled.slice(0, count);
}

// ============================================================================
// PERSONALIZED QUESTION SELECTION (70-20-10 ratio)
// ============================================================================
function selectPersonalizedQuestions(
  poolQuestions: Question[],
  topicScores: TopicScore[],
  count: number
): { questions: Question[]; distribution: { preferred: number; new: number; other: number } } {
  // Sort topics by score (highest first)
  const sortedTopics = [...topicScores].sort((a, b) => b.score - a.score);
  
  // Get TOP 3 topics (preferred)
  const top3TopicIds = new Set(sortedTopics.slice(0, 3).map(t => t.topic_id));
  
  // Get topics with low/no activity (new topics for exploration)
  const lowActivityTopics = new Set(
    sortedTopics
      .filter(t => t.answered_count < 5)
      .map(t => t.topic_id)
  );
  
  // All other topics
  const allTopicIds = new Set(sortedTopics.map(t => t.topic_id));
  const otherTopicIds = new Set(
    [...allTopicIds].filter(id => !top3TopicIds.has(id) && !lowActivityTopics.has(id))
  );
  
  // Categorize pool questions by topic type
  const preferredQuestions = poolQuestions.filter(q => top3TopicIds.has(q.topic_id));
  const newQuestions = poolQuestions.filter(q => lowActivityTopics.has(q.topic_id));
  const otherQuestions = poolQuestions.filter(q => otherTopicIds.has(q.topic_id) || (!top3TopicIds.has(q.topic_id) && !lowActivityTopics.has(q.topic_id)));
  
  // Calculate distribution (15 questions: 10-11 preferred, 3 new, 1-2 other)
  const preferredCount = Math.round(count * PREFERRED_TOPICS_PERCENT); // ~10-11
  const newCount = Math.round(count * NEW_TOPICS_PERCENT); // ~3
  const otherCount = count - preferredCount - newCount; // ~1-2
  
  console.log(`[PERSONALIZATION] Distribution: ${preferredCount} preferred, ${newCount} new, ${otherCount} other`);
  console.log(`[PERSONALIZATION] Available: ${preferredQuestions.length} preferred, ${newQuestions.length} new, ${otherQuestions.length} other`);
  
  // Select questions from each category
  const selectedPreferred = selectRandomQuestionsFromMemory(preferredQuestions, preferredCount);
  const selectedNew = selectRandomQuestionsFromMemory(newQuestions, newCount);
  const selectedOther = selectRandomQuestionsFromMemory(otherQuestions, otherCount);
  
  // Fill remaining slots if any category didn't have enough questions
  let combined = [...selectedPreferred, ...selectedNew, ...selectedOther];
  
  if (combined.length < count) {
    const remaining = count - combined.length;
    const usedIds = new Set(combined.map(q => q.id));
    const availableRemaining = poolQuestions.filter(q => !usedIds.has(q.id));
    const fillQuestions = selectRandomQuestionsFromMemory(availableRemaining, remaining);
    combined = [...combined, ...fillQuestions];
    console.log(`[PERSONALIZATION] Filled ${fillQuestions.length} extra questions to reach ${count}`);
  }
  
  // Final shuffle to mix categories
  return {
    questions: fisherYatesShuffle(combined).slice(0, count),
    distribution: {
      preferred: selectedPreferred.length,
      new: selectedNew.length,
      other: count - selectedPreferred.length - selectedNew.length
    }
  };
}

// Fetch user's topic statistics for personalization
async function getUserTopicScores(supabase: any, userId: string): Promise<{ scores: TopicScore[]; totalAnswered: number; aiEnabled: boolean } | null> {
  try {
    // Fetch topic stats
    const { data: topicStats, error: statsError } = await supabase
      .from('user_topic_stats')
      .select('topic_id, score, answered_count, correct_count')
      .eq('user_id', userId);
    
    if (statsError) {
      console.error('[PERSONALIZATION] Failed to fetch topic stats:', statsError);
      return null;
    }
    
    // Fetch user settings
    const { data: settings } = await supabase
      .from('user_game_settings')
      .select('ai_personalized_questions_enabled')
      .eq('user_id', userId)
      .single();
    
    const aiEnabled = settings?.ai_personalized_questions_enabled ?? true;
    
    if (!topicStats || topicStats.length === 0) {
      return { scores: [], totalAnswered: 0, aiEnabled };
    }
    
    let totalAnswered = 0;
    const scores: TopicScore[] = topicStats.map((stat: any) => {
      totalAnswered += stat.answered_count;
      return {
        topic_id: stat.topic_id,
        score: Number(stat.score),
        answered_count: stat.answered_count,
        correct_ratio: stat.answered_count > 0 ? stat.correct_count / stat.answered_count : 0
      };
    });
    
    return { scores, totalAnswered, aiEnabled };
  } catch (err) {
    console.error('[PERSONALIZATION] Error fetching user data:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // Use service role key if available so RLS does not block question_pools/questions
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Initialize pool cache if not already done
    await initializePoolsCache(supabase);

    const { last_pool_order, lang, user_id } = await req.json();
    
    // CRITICAL: Validate language - must be hu or en, no default fallback to prevent language mixing
    if (!lang || (lang !== 'hu' && lang !== 'en')) {
      throw new Error('Language parameter is required and must be "hu" or "en".');
    }

    // Calculate next pool (global rotation 1-15)
    let nextPoolOrder = 1;
    if (last_pool_order && typeof last_pool_order === 'number') {
      nextPoolOrder = (last_pool_order % TOTAL_POOLS) + 1;
    }

    console.log(`[get-game-questions] Requesting pool ${nextPoolOrder}, lang: ${lang}, user_id: ${user_id || 'none'}`);

    // ========== SELECT LANGUAGE-SPECIFIC CACHE ==========
    const poolCache = lang === 'en' ? POOLS_CACHE_EN : POOLS_CACHE_HU;
    const poolQuestions = poolCache.get(nextPoolOrder);
    
    if (!poolQuestions || poolQuestions.length < MIN_QUESTIONS_PER_POOL) {
      console.error(`[get-game-questions] Pool ${nextPoolOrder} (${lang}) not in cache or insufficient questions`);
      
      // Fallback: load from database with translation
      const { data: fallbackQuestions } = await supabase
        .from('questions')
        .select('*')
        .limit(100);

      if (!fallbackQuestions || fallbackQuestions.length < QUESTIONS_PER_GAME) {
        throw new Error('No questions available');
      }

      console.log(`[get-game-questions] Using fallback: ${fallbackQuestions.length} questions`);
      const randomQuestions = selectRandomQuestionsFromMemory(fallbackQuestions as Question[], QUESTIONS_PER_GAME);
      const translatedFallback = await translateQuestions(supabase, randomQuestions, lang);
      return new Response(
        JSON.stringify({ questions: translatedFallback, used_pool_order: null, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== CHECK IF PERSONALIZATION SHOULD BE APPLIED ==========
    let selectedQuestions: Question[];
    let personalizationApplied = false;
    let distribution = { preferred: 0, new: 0, other: QUESTIONS_PER_GAME };
    
    if (user_id) {
      const userData = await getUserTopicScores(supabase, user_id);
      
      if (userData && userData.totalAnswered >= PERSONALIZATION_THRESHOLD && userData.aiEnabled && userData.scores.length > 0) {
        // PERSONALIZATION ACTIVE: 70-20-10 distribution
        console.log(`[get-game-questions] ✅ PERSONALIZATION ACTIVE for user ${user_id} (${userData.totalAnswered} answers, AI: ${userData.aiEnabled})`);
        
        const result = selectPersonalizedQuestions(poolQuestions, userData.scores, QUESTIONS_PER_GAME);
        selectedQuestions = result.questions;
        distribution = result.distribution;
        personalizationApplied = true;
      } else {
        // Not enough data or AI disabled - use random selection
        const reason = !userData ? 'no user data' : 
                       userData.totalAnswered < PERSONALIZATION_THRESHOLD ? `only ${userData.totalAnswered}/${PERSONALIZATION_THRESHOLD} answers` :
                       !userData.aiEnabled ? 'AI disabled' : 'no topic scores';
        console.log(`[get-game-questions] Random selection for user ${user_id} (${reason})`);
        selectedQuestions = selectRandomQuestionsFromMemory(poolQuestions, QUESTIONS_PER_GAME);
      }
    } else {
      // No user_id - random selection
      console.log(`[get-game-questions] Random selection (no user_id)`);
      selectedQuestions = selectRandomQuestionsFromMemory(poolQuestions, QUESTIONS_PER_GAME);
    }

    const selectTime = Date.now();
    console.log(`[get-game-questions] Selected ${selectedQuestions.length} questions (${lang}) from pool ${nextPoolOrder}`);

    return new Response(
      JSON.stringify({
        questions: selectedQuestions,
        used_pool_order: nextPoolOrder,
        fallback: false,
        lang: lang,
        personalization: {
          applied: personalizationApplied,
          distribution: distribution
        },
        performance: {
          cache_hit: true,
          translation_needed: false
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', questions: [], used_pool_order: null, fallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});


async function translateQuestions(
  supabase: any,
  questions: Question[],
  lang: string
): Promise<Question[]> {
  // If Hungarian, no translation needed - return original
  if (lang === 'hu') {
    console.log(`[translateQuestions] Hungarian language - no translation needed`);
    return questions;
  }

  const questionIds = questions.map(q => q.id);
  
  // Fetch translations for all questions in one query
  const { data: translations } = await supabase
    .from('question_translations')
    .select('question_id, question_text, answer_a, answer_b, answer_c')
    .in('question_id', questionIds)
    .eq('lang', lang);

  if (!translations || translations.length === 0) {
    // Fallback to Hungarian if translations not found
    console.warn(`[translateQuestions] No translations found for lang: ${lang}, using Hungarian`);
    return questions;
  }

  console.log(`[translateQuestions] Applying ${translations.length} translations for lang: ${lang}`);

  // Create a map of translations by question_id
  const translationMap = new Map<string, QuestionTranslation>(
    (translations as QuestionTranslation[]).map((t: QuestionTranslation) => [t.question_id, t])
  );

  // CRITICAL: Apply translations to original question and answers fields
  return questions.map(q => {
    const translation = translationMap.get(q.id);
    
    if (translation) {
      // Apply translations to the original fields
      return {
        ...q,
        question: translation.question_text,
        answers: [
          { ...q.answers[0], text: translation.answer_a },
          { ...q.answers[1], text: translation.answer_b },
          { ...q.answers[2], text: translation.answer_c },
        ]
      };
    }
    
    // No translation found - keep original Hungarian
    return q;
  });
}
