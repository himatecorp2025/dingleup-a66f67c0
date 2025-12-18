import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import gameBackground from "@/assets/game-background.png";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGameProfile } from "@/hooks/useGameProfile";
import { useWallet } from "@/hooks/useWallet";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { supabase } from "@/integrations/supabase/client";
import { Question, Answer, CONTINUE_AFTER_WRONG_COST, TIMEOUT_CONTINUE_COST } from "@/types/game";
import { GameStateScreen } from "./GameStateScreen";
import { QuestionCard } from "./QuestionCard";
import { ExitGameDialog } from "./ExitGameDialog";
import { InGameRescuePopup } from "./InGameRescuePopup";
import { useBroadcastChannel } from "@/hooks/useBroadcastChannel";
import { GameLoadingScreen } from "./GameLoadingScreen";
import { useI18n } from "@/i18n";
import { useGameState } from "@/hooks/useGameState";
import { useGameHelpers } from "@/hooks/useGameHelpers";
import { useGameTimer } from "@/hooks/useGameTimer";
import { useGameRewards } from "./game/GameRewardSystem";
import { GameSwipeHandler } from "./game/GameSwipeHandler";
import { trackGameMilestone } from "@/lib/analytics";
import { useGameLifecycle } from "@/hooks/useGameLifecycle";
import { useGameHelperActions } from "@/hooks/useGameHelperActions";
import { useGameAnswers } from "@/hooks/useGameAnswers";
import { useGameNavigation } from "@/hooks/useGameNavigation";
import { useGameErrorHandling } from "@/hooks/useGameErrorHandling";
import { useGameAnimation } from "@/hooks/useGameAnimation";
import { GameErrorBanner } from "./game/GameErrorBanner";
import { GameQuestionContainer } from "./game/GameQuestionContainer";
import { FullscreenRewardVideoView } from "./FullscreenRewardVideoView";
import { VideoAdPrompt } from "./VideoAdPrompt";
import { useVideoAdFlow } from "@/hooks/useVideoAdFlow";
import { useRewardVideoStore } from "@/stores/rewardVideoStore";
import { logger } from "@/lib/logger";

type GameState = 'playing' | 'finished' | 'out-of-lives';

