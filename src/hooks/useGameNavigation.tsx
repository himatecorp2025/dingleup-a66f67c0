import React, { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Question, CONTINUE_AFTER_WRONG_COST, TIMEOUT_CONTINUE_COST } from '@/types/game';
import { useI18n } from '@/i18n';
import { Film, Trophy, Sparkles, Zap } from 'lucide-react';
import { logger } from '@/lib/logger';
import { CoinIcon3D } from '@/components/icons/CoinIcon3D';

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
  rewardAlreadyClaimed: boolean; // NEW: Track if video reward already credited coins
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
    rewardAlreadyClaimed,
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

  // Track timeouts for proper cleanup
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if navigation is in progress to prevent race conditions
  const isNavigatingRef = useRef(false);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  const handleNextQuestion = useCallback(async () => {
    // Guard against multiple rapid calls
    if (isAnimating || isNavigatingRef.current) {
      logger.log('[useGameNavigation] Blocked: already animating or navigating');
      return;
    }
    
    // Clear any existing timeouts
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    
    isNavigatingRef.current = true;
    setIsAnimating(true);
    setCanSwipe(false);
    setErrorBannerVisible(false);
    setQuestionVisible(false);
    resetRewardAnimation();
    
    // Safety timeout: Reset animation state after 2 seconds max (prevents stuck state)
    safetyTimeoutRef.current = setTimeout(() => {
      logger.log('[useGameNavigation] Safety timeout triggered - resetting animation state');
      setIsAnimating(false);
      setCanSwipe(true);
      setQuestionVisible(true);
      isNavigatingRef.current = false;
    }, 2000);
    
    if (currentQuestionIndex >= questions.length - 1) {
      // Game completed - show results toast and wait for swipe up to restart
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      setIsAnimating(false);
      setCanSwipe(true);
      setQuestionVisible(true);
      isNavigatingRef.current = false;
      
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
      
      // Show SPECTACULAR 3D results toast with celebration effects
      toast.success(
        <div className="flex flex-col gap-3 p-2 relative overflow-hidden">
          {/* Animated sparkle particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${15 + (i % 3) * 25}%`,
                  background: i % 2 === 0 ? '#fbbf24' : '#a78bfa',
                  boxShadow: `0 0 8px ${i % 2 === 0 ? '#fbbf24' : '#a78bfa'}`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>

          {/* Trophy header with glow */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <Trophy 
              className="w-8 h-8 text-yellow-400" 
              style={{ 
                filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.8))',
              }} 
            />
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Title with 3D gradient */}
          <div 
            className="text-center text-xl font-black tracking-wide"
            style={{
              background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 40%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 8px rgba(251, 191, 36, 0.5)',
            }}
          >
            {t('game_results.title')}
          </div>

          {/* Stats grid with 3D boxes */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Correct answers - Green 3D box */}
            <div 
              className="flex flex-col items-center p-2.5 rounded-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.15) 100%)',
                border: '2px solid rgba(34, 197, 94, 0.5)',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <div className="text-xl mb-0.5">✅</div>
              <div className="font-black text-green-400 text-lg" style={{ textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>
                {correctAnswers}/15
              </div>
              <div className="text-[9px] text-green-300/80 uppercase tracking-wider font-semibold">
                {t('game_results.correct')}
              </div>
            </div>

            {/* Coins earned - Gold 3D box */}
            <div 
              className="flex flex-col items-center p-2.5 rounded-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)',
                border: '2px solid rgba(251, 191, 36, 0.5)',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <CoinIcon3D size={24} className="mb-0.5" />
              <div className="font-black text-yellow-400 text-lg" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
                {coinsEarned}
              </div>
              <div className="text-[9px] text-yellow-300/80 uppercase tracking-wider font-semibold">
                {t('game_results.gold')}
              </div>
            </div>

            {/* Time - Blue 3D box */}
            <div 
              className="flex flex-col items-center p-2.5 rounded-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)',
                border: '2px solid rgba(59, 130, 246, 0.5)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <Zap className="w-6 h-6 text-blue-400 mb-0.5" style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }} />
              <div className="font-black text-blue-400 text-lg" style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                {avgResponseTime}s
              </div>
              <div className="text-[9px] text-blue-300/80 uppercase tracking-wider font-semibold">
                {t('game_results.time')}
              </div>
            </div>
          </div>

          {/* SPECTACULAR DOUBLE REWARD BUTTON */}
          {coinsEarned > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss();
                onDoubleRewardClick();
              }}
              className="relative w-full mt-1 p-3 rounded-xl overflow-hidden transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 70%, #fbbf24 100%)',
                backgroundSize: '200% 200%',
                animation: 'gradient-shift 3s ease infinite',
                boxShadow: `
                  0 0 25px rgba(251, 191, 36, 0.6),
                  0 6px 20px rgba(217, 119, 6, 0.5),
                  inset 0 2px 0 rgba(255, 255, 255, 0.4),
                  inset 0 -2px 0 rgba(0, 0, 0, 0.2)
                `,
                border: '2px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                  animation: 'shimmer-slide 2s ease-in-out infinite',
                }}
              />

              <div className="relative flex items-center justify-center gap-3">
                {/* Double coins visual */}
                <div className="flex -space-x-3">
                  <CoinIcon3D size={32} className="relative z-10" />
                  <CoinIcon3D size={32} className="relative z-0 opacity-90" />
                </div>

                {/* Text content */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-2xl font-black"
                      style={{ color: '#1a1a2e', textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}
                    >
                      {coinsEarned * 2}
                    </span>
                    <span 
                      className="text-sm font-black px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.25)', color: '#1a1a2e' }}
                    >
                      2×
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold" style={{ color: '#1a1a2e' }}>
                    <Film className="w-4 h-4" />
                    <span>{t('game_results.watch_to_double')}</span>
                  </div>
                </div>
              </div>

              {/* Pulsing glow border */}
              <div 
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  border: '2px solid rgba(255, 255, 255, 0.7)',
                  animation: 'pulse-glow 1.5s ease-in-out infinite',
                }}
              />
            </button>
          )}

          {/* Swipe instruction */}
          <div className="text-center text-xs font-bold text-white/80 animate-pulse mt-1">
            {t('game_results.swipe_for_new')}
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes gradient-shift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes shimmer-slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            @keyframes pulse-glow {
              0%, 100% { opacity: 0.7; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>,
        {
          duration: Infinity,
          position: 'top-center',
          style: {
            background: 'linear-gradient(180deg, rgba(88, 28, 135, 0.98) 0%, rgba(49, 10, 101, 0.98) 50%, rgba(30, 10, 60, 0.98) 100%)',
            color: 'white',
            border: '3px solid transparent',
            borderImage: 'linear-gradient(180deg, #fbbf24 0%, #a855f7 50%, #fbbf24 100%) 1',
            boxShadow: '0 0 40px rgba(251, 191, 36, 0.4), 0 15px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            maxWidth: '90vw',
            width: '360px',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }
        }
      );
      
      // Mark game as completed - DO NOT save to backend yet
      // Backend credit happens either:
      // 1. When user swipes for new game → finishGame() called in handleSwipeUp
      // 2. When user watches video for 2× → claim-video-reward credits 2× amount
      setGameCompleted(true);
      return;
    }
    
    // INSTANT transition to next question - reduced delays
    transitionTimeoutRef.current = setTimeout(() => {
      nextQuestion();
      resetTimer(10);
      setSelectedAnswer(null);
      setFirstAttempt(null);
      setSecondAttempt(null);
      resetQuestionHelpers();
      setQuestionStartTime(Date.now());
      
      // Clear safety timeout since we completed successfully
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      
      setQuestionVisible(true);
      setIsAnimating(false);
      setCanSwipe(true);
      isNavigatingRef.current = false;
      
      logger.log(`[useGameNavigation] Transition complete to question ${currentQuestionIndex + 2}`);
    }, 150); // Reduced from 400+100ms to 150ms
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
    t,
    lang,
    onDoubleRewardClick,
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
  }, [profile, currentQuestionIndex, refreshProfile, logHelpUsage, handleNextQuestion, t]);

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
    // If game completed, FIRST save results to backend THEN restart new game
    if (gameCompleted) {
      toast.dismiss(); // Dismiss game results toast before new game
      // CRITICAL: Only call finishGame if reward was NOT already claimed via video ad
      // Video ad reward (reward-complete) already credits 2× coins, so finishGame would double-credit
      if (!rewardAlreadyClaimed) {
        await finishGame(); // Credit coins to DB before restart
      }
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
    if (selectedAnswer && !isAnimating && !isNavigatingRef.current) {
      const currentQuestion = questions[currentQuestionIndex];
      const selectedAnswerObj = currentQuestion?.answers?.find(a => a.key === selectedAnswer);
      if (selectedAnswerObj?.correct) {
        await handleNextQuestion();
      }
    }
  }, [
    gameCompleted,
    rewardAlreadyClaimed,
    errorBannerVisible,
    profile,
    continueType,
    selectedAnswer,
    isAnimating,
    questions,
    currentQuestionIndex,
    finishGame,
    restartGameImmediately,
    setErrorBannerVisible,
    setRescueReason,
    setShowRescuePopup,
    handleContinueAfterMistake,
    handleNextQuestion,
  ]);

  const handleSwipeDown = useCallback(async () => {
    toast.dismiss(); // Dismiss game results toast before new game
    if (errorBannerVisible) {
      setErrorBannerVisible(false);
    }
    // If game completed and reward NOT already claimed via video ad, credit coins
    if (gameCompleted && !rewardAlreadyClaimed) {
      await finishGame();
    }
    await restartGameImmediately();
  }, [errorBannerVisible, gameCompleted, rewardAlreadyClaimed, setErrorBannerVisible, finishGame, restartGameImmediately]);

  return {
    handleNextQuestion,
    handleSkipQuestion,
    handleContinueAfterMistake,
    handleSwipeUp,
    handleSwipeDown,
  };
};
