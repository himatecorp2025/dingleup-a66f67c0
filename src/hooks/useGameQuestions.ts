import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

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

interface GameQuestionsResponse {
  questions: Question[];
  used_pool_order: number | null;
  fallback: boolean;
  performance?: {
    selection_time_ms: number;
    cache_hit: boolean;
  };
}

// Local storage key for global last pool order
const POOL_STORAGE_KEY = 'dingleup_global_last_pool';

export function useGameQuestions() {
  const { lang: currentLang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefetchedQuestions, setPrefetchedQuestions] = useState<Question[] | null>(null);
  const [prefetchedPoolOrder, setPrefetchedPoolOrder] = useState<number | null>(null);
  const isPrefetchingRef = useRef(false);

  // Get global last pool order
  const getLastPoolOrder = useCallback((): number | null => {
    try {
      const stored = localStorage.getItem(POOL_STORAGE_KEY);
      if (!stored) return null;
      
      const poolOrder = parseInt(stored, 10);
      return isNaN(poolOrder) ? null : poolOrder;
    } catch (err) {
      console.error('[useGameQuestions] Error reading last pool order:', err);
      return null;
    }
  }, []);

  // Save global last pool order
  const saveLastPoolOrder = useCallback((poolOrder: number | null) => {
    try {
      if (poolOrder === null) {
        localStorage.removeItem(POOL_STORAGE_KEY);
      } else {
        localStorage.setItem(POOL_STORAGE_KEY, poolOrder.toString());
      }
    } catch (err) {
      console.error('[useGameQuestions] Error saving last pool order:', err);
    }
  }, []);

  // Prefetch next game questions (background operation)
  const prefetchNextGameQuestions = useCallback(async (currentPoolOrder: number | null, lang?: string) => {
    if (isPrefetchingRef.current) {
      console.log('[useGameQuestions] Prefetch already in progress, skipping');
      return;
    }

    isPrefetchingRef.current = true;
    
    // CRITICAL: Use provided lang or fallback to current UI language
    const effectiveLang = lang || currentLang;

    try {
      console.log(`[useGameQuestions] Prefetching next game questions (background, lang: ${effectiveLang})...`);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: funcError } = await supabase.functions.invoke('get-game-questions', {
        body: {
          last_pool_order: currentPoolOrder,
          lang: effectiveLang,
          user_id: user?.id || null,
        },
      });

      if (funcError) {
        console.error('[useGameQuestions] Prefetch error:', funcError);
        // CRITICAL: Reset flag on error to allow retry
        isPrefetchingRef.current = false;
        return;
      }

      const response = data as GameQuestionsResponse;

      if (response && response.questions && response.questions.length > 0) {
        setPrefetchedQuestions(response.questions);
        setPrefetchedPoolOrder(response.used_pool_order);
        const perfInfo = response.performance ? ` (${response.performance.selection_time_ms}ms)` : '';
        console.log(`[useGameQuestions] ✓ Prefetched ${response.questions.length} questions from pool ${response.used_pool_order || 'fallback'}${perfInfo}`);
      } else {
        console.warn('[useGameQuestions] Prefetch returned empty response');
      }
    } catch (err) {
      console.error('[useGameQuestions] Prefetch exception:', err);
    } finally {
      // CRITICAL: Always reset flag in finally block
      isPrefetchingRef.current = false;
    }
  }, []);

  // Get next game questions using global pool rotation
  const getNextGameQuestions = useCallback(async (lang?: string): Promise<Question[]> => {
    setLoading(true);
    setError(null);
    
    // CRITICAL: Use provided lang or fallback to current UI language
    const effectiveLang = lang || currentLang;

    try {
      // Check if we have prefetched questions
      if (prefetchedQuestions && prefetchedQuestions.length > 0) {
        console.log('[useGameQuestions] ✓ Using prefetched questions (instant, <1ms)');
        const questions = prefetchedQuestions;
        const poolOrder = prefetchedPoolOrder;

        // Clear prefetched data
        setPrefetchedQuestions(null);
        setPrefetchedPoolOrder(null);

        // Save the pool order
        if (poolOrder !== null) {
          saveLastPoolOrder(poolOrder);
          console.log(`[useGameQuestions] Saved pool order ${poolOrder}`);
        }

        // Start prefetching next questions in background
        prefetchNextGameQuestions(poolOrder, effectiveLang);

        setLoading(false);
        return questions;
      }

      // No prefetched questions - fetch synchronously
      const lastPoolOrder = getLastPoolOrder();

      console.log(`[useGameQuestions] Fetching questions (last pool: ${lastPoolOrder}, lang: ${effectiveLang})`);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: funcError } = await supabase.functions.invoke('get-game-questions', {
        body: {
          last_pool_order: lastPoolOrder,
          lang: effectiveLang,
          user_id: user?.id || null,
        },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      const response = data as GameQuestionsResponse;

      if (!response || !response.questions || response.questions.length === 0) {
        throw new Error('No questions returned from server');
      }

      // Save the pool order for next time
      if (response.used_pool_order !== null) {
        saveLastPoolOrder(response.used_pool_order);
        console.log(`[useGameQuestions] Saved pool order ${response.used_pool_order}`);
      }

      if (response.fallback) {
        console.warn('[useGameQuestions] Using fallback random selection (no pools available)');
      }

      const perfInfo = response.performance ? ` (${response.performance.selection_time_ms}ms, cache: ${response.performance.cache_hit})` : '';
      console.log(`[useGameQuestions] ✓ Questions loaded${perfInfo}`);

      // Start prefetching next questions in background
      prefetchNextGameQuestions(response.used_pool_order, effectiveLang);

      setLoading(false);
      return response.questions;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load questions';
      console.error('[useGameQuestions] Error loading game questions:', err);
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [getLastPoolOrder, saveLastPoolOrder, prefetchedQuestions, prefetchedPoolOrder, prefetchNextGameQuestions, currentLang]);

  // Clear pool history (reset rotation)
  const clearPoolHistory = useCallback(() => {
    localStorage.removeItem(POOL_STORAGE_KEY);
    setPrefetchedQuestions(null);
    setPrefetchedPoolOrder(null);
  }, []);

  return {
    getNextGameQuestions,
    clearPoolHistory,
    prefetchNextGameQuestions,
    loading,
    error,
  };
}
