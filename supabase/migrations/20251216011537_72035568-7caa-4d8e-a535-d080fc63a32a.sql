-- Fix function - don't insert into generated column question_count
DROP FUNCTION IF EXISTS public.populate_question_pools_direct();

CREATE OR REPLACE FUNCTION public.populate_question_pools_direct()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_order INT;
  v_topic_id INT;
  v_question_offset INT;
  v_question_record RECORD;
  v_en_translation RECORD;
  v_questions_array JSONB[];
  v_questions_en_array JSONB[];
  v_total_pools INT := 0;
  v_total_questions INT;
  v_topics_count INT;
BEGIN
  -- Get counts
  SELECT COUNT(*)::INT INTO v_total_questions FROM questions;
  SELECT COUNT(DISTINCT id)::INT INTO v_topics_count FROM topics;
  
  -- Clear existing pools
  DELETE FROM question_pools;
  
  -- Create 20 pools
  FOR v_pool_order IN 1..20 LOOP
    v_questions_array := ARRAY[]::JSONB[];
    v_questions_en_array := ARRAY[]::JSONB[];
    
    -- For each topic, get 10 questions for this pool
    FOR v_topic_id IN 1..30 LOOP
      -- Calculate offset: pool 1 gets questions 0-9, pool 2 gets 10-19, etc.
      v_question_offset := (v_pool_order - 1) * 10;
      
      -- Get 10 questions from this topic for this pool (Hungarian)
      FOR v_question_record IN 
        SELECT q.id, q.question, q.answers, q.audience, q.third, q.topic_id, q.source_category, q.correct_answer
        FROM questions q
        WHERE q.topic_id = v_topic_id
        ORDER BY q.id
        OFFSET v_question_offset
        LIMIT 10
      LOOP
        -- Add Hungarian question
        v_questions_array := array_append(v_questions_array, jsonb_build_object(
          'id', v_question_record.id,
          'question', v_question_record.question,
          'answers', v_question_record.answers,
          'audience', v_question_record.audience,
          'third', v_question_record.third,
          'topic_id', v_question_record.topic_id,
          'source_category', v_question_record.source_category,
          'correct_answer', v_question_record.correct_answer
        ));
        
        -- Get English translation
        SELECT qt.question_text, qt.answer_a, qt.answer_b, qt.answer_c
        INTO v_en_translation
        FROM question_translations qt
        WHERE qt.question_id = v_question_record.id AND qt.lang = 'en';
        
        IF FOUND THEN
          -- Build English version with translated text
          v_questions_en_array := array_append(v_questions_en_array, jsonb_build_object(
            'id', v_question_record.id,
            'question', v_en_translation.question_text,
            'answers', jsonb_build_array(
              jsonb_build_object('text', v_en_translation.answer_a, 'key', 'A', 'correct', (v_question_record.answers->0->>'correct')::boolean),
              jsonb_build_object('text', v_en_translation.answer_b, 'key', 'B', 'correct', (v_question_record.answers->1->>'correct')::boolean),
              jsonb_build_object('text', v_en_translation.answer_c, 'key', 'C', 'correct', (v_question_record.answers->2->>'correct')::boolean)
            ),
            'audience', v_question_record.audience,
            'third', v_question_record.third,
            'topic_id', v_question_record.topic_id,
            'source_category', v_question_record.source_category,
            'correct_answer', v_question_record.correct_answer
          ));
        ELSE
          -- Fallback to Hungarian if no translation
          v_questions_en_array := array_append(v_questions_en_array, jsonb_build_object(
            'id', v_question_record.id,
            'question', v_question_record.question,
            'answers', v_question_record.answers,
            'audience', v_question_record.audience,
            'third', v_question_record.third,
            'topic_id', v_question_record.topic_id,
            'source_category', v_question_record.source_category,
            'correct_answer', v_question_record.correct_answer
          ));
        END IF;
      END LOOP;
    END LOOP;
    
    -- Insert pool if we have enough questions (300 = 30 topics × 10 questions)
    IF array_length(v_questions_array, 1) >= 300 THEN
      -- Don't insert question_count - it's a generated column
      INSERT INTO question_pools (pool_order, questions, questions_en, version)
      VALUES (
        v_pool_order,
        v_questions_array,
        to_jsonb(v_questions_en_array),
        1
      );
      v_total_pools := v_total_pools + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'pools_created', v_total_pools,
    'total_questions', v_total_questions,
    'topics_count', v_topics_count
  );
END;
$$;