import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Question, CONTINUE_AFTER_WRONG_COST, TIMEOUT_CONTINUE_COST } from '@/types/game';
import { useI18n } from '@/i18n';
import { Film } from 'lucide-react';

interface UseGameNavigationOptions {
  profile: any;
  userId: string | undefined;
  isAnimating: boolean;
  selectedAnswer: string | null;
  currentQuestionIndex: number;
  questions: Question[];
  correctAnswers: number;
  responseTimes: number[];
  coinsEarned: number;
  continueType: 'timeout' | 'wrong' | 'out-of-lives';
  errorBannerVisible: boolean;
  gameCompleted: boolean;
  videoAdAvailable: boolean;
  setIsAnimating: (isAnimating: boolean) => void;
  setCanSwipe: (canSwipe: boolean) => void;
  setErrorBannerVisible: (visible: boolean) => void;
  setQuestionVisible: (visible: boolean) => void;
  resetRewardAnimation: () => void;
  nextQuestion: () => void;
  resetTimer: (time: number) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setFirstAttempt: (attempt: string | null) => void;
  setSecondAttempt: (attempt: string | null) => void;
  resetQuestionHelpers: () => void;
  setQuestionStartTime: (time: number) => void;
  setGameCompleted: (completed: boolean) => void;
  refreshProfile: () => Promise<void>;
  logHelpUsage: (helpType: 'third' | 'skip' | 'audience' | '2x_answer') => Promise<void>;
  finishGame: () => Promise<void>;
  restartGameImmediately: () => Promise<void>;
  setRescueReason: (reason: 'NO_LIFE' | 'NO_GOLD') => void;
  setShowRescuePopup: (show: boolean) => void;
  triggerHaptic: (type: 'success' | 'warning' | 'error') => void;
  onDoubleRewardClick: () => void;
}

