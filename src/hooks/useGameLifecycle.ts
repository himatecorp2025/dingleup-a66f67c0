import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/game';
import { trackFeatureUsage, trackGameMilestone } from '@/lib/analytics';
import { useI18n } from '@/i18n';


interface UseGameLifecycleOptions {
  userId: string | undefined;
  profile: any;
  spendLife: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  refetchWallet: () => Promise<void>;
  broadcast: (channel: string, data: any) => void;
  creditStartReward: () => Promise<void>;
  setQuestions: (questions: Question[]) => void;
  resetGameStateHook: () => void;
  resetTimer: (time: number) => void;
  setHelp5050UsageCount: (count: number) => void;
  setHelp2xAnswerUsageCount: (count: number) => void;
  setHelpAudienceUsageCount: (count: number) => void;
  resetQuestionHelpers: () => void;
  setQuestionStartTime: (time: number) => void;
  setCanSwipe: (canSwipe: boolean) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  setCoinsEarned: (coins: number) => void;
  resetRewardAnimation: () => void;
  setFirstAttempt: (attempt: string | null) => void;
  setSecondAttempt: (attempt: string | null) => void;
  setErrorBannerVisible: (visible: boolean) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setQuestionVisible: (visible: boolean) => void;
  correctAnswers: number;
  responseTimes: number[];
  answerResults: boolean[]; // Per-question correct/wrong tracking
  coinsEarned: number;
  questions: Question[];
  questionStartTime: number;
  gameCompleted: boolean;
  setGameCompleted: (completed: boolean) => void;
  prefetchedQuestions: Question[] | null;
  onPrefetchComplete: (questions: Question[]) => void;
}

