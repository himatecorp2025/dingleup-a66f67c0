import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 20 GLOBAL POOLS with 300 questions each
const TOTAL_POOLS = 20;
const MIN_QUESTIONS_PER_POOL = 300;
const QUESTIONS_PER_TOPIC_PER_POOL = 10;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if pools already exist
    const { data: existingPools } = await supabase
      .from('question_pools')
      .select('pool_order')
      .limit(1);

    if (existingPools && existingPools.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Pools already exist', pools_count: existingPools.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ALL questions with proper pagination to get all 6000
    let allQuestions: any[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from('questions')
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (batchError) throw new Error(`Questions fetch error: ${batchError.message}`);
      if (!batch || batch.length === 0) break;

      allQuestions = allQuestions.concat(batch);
      offset += batchSize;

      if (batch.length < batchSize) break;
    }

    const questions = allQuestions;

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Total questions: ${questions.length}`);

    // Fetch ALL English translations with pagination
    let allEnTranslations: any[] = [];
    offset = 0;

    while (true) {
      const { data: batch } = await supabase
        .from('question_translations')
        .select('question_id, question_text, answer_a, answer_b, answer_c')
        .eq('lang', 'en')
        .range(offset, offset + batchSize - 1);

      if (!batch || batch.length === 0) break;

      allEnTranslations = allEnTranslations.concat(batch);
      offset += batchSize;

      if (batch.length < batchSize) break;
    }

    const enTranslations = allEnTranslations;

    const enTransMap = new Map<string, any>();
    (enTranslations || []).forEach((t: any) => {
      enTransMap.set(t.question_id, t);
    });

    console.log(`English translations: ${enTransMap.size}`);

    // Group by topic
    const questionsByTopic = new Map<number, Question[]>();
    questions.forEach((q: Question) => {
      if (!questionsByTopic.has(q.topic_id)) {
        questionsByTopic.set(q.topic_id, []);
      }
      questionsByTopic.get(q.topic_id)!.push(q);
    });

    const topicIds = Array.from(questionsByTopic.keys());
    console.log(`Topics: ${topicIds.length}`);

    // Shuffle each topic
    topicIds.forEach(topicId => {
      const topicQuestions = questionsByTopic.get(topicId)!;
      for (let i = topicQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topicQuestions[i], topicQuestions[j]] = [topicQuestions[j], topicQuestions[i]];
      }
    });

    const pools = [];
    const topicPointers = new Map<number, number>();
    topicIds.forEach(id => topicPointers.set(id, 0));

    for (let poolOrder = 1; poolOrder <= TOTAL_POOLS; poolOrder++) {
      const poolQuestions: Question[] = [];

      for (const topicId of topicIds) {
        const topicQuestions = questionsByTopic.get(topicId)!;
        const startIdx = topicPointers.get(topicId)!;
        
        if (startIdx >= topicQuestions.length) continue;
        
        const remainingQuestions = topicQuestions.length - startIdx;
        const questionsToTake = Math.min(QUESTIONS_PER_TOPIC_PER_POOL, remainingQuestions);
        const questionsToAdd = topicQuestions.slice(startIdx, startIdx + questionsToTake);
        
        poolQuestions.push(...questionsToAdd);
        topicPointers.set(topicId, startIdx + questionsToTake);
      }

      // Shuffle pool
      for (let i = poolQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolQuestions[i], poolQuestions[j]] = [poolQuestions[j], poolQuestions[i]];
      }

      // Create English version
      const poolQuestionsEn = poolQuestions.map((q: Question) => {
        const enTrans = enTransMap.get(q.id);
        if (enTrans) {
          return {
            ...q,
            question: enTrans.question_text,
            answers: q.answers.map((a: any, idx: number) => ({
              ...a,
              text: idx === 0 ? enTrans.answer_a : idx === 1 ? enTrans.answer_b : enTrans.answer_c,
            })),
          };
        }
        return q;
      });

      if (poolQuestions.length >= MIN_QUESTIONS_PER_POOL) {
        pools.push({
          pool_order: poolOrder,
          questions: poolQuestions,
          questions_en: poolQuestionsEn,
          version: 1,
        });
        console.log(`Pool ${poolOrder}: ${poolQuestions.length} questions`);
      }
    }

    // Insert pools
    const { error: insertError } = await supabase
      .from('question_pools')
      .insert(pools);

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pools_created: pools.length,
        total_questions: questions.length,
        topics_count: topicIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