export const useGameNavigation = (options: UseGameNavigationOptions) => {
  const { t, lang } = useI18n();
  const {
    profile,
    userId,
    isAnimating,
    selectedAnswer,
    currentQuestionIndex,
    questions,
    correctAnswers,
    responseTimes,
    coinsEarned,
    continueType,
    errorBannerVisible,
    gameCompleted,
    videoAdAvailable,
    setIsAnimating,
    setCanSwipe,
    setErrorBannerVisible,
    setQuestionVisible,
    resetRewardAnimation,
    nextQuestion,
    resetTimer,
    setSelectedAnswer,
    setFirstAttempt,
    setSecondAttempt,
    resetQuestionHelpers,
    setQuestionStartTime,
    setGameCompleted,
    refreshProfile,
    logHelpUsage,
    finishGame,
    restartGameImmediately,
    setRescueReason,
    setShowRescuePopup,
    triggerHaptic,
    onDoubleRewardClick,
  } = options;

  const handleNextQuestion = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setCanSwipe(false);
    setErrorBannerVisible(false);
    setQuestionVisible(false);
    resetRewardAnimation();
    
    if (currentQuestionIndex >= questions.length - 1) {
      // Game completed - show results toast and wait for swipe up to restart
      setIsAnimating(false);
      setCanSwipe(true);
      setQuestionVisible(true);
      
      // Haptic feedback based on performance
      if (correctAnswers >= 10) {
        triggerHaptic('success');
      } else {
        triggerHaptic('warning');
      }
      
      // Calculate final results
      const avgResponseTime = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : '0.0';
      
      // Show beautiful results toast with casino aesthetic + video ad double option
      toast.success(
        <div className="flex flex-col gap-2 p-1.5">
          <div className="text-center text-base font-black mb-1 bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 bg-clip-text text-transparent">
            {t('game_results.title')}
          </div>
          <div className={`grid ${coinsEarned > 0 && videoAdAvailable ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 text-xs`}>
            {/* Box 1: Correct answers */}
            <div className="flex flex-col items-center bg-black/30 rounded-lg p-1.5 border border-yellow-500/20">
              <div className="text-base mb-0.5">✅</div>
              <div className="font-bold text-green-400 text-sm">{correctAnswers}/15</div>
              <div className="text-[9px] opacity-70">{t('game_results.correct')}</div>
            </div>
            {/* Box 2: Base coin earned */}
            <div className="flex flex-col items-center bg-black/30 rounded-lg p-1.5 border border-yellow-500/20">
              <div className="text-base mb-0.5">💰</div>
              <div className="font-bold text-yellow-400 text-sm">{coinsEarned}</div>
              <div className="text-[9px] opacity-70">{t('game_results.gold')}</div>
            </div>
            {/* Box 3: Double reward - only show if video ad available */}
            {coinsEarned > 0 && videoAdAvailable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss();
                  onDoubleRewardClick();
                }}
                className="flex flex-col items-center bg-gradient-to-b from-amber-600/40 to-orange-600/40 rounded-lg p-1.5 border border-amber-400/50 hover:from-amber-500/50 hover:to-orange-500/50 transition-all cursor-pointer animate-pulse"
              >
                <div className="flex mb-0.5">
                  <span className="text-sm">💰</span>
                  <span className="text-sm">💰</span>
                </div>
                <div className="font-bold text-amber-300 text-sm">{coinsEarned * 2}</div>
                <div className="flex items-center gap-0.5 text-[9px] text-amber-200/80">
                  <Film className="w-3 h-3" />
                  <span>▶ 2×</span>
                </div>
              </button>
            ) : null}
            {/* Box 4: Time */}
            <div className="flex flex-col items-center bg-black/30 rounded-lg p-1.5 border border-yellow-500/20">
              <div className="text-base mb-0.5">⚡</div>
              <div className="font-bold text-blue-400 text-sm">{avgResponseTime}s</div>
              <div className="text-[9px] opacity-70">{t('game_results.time')}</div>
            </div>
          </div>
          <div className="text-center mt-1 text-xs font-bold animate-pulse text-white/90">
            {t('game_results.swipe_for_new')}
          </div>
        </div>,
        {
          duration: Infinity,
          style: {
            background: 'linear-gradient(135deg, rgb(88, 28, 135) 0%, rgb(124, 58, 237) 50%, rgb(88, 28, 135) 100%)',
            color: 'white',
            border: '2px solid rgba(234, 179, 8, 0.5)',
            boxShadow: '0 8px 32px rgba(234, 179, 8, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            maxWidth: '85vw',
            width: '340px',
            backdropFilter: 'blur(8px)',
          }
        }
      );
      
      // Mark game as completed and save results to backend
      setGameCompleted(true);
      await finishGame();
      return;
    }
    
    // CRITICAL: Store timeout IDs for proper cleanup
    const firstTimeoutId = setTimeout(() => {
      nextQuestion();
      resetTimer(10);
      setSelectedAnswer(null);
      setFirstAttempt(null);
      setSecondAttempt(null);
      resetQuestionHelpers();
      setQuestionStartTime(Date.now());
      
      const secondTimeoutId = setTimeout(() => {
        setQuestionVisible(true);
        setIsAnimating(false);
        setCanSwipe(true);
      }, 100);

      // Return cleanup for nested timeout
      return () => clearTimeout(secondTimeoutId);
    }, 400);

    // Return cleanup for outer timeout
    return () => clearTimeout(firstTimeoutId);
  }, [
    isAnimating,
    currentQuestionIndex,
    questions.length,
    correctAnswers,
    responseTimes,
    coinsEarned,
    setIsAnimating,
    setCanSwipe,
    setErrorBannerVisible,
    setQuestionVisible,
    resetRewardAnimation,
    triggerHaptic,
    setGameCompleted,
    finishGame,
    nextQuestion,
    resetTimer,
    setSelectedAnswer,
    setFirstAttempt,
    setSecondAttempt,
    resetQuestionHelpers,
    setQuestionStartTime,
  ]);

  const handleSkipQuestion = useCallback(async () => {
    if (!profile) return;
    
    let cost = 10;
    if (currentQuestionIndex >= 5 && currentQuestionIndex <= 9) cost = 20;
    if (currentQuestionIndex >= 10) cost = 30;
    
    if (profile.coins < cost) {
      toast.error(`${t('game.insufficient_coins')} ${cost} ${t('game.coins_required')}`);
      return;
    }
    
    const { data: success } = await supabase.rpc('spend_coins', { amount: cost });
    if (success) {
      await refreshProfile();
      await logHelpUsage('skip');
      await handleNextQuestion();
    }
  }, [profile, currentQuestionIndex, refreshProfile, logHelpUsage, handleNextQuestion]);

  const handleContinueAfterMistake = useCallback(async () => {
    if (!profile) return;
    
    const cost = continueType === 'timeout' ? TIMEOUT_CONTINUE_COST : CONTINUE_AFTER_WRONG_COST;
    
    const { data: success } = await supabase.rpc('spend_coins', { amount: cost });
    if (success) {
      await refreshProfile();
      await handleNextQuestion();
    } else {
      await finishGame();
    }
  }, [profile, continueType, refreshProfile, handleNextQuestion, finishGame]);

  const handleSwipeUp = useCallback(async () => {
    // If game completed, restart new game
    if (gameCompleted) {
      await restartGameImmediately();
      return;
    }
    
    // If error banner visible and user wants to continue
    if (errorBannerVisible && profile) {
      const cost = continueType === 'timeout' ? TIMEOUT_CONTINUE_COST : CONTINUE_AFTER_WRONG_COST;
      
      // Check if user has enough coins NOW
      if (profile.coins < cost) {
        // Not enough coins - show rescue popup
        setErrorBannerVisible(false);
        setRescueReason('NO_GOLD');
        setShowRescuePopup(true);
        return;
      }
      
      // Has enough coins - continue
      await handleContinueAfterMistake();
      return;
    }

    // If question answered correctly, go to next
    if (selectedAnswer && !isAnimating) {
      const currentQuestion = questions[currentQuestionIndex];
      const selectedAnswerObj = currentQuestion.answers.find(a => a.key === selectedAnswer);
      if (selectedAnswerObj?.correct) {
        await handleNextQuestion();
      }
    }
  }, [
    gameCompleted,
    errorBannerVisible,
    profile,
    continueType,
    selectedAnswer,
    isAnimating,
    questions,
    currentQuestionIndex,
    restartGameImmediately,
    setErrorBannerVisible,
    setRescueReason,
    setShowRescuePopup,
    handleContinueAfterMistake,
    handleNextQuestion,
  ]);

  const handleSwipeDown = useCallback(async () => {
    // CRITICAL: Only dismiss game result toast, not all toasts
    // This prevents accidentally dismissing important error/success messages
    if (errorBannerVisible) {
      setErrorBannerVisible(false);
    }
    await restartGameImmediately();
  }, [errorBannerVisible, setErrorBannerVisible, restartGameImmediately]);

  return {
    handleNextQuestion,
    handleSkipQuestion,
    handleContinueAfterMistake,
    handleSwipeUp,
    handleSwipeDown,
  };
};