const GamePreview = memo(() => {
  const { t, isLoading: i18nLoading, lang } = useI18n();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { profile, loading: profileLoading, spendLife, refreshProfile } = useGameProfile(userId);
  const { walletData, refetchWallet } = useWallet(userId);
  const { triggerHaptic } = useHapticFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // OPTIMIZATION: Memoize profile values to prevent unnecessary re-renders
  const lives = profile?.lives ?? 0;
  const coins = walletData?.coinsCurrent ?? 0;
  
  const { broadcast } = useBroadcastChannel({ channelName: 'wallet', onMessage: () => {}, enabled: true });
  
  // Prefetch state for instant game restarts
  const [prefetchedQuestions, setPrefetchedQuestions] = useState<Question[] | null>(null);
  const prefetchTriggeredRef = useRef(false);
  
  // CRITICAL: Ref to always have latest coinsEarned for video ad callback
  const coinsEarnedRef = useRef(0);
  
  const {
    gameState,
    setGameState,
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    selectedAnswer,
    setSelectedAnswer,
    correctAnswers,
    incrementCorrectAnswers,
    responseTimes,
    answerResults,
    addResponseTime,
    recordAnswerResult,
    nextQuestion,
    resetGameState: resetGameStateHook
  } = useGameState();
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showVideoAdModal, setShowVideoAdModal] = useState(false);
  // Read video ad availability from reward video store (pre-loaded at login)
  const { isPreloaded, videoQueue } = useRewardVideoStore();
  const videoAdAvailable = isPreloaded && videoQueue.length > 0;
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [gameInstanceId] = useState(() => crypto.randomUUID());

  // Track if user just came back from watching video ad
  const [justFinishedVideoAd, setJustFinishedVideoAd] = useState(false);

  // Video ad flow for doubling rewards
  const videoAdFlow = useVideoAdFlow({
    userId,
    // CRITICAL: onRewardStarted is called SYNCHRONOUSLY when video watching begins
    // This ensures justFinishedVideoAd is true BEFORE any finishGame() could be called
    onRewardStarted: () => {
      setJustFinishedVideoAd(true);
    },
    onRewardClaimed: async (coins) => {
      await refetchWallet();
      await refreshProfile();
      // Show toast telling user to swipe for new game
      toast.success(
        lang === 'hu' 
          ? 'Új játék indításához görgess tovább!' 
          : 'Swipe to start a new game!',
        { position: 'top-center', duration: 3000 }
      );
    },
  });

  const {
    help5050UsageCount,
    setHelp5050UsageCount,
    help2xAnswerUsageCount,
    setHelp2xAnswerUsageCount,
    helpAudienceUsageCount,
    setHelpAudienceUsageCount,
    isHelp5050ActiveThisQuestion,
    setIsHelp5050ActiveThisQuestion,
    isDoubleAnswerActiveThisQuestion,
    setIsDoubleAnswerActiveThisQuestion,
    isAudienceActiveThisQuestion,
    setIsAudienceActiveThisQuestion,
    usedQuestionSwap,
    setUsedQuestionSwap,
    removedAnswer,
    setRemovedAnswer,
    audienceVotes,
    setAudienceVotes,
    logHelpUsage,
    resetQuestionHelpers
  } = useGameHelpers(userId, currentQuestionIndex);
  
  const [firstAttempt, setFirstAttempt] = useState<string | null>(null);
  const [secondAttempt, setSecondAttempt] = useState<string | null>(null);


  const {
    isAnimating,
    setIsAnimating,
    canSwipe,
    setCanSwipe,
    translateY,
    setTranslateY,
    touchStartY,
    setTouchStartY,
    questionVisible,
    setQuestionVisible,
    showExitDialog,
    setShowExitDialog,
    swipeThreshold,
  } = useGameAnimation();

  const {
    continueType,
    setContinueType,
    errorBannerVisible,
    setErrorBannerVisible,
    errorBannerMessage,
    setErrorBannerMessage,
    showRescuePopup,
    setShowRescuePopup,
    rescueReason,
    setRescueReason,
    handleTimeout,
  } = useGameErrorHandling({
    questionStartTime,
    addResponseTime,
    setSelectedAnswer,
    triggerHaptic,
  });
  
  const {
    coinsEarned,
    coinRewardAmount,
    coinRewardTrigger,
    creditStartReward,
    creditCorrectAnswer,
    resetRewardAnimation,
    setCoinsEarned
  } = useGameRewards({
    userId,
    gameInstanceId,
    currentQuestionIndex,
    coinsEarned: 0,
    broadcast
  });

  // Keep ref in sync with latest coinsEarned for stable callback access
  coinsEarnedRef.current = coinsEarned;
  const {
    showLoadingVideo,
    videoEnded,
    isGameReady,
    hasAutoStarted,
    setHasAutoStarted,
    isStarting: isStartingGame,
    startGame,
    handleVideoEnd,
    restartGameImmediately,
    finishGame,
    resetGameState,
  } = useGameLifecycle({
    userId,
    profile,
    spendLife,
    refreshProfile,
    refetchWallet,
    broadcast,
    creditStartReward,
    setQuestions,
    resetGameStateHook,
    resetTimer: (time: number) => resetTimer(time),
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
    onPrefetchComplete: setPrefetchedQuestions,
  });

  const { timeLeft, resetTimer } = useGameTimer({
    initialTime: 10,
    onTimeout: handleTimeout,
    enabled: gameState === 'playing' && isGameReady && !selectedAnswer && !isAnimating
  });

  const {
    handleAnswer,
    handleCorrectAnswer,
    handleWrongAnswer,
  } = useGameAnswers({
    selectedAnswer,
    isAnimating,
    questionStartTime,
    questions,
    currentQuestionIndex,
    isDoubleAnswerActiveThisQuestion,
    firstAttempt,
    setFirstAttempt,
    setSecondAttempt,
    setSelectedAnswer,
    addResponseTime,
    incrementCorrectAnswers,
    recordAnswerResult,
    creditCorrectAnswer,
    setContinueType,
    setErrorBannerVisible,
    setErrorBannerMessage,
    
  });

  const {
    handleNextQuestion,
    handleContinueAfterMistake,
    handleSwipeUp,
    handleSwipeDown,
  } = useGameNavigation({
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
    rewardAlreadyClaimed: justFinishedVideoAd, // If video reward already claimed, don't credit again
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
    onDoubleRewardClick: () => {
      // CRITICAL: Use ref to get latest coinsEarned value (avoids stale closure)
      videoAdFlow.startGameEndDouble(coinsEarnedRef.current);
    },
  });

  const {
    useHelp5050,
    useHelp2xAnswer,
    useHelpAudience,
  } = useGameHelperActions({
    profile,
    refreshProfile,
    logHelpUsage,
    questions,
    currentQuestionIndex,
    selectedAnswer,
    help5050UsageCount,
    help2xAnswerUsageCount,
    helpAudienceUsageCount,
    isHelp5050ActiveThisQuestion,
    isDoubleAnswerActiveThisQuestion,
    isAudienceActiveThisQuestion,
    setRemovedAnswer,
    setIsHelp5050ActiveThisQuestion,
    setHelp5050UsageCount,
    setIsDoubleAnswerActiveThisQuestion,
    setHelp2xAnswerUsageCount,
    setFirstAttempt,
    setSecondAttempt,
    setAudienceVotes,
    setIsAudienceActiveThisQuestion,
    setHelpAudienceUsageCount,
    ALL_QUESTIONS: [],
  });
  
  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate('/auth/login');
      }
    });
  }, [navigate]);

  // Auto-start game when profile is ready - ONCE only
  // CRITICAL: Don't include startGame in dependencies to prevent re-triggering
  useEffect(() => {
    if (profile && !profileLoading && questions.length === 0 && gameState === 'playing' && !hasAutoStarted && !isStartingGame) {
      setHasAutoStarted(true);
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profileLoading, hasAutoStarted, isStartingGame, questions.length, gameState]);

  // Track game funnel milestones + PREFETCH next game at question 10
  useEffect(() => {
    // CRITICAL: Reset prefetch trigger on game restart
    if (currentQuestionIndex === 0 && prefetchTriggeredRef.current) {
      prefetchTriggeredRef.current = false;
    }

    const trackMilestone = async () => {
      if (!userId || !isGameReady || currentQuestionIndex < 0) return;

      // Debounce: track only specific milestones to prevent duplicate tracking
      if (currentQuestionIndex === 4) {
        try {
          await trackGameMilestone(userId, 'question_5_reached', {
            category: 'mixed',
            question_index: 5,
            correct_answers: correctAnswers,
          });
        } catch (error) {
          console.error('[GamePreview] Error tracking milestone 5:', error);
        }
      } else if (currentQuestionIndex === 9) {
        try {
          await trackGameMilestone(userId, 'question_10_reached', {
            category: 'mixed',
            question_index: 10,
            correct_answers: correctAnswers,
          });
          
          // PREFETCH: Start loading next game questions in background at question 10
          // OPTIMIZED: Use direct edge function for faster prefetch (no translations needed here)
          if (!prefetchTriggeredRef.current) {
            prefetchTriggeredRef.current = true;
            logger.log('[GamePreview] 🚀 Triggering prefetch for next game (background)');
            
            // Non-blocking prefetch in background
            (async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                
                const { data, error } = await supabase.functions.invoke('start-game-session', {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                  body: { lang }
                });
                
                if (error || !data?.questions) {
                  logger.warn('[GamePreview] Prefetch failed:', error);
                  return;
                }
                
                // OPTIMIZATION: Questions already translated by backend, no need for extra DB query
                setPrefetchedQuestions(data.questions);
                logger.log('[GamePreview] ✓ Prefetch complete - next game ready (instant restart)');
              } catch (error) {
                logger.error('[GamePreview] Prefetch exception:', error);
              }
            })();
          }
        } catch (error) {
          console.error('[GamePreview] Error tracking milestone 10:', error);
        }
      }
    };

    trackMilestone();
  }, [currentQuestionIndex, userId, isGameReady, correctAnswers, lang]);

  // Video ad availability is pre-loaded at login via videoAdStore
  // No need to check here - already available from global state

  // REMOVED: Language change detection during active game
  // Language is now locked when game starts - questions are loaded in the user's selected language at game start
  // Changing language mid-game is not supported (would disrupt gameplay and cause inconsistencies)
  // Users must restart the game if they want questions in a different language

  // Background detection - exit game if app goes to background (only after video ended)
  // IMPORTANT: Do NOT trigger when video ad modal is open (iframe steals focus)
  // IMPORTANT: Do NOT trigger when loading video ad (async operation in progress)
  useEffect(() => {
    // Do not activate background detection while the intro/loading video is playing
    // OR when video ad modal is open (iframe causes blur events)
    // OR when game is completed (user viewing results)
    if (gameState !== 'playing' || !videoEnded || gameCompleted) return;

    const handleVisibilityChange = () => {
      // Skip if video ad modal is showing OR loading (iframe causes visibility issues)
      if (videoAdFlow.showVideo || videoAdFlow.showPrompt || videoAdFlow.isLoading) return;
      
      if (document.hidden) {
        toast.error(t('game.interrupted'));
        navigate('/dashboard');
      }
    };

    const handleBlur = () => {
      // Skip if video ad modal is showing OR loading (iframe steals focus)
      if (videoAdFlow.showVideo || videoAdFlow.showPrompt || videoAdFlow.isLoading) return;
      
      toast.error(t('game.interrupted'));
      navigate('/dashboard');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, videoEnded, gameCompleted, videoAdFlow.showVideo, videoAdFlow.showPrompt, videoAdFlow.isLoading]); // t and navigate are stable refs

  // Check for in-game payment success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const sessionId = params.get('session_id');
    const timeoutIdRef = { current: null as NodeJS.Timeout | null };

    const verifyInGamePayment = async () => {
      if (paymentStatus === 'success' && sessionId && userId) {
        try {
          const { data: { session: paymentSession } } = await supabase.auth.getSession();
          if (!paymentSession) return;
          
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId },
            headers: { Authorization: `Bearer ${paymentSession.access_token}` }
          });

          if (error) throw error;

          if (data.success) {
            // Nincs toast - a felhasználó látja az eredményt
            await refreshProfile();
            
            // Continue game automatically - INSTANT
            if (gameState === 'playing') {
              timeoutIdRef.current = setTimeout(() => {
                handleNextQuestion();
              }, 300);
            }
          }
        } catch (error: any) {
          console.error('[GamePreview] Error verifying in-game payment:', error);
          // Nincs toast - a felhasználó látja az eredményt
        }
        
        // Clean URL
        window.history.replaceState({}, '', '/game');
      } else if (paymentStatus === 'cancelled') {
        // Nincs toast - a felhasználó tudja, hogy megszakította
        window.history.replaceState({}, '', '/game');
      }
    };

    if (userId) {
      verifyInGamePayment();
    }

    // CRITICAL: Cleanup timeout on unmount to prevent memory leaks
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [userId, gameState, refreshProfile, handleNextQuestion]);

  // Video ad availability is pre-loaded at login - no need to check here

  const handleRejectContinue = () => {
    finishGame();
  };

  if (profileLoading || i18nLoading || !userId || !profile) {
    return (
      <div className="min-h-dvh min-h-svh flex items-center justify-center relative">
        <div className="relative z-10 text-white">{t('game.loading')}</div>
      </div>
    );
  }


  if (gameState === 'out-of-lives') {
    return (
      <GameStateScreen 
        type="out-of-lives"
        onContinue={() => {
          finishGame();
        }}
        onSkip={() => {
          navigate('/');
        }}
      />
    );
  }

  // Show loading video IMMEDIATELY when game start begins (even before backend completes)
  // Keep video visible until BOTH video ends AND questions are ready
  // For seamless restart: never show any loading screen
  if (showLoadingVideo && (isStartingGame || !videoEnded)) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black z-[9999]">
        <GameLoadingScreen onVideoEnd={handleVideoEnd} />
      </div>
    );
  }

  if (gameState === 'playing') {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      return (
        <>
          <div 
            ref={containerRef}
            className="fixed inset-0 w-full h-full overflow-hidden"
            style={{
              backgroundImage: `url(${gameBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }}
          />
          {/* Video Ad Modal - must be rendered here too */}
          {videoAdFlow.showPrompt && (
            <VideoAdPrompt
              isOpen={true}
              onClose={videoAdFlow.declinePrompt}
              onAccept={videoAdFlow.acceptPrompt}
              onDecline={videoAdFlow.declinePrompt}
              context="game_end"
              rewardText={`${coinsEarned} → ${coinsEarned * 2} ${lang === 'hu' ? 'arany' : 'gold'}`}
            />
          )}
          {videoAdFlow.showVideo && videoAdFlow.videos.length > 0 && (
            <FullscreenRewardVideoView
              videos={videoAdFlow.videos.map(v => ({
                id: v.id,
                embedUrl: v.embedUrl,
                platform: v.platform as 'tiktok' | 'youtube' | 'instagram' | 'facebook',
                durationSeconds: 15,
                creatorName: v.creatorName,
                videoUrl: v.videoUrl,
              }))}
              durationSecondsPerVideo={15}
              onCompleted={(watchedIds) => videoAdFlow.onVideoComplete()}
              onClose={videoAdFlow.cancelVideo}
              context="game_end"
              rewardAmount={coinsEarned}
            />
          )}
        </>
      );
    }
    
    return (
      <>
        <GameSwipeHandler
          enabled={gameState === 'playing' && canSwipe}
          isAnimating={isAnimating}
          showExitDialog={showExitDialog}
          swipeThreshold={swipeThreshold}
          translateY={translateY}
          onTranslateYChange={setTranslateY}
          onTouchStartYChange={setTouchStartY}
          onSwipeUp={handleSwipeUp}
          onSwipeDown={handleSwipeDown}
        >
          {/* Scrollable question container - background is now in parent Game.tsx as fixed layer */}
          <div 
            ref={containerRef}
            className="fixed inset-0 z-10 overflow-hidden pb-16"
          >
            <GameErrorBanner
              visible={errorBannerVisible}
              message={errorBannerMessage}
              continueType={continueType}
            />
            
            <GameQuestionContainer
              isAnimating={isAnimating}
              translateY={translateY}
              questionVisible={questionVisible}
            >
              {/* Question Card with 3D effects */}
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                timeLeft={timeLeft}
                selectedAnswer={selectedAnswer}
                firstAttempt={firstAttempt}
                secondAttempt={secondAttempt}
                removedAnswer={removedAnswer}
                audienceVotes={audienceVotes}
                help5050UsageCount={help5050UsageCount}
                help2xAnswerUsageCount={help2xAnswerUsageCount}
                helpAudienceUsageCount={helpAudienceUsageCount}
                isHelp5050ActiveThisQuestion={isHelp5050ActiveThisQuestion}
                isDoubleAnswerActiveThisQuestion={isDoubleAnswerActiveThisQuestion}
                isAudienceActiveThisQuestion={isAudienceActiveThisQuestion}
                lives={lives}
                maxLives={profile?.max_lives || 15}
                coins={coins}
                coinRewardAmount={coinRewardAmount}
                coinRewardTrigger={coinRewardTrigger}
                onAnswerSelect={(answerId: string) => handleAnswer(answerId)}
                onUseHelp5050={useHelp5050}
                onUseHelp2xAnswer={useHelp2xAnswer}
                onUseHelpAudience={useHelpAudience}
                onExit={() => setShowExitDialog(true)}
              />
            </GameQuestionContainer>
            
            {/* Exit Game Dialog */}
            <ExitGameDialog
              open={showExitDialog}
              onOpenChange={setShowExitDialog}
              onConfirmExit={() => {
                toast.dismiss(); // Dismiss any toasts instantly
                setShowExitDialog(false);
                // INSTANT navigation - don't wait for async operations
                navigate('/dashboard');
                // Only credit coins if game was completed AND reward wasn't already claimed via video
                // If game incomplete, coins are lost (frontend-only, no DB credit)
                if (gameCompleted && !justFinishedVideoAd) {
                  finishGame().catch(console.error);
                }
              }}
              gameCompleted={gameCompleted}
            />
            
            {/* In-Game Rescue Popup */}
            <InGameRescuePopup
              isOpen={showRescuePopup}
              onClose={() => {
                setShowRescuePopup(false);
                resetGameState();
              }}
              triggerReason={rescueReason}
              currentLives={walletData?.livesCurrent || 0}
              currentGold={profile?.coins || 0}
              onStateRefresh={async () => {
                await Promise.all([
                  refreshProfile(),
                  refetchWallet()
                ]);
                setShowRescuePopup(false);
                setErrorBannerVisible(false);
                await handleNextQuestion();
              }}
              onGameEnd={() => {
                setShowRescuePopup(false);
                resetGameState();
              }}
            />

          </div>
        </GameSwipeHandler>

        {/* Video Ad Prompt */}
        {videoAdFlow.showPrompt && (
          <VideoAdPrompt
            isOpen={true}
            onClose={videoAdFlow.declinePrompt}
            onAccept={videoAdFlow.acceptPrompt}
            onDecline={videoAdFlow.declinePrompt}
            context="game_end"
            rewardText={`${coinsEarned} → ${coinsEarned * 2} ${lang === 'hu' ? 'arany' : 'gold'}`}
          />
        )}

        {/* Video Ad Modal for doubling reward */}
        {videoAdFlow.showVideo && videoAdFlow.videos.length > 0 && (
          <FullscreenRewardVideoView
            videos={videoAdFlow.videos.map(v => ({
              id: v.id,
              embedUrl: v.embedUrl,
              platform: v.platform as 'tiktok' | 'youtube' | 'instagram' | 'facebook',
              durationSeconds: 15,
              creatorName: v.creatorName,
              videoUrl: v.videoUrl,
            }))}
            durationSecondsPerVideo={15}
            onCompleted={(watchedIds) => videoAdFlow.onVideoComplete()}
            onClose={videoAdFlow.cancelVideo}
            context="game_end"
            rewardAmount={coinsEarned}
          />
        )}
      </>
    );
  }

  // Video Ad Modal - rendered outside gameState check so it works after game ends
  // This is a global overlay that should be visible regardless of game state
  return (
    <>
      {/* Video Ad Prompt (fallback if auto-accept doesn't trigger) */}
      {videoAdFlow.showPrompt && (
        <VideoAdPrompt
          isOpen={true}
          onClose={videoAdFlow.declinePrompt}
          onAccept={videoAdFlow.acceptPrompt}
          onDecline={videoAdFlow.declinePrompt}
          context="game_end"
          rewardText={`${coinsEarned} → ${coinsEarned * 2} ${lang === 'hu' ? 'arany' : 'gold'}`}
        />
      )}

      {/* Video Ad Modal for doubling reward */}
      {videoAdFlow.showVideo && videoAdFlow.videos.length > 0 && (
        <FullscreenRewardVideoView
          videos={videoAdFlow.videos.map(v => ({
            id: v.id,
            embedUrl: v.embedUrl,
            platform: v.platform as 'tiktok' | 'youtube' | 'instagram' | 'facebook',
            durationSeconds: 15,
            creatorName: v.creatorName,
            videoUrl: v.videoUrl,
          }))}
          durationSecondsPerVideo={15}
          onCompleted={(watchedIds) => videoAdFlow.onVideoComplete()}
          onClose={videoAdFlow.cancelVideo}
          context="game_end"
          rewardAmount={coinsEarned}
        />
      )}
    </>
  );
});

GamePreview.displayName = 'GamePreview';

export default GamePreview;