export const useGameLifecycle = (options: UseGameLifecycleOptions) => {
  const { t, lang } = useI18n();
  
  const {
    userId,
    profile,
    spendLife,
    refreshProfile,
    refetchWallet,
    broadcast,
    creditStartReward,
    setQuestions,
    resetGameStateHook,
    resetTimer,
    setHelp5050UsageCount,
    setHelp2xAnswerUsageCount,
    setHelpAudienceUsageCount,
    resetQuestionHelpers,
    setQuestionStartTime,
    setCanSwipe,
    setIsAnimating,
    setCoinsEarned,
    resetRewardAnimation,
    setFirstAttempt,
    setSecondAttempt,
    setErrorBannerVisible,
    setCurrentQuestionIndex,
    setQuestionVisible,
    correctAnswers,
    responseTimes,
    answerResults,
    coinsEarned,
    questions,
    questionStartTime,
    gameCompleted,
    setGameCompleted,
    prefetchedQuestions,
    onPrefetchComplete,
  } = options;

  const navigate = useNavigate();
  const [showLoadingVideo, setShowLoadingVideo] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isGameReady, setIsGameReady] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const gameInitPromiseRef = useRef<Promise<void> | null>(null);

  const shuffleAnswers = (questionSet: any[]): Question[] => {
    let lastCorrectIndex = -1;
    let lastCorrectCount = 0;
    
    return questionSet.map((q) => {
      const existingAnswers = q.answers;
      const shuffledAnswers = [...existingAnswers].sort(() => Math.random() - 0.5);
      
      const newAnswers = [
        { key: 'A', text: shuffledAnswers[0].text, correct: shuffledAnswers[0].correct },
        { key: 'B', text: shuffledAnswers[1].text, correct: shuffledAnswers[1].correct },
        { key: 'C', text: shuffledAnswers[2].text, correct: shuffledAnswers[2].correct }
      ];
      
      const newCorrectIdx = newAnswers.findIndex(a => a.correct);
      
      let attempts = 0;
      while ((newCorrectIdx === lastCorrectIndex && lastCorrectCount >= 2) && attempts < 10) {
        const reshuffled = [...existingAnswers].sort(() => Math.random() - 0.5);
        newAnswers[0] = { key: 'A', text: reshuffled[0].text, correct: reshuffled[0].correct };
        newAnswers[1] = { key: 'B', text: reshuffled[1].text, correct: reshuffled[1].correct };
        newAnswers[2] = { key: 'C', text: reshuffled[2].text, correct: reshuffled[2].correct };
        attempts++;
      }
      
      const finalCorrectIdx = newAnswers.findIndex(a => a.correct);
      if (finalCorrectIdx === lastCorrectIndex) {
        lastCorrectCount++;
      } else {
        lastCorrectIndex = finalCorrectIdx;
        lastCorrectCount = 1;
      }
      
      return { ...q, answers: newAnswers } as Question;
    });
  };

  const startGame = useCallback(async (skipLoadingVideo: boolean = false, usePrefetched: boolean = false) => {
    if (!profile || isStarting) return;
    
    // INSTANT MODE: Use prefetched questions if available
    if (usePrefetched && prefetchedQuestions && prefetchedQuestions.length > 0) {
      console.log('[useGameLifecycle] ⚡ INSTANT RESTART - Using prefetched questions (<5ms)');
      
      setIsStarting(true);
      setShowLoadingVideo(false);
      setVideoEnded(true);
      setIsGameReady(true);
      
      try {
        // Backend operations in parallel (non-blocking)
        const backendOps = (async () => {
          try {
            await supabase.rpc('reset_game_helps');
          } catch (error) {
            console.error('Error resetting helps:', error);
          }
          
          const canPlay = await spendLife();
          if (!canPlay) {
            toast.error(t('game.insufficient_lives'));
            navigate('/dashboard');
            throw new Error('Insufficient lives');
          }
          
          await refetchWallet();
          await broadcast('wallet:update', { source: 'game_start', livesDelta: -1 });
          await creditStartReward();
          await refreshProfile();
        })();

        // Immediately set questions and reset state (ATOMIC)
        const shuffledWithVariety = shuffleAnswers(prefetchedQuestions);
        setQuestions(shuffledWithVariety);
        
        resetGameStateHook();
        resetTimer(10);
        setHelp5050UsageCount(0);
        setHelp2xAnswerUsageCount(0);
        setHelpAudienceUsageCount(0);
        resetQuestionHelpers();
        setFirstAttempt(null);
        setSecondAttempt(null);
        setQuestionStartTime(Date.now());
        setCanSwipe(true);
        setIsAnimating(false);
        
        setIsStarting(false);
        
        // Wait for backend ops to complete
        await backendOps;
        
        console.log('[useGameLifecycle] ✓ Instant restart complete');
        return;
      } catch (error) {
        console.error('[useGameLifecycle] Instant restart error:', error);
        setIsStarting(false);
        return;
      }
    }
    
    // NORMAL MODE: Full backend loading
    if (userId) {
      await trackFeatureUsage(userId, 'game_action', 'game', 'start', {
        skipLoadingVideo,
        category: 'mixed'
      });

      await trackGameMilestone(userId, 'game_start', {
        category: 'mixed',
        question_index: 0,
        correct_answers: 0,
      });
    }
    
    setIsStarting(true);
    if (!skipLoadingVideo) {
      setShowLoadingVideo(true);
      setVideoEnded(false);
      setIsGameReady(false);
    } else {
      setShowLoadingVideo(false);
      setVideoEnded(true);
      setIsGameReady(true);
    }
    
    const backendStartTime = performance.now();
    console.log('[useGameLifecycle] Backend loading started');
    
    gameInitPromiseRef.current = (async () => {
      try {
        await supabase.rpc('reset_game_helps');
      } catch (error) {
        console.error('Error resetting helps:', error);
      }
      
      const canPlay = await spendLife();
      if (!canPlay) {
        toast.error(t('game.insufficient_lives'));
        setIsStarting(false);
        navigate('/dashboard');
        throw new Error('Insufficient lives');
      }
      
      await refetchWallet();
      await broadcast('wallet:update', { source: 'game_start', livesDelta: -1 });
      
      const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !authSession) {
        console.error('[useGameLifecycle] Session error:', sessionError);
        toast.error(t('game.session_expired'));
        navigate('/auth/login');
        throw new Error('Session error');
      }
      
        await Promise.all([
        creditStartReward(),
         (async () => {
           try {
             // CRITICAL: Always send CURRENT UI language to backend for correct question language
             // Do NOT rely on profile.preferred_language here because it can be stale after user switches language
             const userLang = lang || 'en';
             const { data, error } = await supabase.functions.invoke('start-game-session', {
               headers: { Authorization: `Bearer ${authSession.access_token}` },
               body: { lang: userLang }
             });

            if (error) throw error;
            
            if (!data?.questions || data.questions.length === 0) {
              throw new Error('No questions received from backend');
            }

            const shuffledWithVariety = shuffleAnswers(data.questions);
            setQuestions(shuffledWithVariety);
            // NOTE: Do not mark these as prefetched for the next game.
            // Prefetch for upcoming games is handled separately (e.g. at question 10)
            // to ensure each new game always uses the NEXT pool in the global rotation.
          } catch (error) {
            console.error('[useGameLifecycle] Failed to load questions:', error);
            toast.error(t('game.error_loading_questions'));
            setIsStarting(false);
            navigate('/dashboard');
            throw error;
          }
        })(),
        refreshProfile()
      ]);

      resetGameStateHook();
      resetTimer(10);
      setHelp5050UsageCount(0);
      setHelp2xAnswerUsageCount(0);
      setHelpAudienceUsageCount(0);
      resetQuestionHelpers();
      setFirstAttempt(null);
      setSecondAttempt(null);
      setQuestionStartTime(Date.now());
      setCanSwipe(true);
      setIsAnimating(false);
      
      setIsStarting(false);
      gameInitPromiseRef.current = null;
      
      const backendEndTime = performance.now();
      const backendDuration = backendEndTime - backendStartTime;
      console.log(`[useGameLifecycle] Backend loading completed in ${backendDuration.toFixed(0)}ms`);
      
    })();
   }, [
     profile, isStarting, userId, spendLife, navigate, refetchWallet, broadcast,
     creditStartReward, setQuestions, resetGameStateHook, resetTimer,
     setHelp5050UsageCount, setHelp2xAnswerUsageCount, setHelpAudienceUsageCount,
     resetQuestionHelpers, setFirstAttempt, setSecondAttempt, setQuestionStartTime,
     setCanSwipe, setIsAnimating, refreshProfile, prefetchedQuestions, onPrefetchComplete,
     lang
   ]);

  const handleVideoEnd = useCallback(async () => {
    if (gameInitPromiseRef.current) {
      try {
        // Timeout set to 5 seconds
        await Promise.race([
          gameInitPromiseRef.current,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Game initialization timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.error('[useGameLifecycle] Init timeout or error:', error);
        
        // CRITICAL FIX: Refund the spent life since game didn't start
        try {
          await supabase.rpc('credit_lives', {
            p_user_id: userId!,
            p_delta_lives: 1,
            p_source: 'game_timeout_refund',
            p_idempotency_key: `timeout_refund_${Date.now()}`
          });
          await refetchWallet();
          await broadcast('wallet:update', { source: 'game_timeout_refund', livesDelta: 1 });
        } catch (refundError) {
          console.error('[useGameLifecycle] Failed to refund life:', refundError);
        }
        
        // Show error message
        toast.error(t('game.loading_timeout'));
        
        // Wait 2 seconds before navigating (5s timeout + 2s = 7s total)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsStarting(false);
        navigate('/dashboard');
        return;
      }
    }
    
    setIsGameReady(true);
    setVideoEnded(true);
    setIsStarting(false);
  }, [navigate, t, userId, refetchWallet, broadcast]);

  const restartGameImmediately = useCallback(async () => {
    if (!profile || isStarting) return;

    console.log('[useGameLifecycle] ⚡ INSTANT RESTART initiated');
    toast.dismiss();
    
    // ATOMIC STATE RESET
    resetGameStateHook();
    setCoinsEarned(0);
    setHelp5050UsageCount(0);
    setHelp2xAnswerUsageCount(0);
    setHelpAudienceUsageCount(0);
    resetQuestionHelpers();
    setFirstAttempt(null);
    setSecondAttempt(null);
    setErrorBannerVisible(false);
    resetRewardAnimation();
    setCurrentQuestionIndex(0);
    
    // CRITICAL: Reset gameCompleted flag to allow normal swipe navigation
    setGameCompleted(false);
    
    // CRITICAL: Clear old questions IMMEDIATELY to prevent old question flash
    setQuestions([]);
    setQuestionVisible(false);
    
    // NO animation during restart for instant feel
    setIsAnimating(false);
    setCanSwipe(false);
    
    if (!gameCompleted) {
      toast.error(t('game.restart_lost_gold'), {
        duration: 2000,
        style: {
          background: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
          border: '1px solid hsl(var(--destructive))',
        }
      });
    }
    
    // CRITICAL: ALWAYS use prefetch mode if available for instant restart
    const usePrefetch = prefetchedQuestions && prefetchedQuestions.length > 0;
    console.log(`[useGameLifecycle] Restart mode: ${usePrefetch ? 'PREFETCH (instant <5ms)' : 'FULL BACKEND'}`);
    await startGame(true, usePrefetch);
    
    // Instant transition to new game
    setTimeout(() => {
      resetTimer(10);
      setQuestionVisible(true);
      setCanSwipe(true);
      console.log('[useGameLifecycle] ✓ Instant restart complete');
    }, 50);
  }, [
    profile, isStarting, gameCompleted, prefetchedQuestions, resetGameStateHook, setCoinsEarned,
    setHelp5050UsageCount, setHelp2xAnswerUsageCount, setHelpAudienceUsageCount,
    resetQuestionHelpers, setFirstAttempt, setSecondAttempt, setErrorBannerVisible,
    resetRewardAnimation, startGame, setIsAnimating, setCanSwipe, setQuestionVisible,
    setCurrentQuestionIndex, resetTimer, setGameCompleted
  ]);

  const finishGame = useCallback(async () => {
    if (!profile) return;

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    try {
      if (userId && correctAnswers > 0) {
        await trackGameMilestone(userId, 'game_complete', {
          category: 'mixed',
          question_index: 15,
          correct_answers: correctAnswers,
          time_played_seconds: Math.floor((Date.now() - questionStartTime) / 1000),
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t('errors.session_expired'));
        return;
      }

      // Build question analytics data for ad profiling using actual answerResults
      const questionAnalytics = questions.map((q, idx) => ({
        questionId: q.id,
        topicId: q.topic_id || q.topic, // Use topic_id if available, fallback to topic name
        wasCorrect: answerResults[idx] ?? false, // Use actual per-question result
        responseTimeSeconds: responseTimes[idx] || 0,
        questionIndex: idx,
      }));

      const { data, error } = await supabase.functions.invoke('complete-game', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          category: 'mixed',
          correctAnswers: correctAnswers,
          totalQuestions: questions.length,
          averageResponseTime: avgResponseTime,
          questionAnalytics: questionAnalytics, // NEW: Send per-question data
        }
      });

      if (error) throw error;

      const serverCoinsEarned = data?.coinsEarned || 0;
      setCoinsEarned(serverCoinsEarned);

      await refreshProfile();

      if (correctAnswers > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('total_correct_answers')
          .eq('id', userId!)
          .single();

        if (currentProfile) {
          await supabase
            .from('profiles')
            .update({ 
              total_correct_answers: (currentProfile.total_correct_answers || 0) + correctAnswers 
            })
            .eq('id', userId!);
        }
      }
      
      
    } catch (error) {
      console.error('Error finishing game:', error);
      await refreshProfile();
    }
  }, [
    profile, responseTimes, answerResults, userId, correctAnswers, questionStartTime,
    questions, setCoinsEarned, refreshProfile, t
  ]);

  const resetGameState = useCallback(() => {
    if (!gameCompleted) {
      toast.error(t('game.exit_lost_gold'), {
        duration: 3000,
        style: {
          background: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
        }
      });
    }
    
    navigate('/dashboard');
  }, [gameCompleted, navigate, t]);

  return {
    showLoadingVideo,
    videoEnded,
    isGameReady,
    hasAutoStarted,
    setHasAutoStarted,
    isStarting,
    startGame,
    handleVideoEnd,
    restartGameImmediately,
    finishGame,
    resetGameState,
  };
};
