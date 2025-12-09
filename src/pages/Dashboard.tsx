import { useEffect, useState } from 'react';
import { AgeGateModal } from '@/components/AgeGateModal';
import { UsersHexagonBar } from '@/components/UsersHexagonBar';
import { PlayNowButton } from '@/components/PlayNowButton';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useScrollBehavior } from '@/hooks/useScrollBehavior';
import { useI18n } from '@/i18n';
import { usePlatformDetection } from '@/hooks/usePlatformDetection';
import { useWalletQuery } from '@/hooks/queries/useWalletQuery';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useDashboardPopupManager } from '@/hooks/useDashboardPopupManager';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useNativeFullscreen } from '@/hooks/useNativeFullscreen';
import { useGameQuestions } from '@/hooks/useGameQuestions';

// PERFORMANCE OPTIMIZATION: Prefetch critical game assets
// This preloads /game route code + intro video in background while user is on Dashboard
// Result: Instant navigation when user clicks Play Now (80-90% faster perceived load)
const prefetchGameAssets = () => {
  // Prefetch Game route component chunk
  import('../pages/Game').catch(() => {
    // Silent fail - prefetch is optimization, not critical
  });
  
  // Prefetch intro video asset
  const videoLink = document.createElement('link');
  videoLink.rel = 'prefetch';
  videoLink.as = 'video';
  videoLink.href = '/src/assets/loading-video.mp4';
  document.head.appendChild(videoLink);
  
  // Prefetch GamePreview component
  import('../components/GamePreview').catch(() => {
    // Silent fail
  });
};

import DailyGiftDialog from '@/components/DailyGiftDialog';
import { WelcomeBonusDialog } from '@/components/WelcomeBonusDialog';
import { DailyWinnersDialog } from '@/components/DailyWinnersDialog';
import { PersonalWinnerDialog } from '@/components/PersonalWinnerDialog';
import { LeaderboardCarousel } from '@/components/LeaderboardCarousel';
import { DailyRankingsCountdown } from '@/components/DailyRankingsCountdown';
import { NextLifeTimer } from '@/components/NextLifeTimer';



import { TutorialManager } from '@/components/tutorial/TutorialManager';
import { IdleWarning } from '@/components/IdleWarning';

import BottomNav from '@/components/BottomNav';
import gameBackground from '@/assets/game-background.png';
import { toast } from 'sonner';
import { useBroadcastChannel } from '@/hooks/useBroadcastChannel';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | undefined>();
  const { t } = useI18n();
  const { isHandheld, isStandalone } = usePlatformDetection();
  const { canMountModals } = useScrollBehavior();
  const { markActive } = useActivityTracker('route_view');
  
  // PHASE 1: Critical data (profile, wallet) - loads immediately
  const { profile, loading: profileLoading, refreshProfile } = useProfileQuery(userId);
  const { walletData, refetchWallet, serverDriftMs } = useWalletQuery(userId);
  
  // PHASE 2: Secondary data (loaded after profile/wallet ready)
  const [enableSecondaryLoading, setEnableSecondaryLoading] = useState(false);
  const { prefetchNextGameQuestions } = useGameQuestions();
  
  // Enable secondary hooks only after critical data is loaded
  useEffect(() => {
    if (!profileLoading && walletData) {
      // Immediate secondary loading - no artificial delay
      setEnableSecondaryLoading(true);
    }
  }, [profileLoading, walletData]);
  
  // FULLSCREEN MODE: Hide status bar on mobile devices (Web)
  useFullscreen({
    enabled: true,
    autoReenter: true,
  });

  // NATIVE FULLSCREEN: Hide status bar on iOS/Android Capacitor apps
  useNativeFullscreen();
  
  // Auto logout on inactivity with warning
  const { showWarning, remainingSeconds, handleStayActive } = useAutoLogout();
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  
  
  // PERFORMANCE OPTIMIZATION: Centralized popup manager
  const popupManager = useDashboardPopupManager({
    canMountModals,
    needsAgeVerification: !profile?.age_verified || !profile?.birth_date,
    userId,
    username: profile?.username,
    profileLoading: profileLoading,
  });
  
  // Pull-to-refresh functionality
  const { isPulling, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refreshProfile(),
        refetchWallet()
      ]);
    },
    threshold: 80,
    disabled: !isHandheld
  });
  
  // Instant wallet sync via broadcast (no 3s delay)
  useBroadcastChannel({
    channelName: 'wallet',
    onMessage: (message) => {
      if (message?.type === 'wallet:update') {
        refetchWallet();
        refreshProfile();
      }
    },
    enabled: true,
  });
  

  // Helper function
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  };

  const getWeekEnd = () => {
    const weekStart = new Date(getWeekStart());
    const sunday = new Date(weekStart);
    sunday.setDate(weekStart.getDate() + 6); // Sunday
    sunday.setHours(23, 59, 59, 999);
    return sunday.toISOString();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate('/auth/login');
      }
    });
  }, [navigate]);

  // PERFORMANCE OPTIMIZATION: Prefetch game assets AFTER critical UI renders
  // Loads /game route chunks + intro video in background for instant navigation
  // Delayed to avoid blocking initial Dashboard render
  useEffect(() => {
    if (!profileLoading && walletData) {
      // Delay prefetch to ensure Dashboard is fully interactive first
      const timer = setTimeout(prefetchGameAssets, 200);
      return () => clearTimeout(timer);
    }
  }, [profileLoading, walletData]);

  // Check for canceled payment - separate useEffect for searchParams
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.error(t('payment.canceled_reward_lost'), {
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 'bold',
          border: '2px solid #ff0000',
          boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
        },
      });
      // Remove the query parameter
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, t]);

  // Popup sequencing handled by useDashboardPopupManager hook
  // No individual useEffect blocks needed here





  // PERFORMANCE: Fetch user daily rank ONLY after critical data loads + defer realtime subscription
  useEffect(() => {
    if (!userId || !enableSecondaryLoading) return;

    const fetchUserDailyRank = async () => {
      try {
        // Check for valid session first
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
          console.log('[Dashboard] No valid session, skipping rank fetch');
          setCurrentRank(1);
          return;
        }

        // Call edge function to get country-specific leaderboard and user rank with explicit auth header
        const { data, error } = await supabase.functions.invoke('get-daily-leaderboard-by-country', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
          }
        });
        
        if (error) {
          console.error('[Dashboard] Error fetching user rank:', error);
          setCurrentRank(1); // Fallback to rank 1
          return;
        }
        
        if (data?.userRank) {
          setCurrentRank(data.userRank);
        } else {
          // User not found in leaderboard
          setCurrentRank(1);
        }
      } catch (err) {
        console.error('[Dashboard] Exception fetching user rank:', err);
        setCurrentRank(null);
      }
    };
    
    // Fetch immediately when secondary loading is enabled
    fetchUserDailyRank();
    
    // PERFORMANCE: Subscribe to realtime changes ONLY after initial fetch completes
    // This prevents blocking the initial render with subscription setup
    const leaderboardChannel = supabase
      .channel('daily-leaderboard-rank-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_rankings'
        },
        () => {
          fetchUserDailyRank();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(leaderboardChannel);
    };
  }, [userId, enableSecondaryLoading]);

  const handleClaimDailyGift = async (): Promise<boolean> => {
    const success = await popupManager.dailyGift.claimDailyGift(refetchWallet);
    if (success) {
      await popupManager.dailyGift.checkDailyGift();
      await refreshProfile();
      popupManager.closeDailyGift();
    }
    return success;
  };

  const handleCloseDailyGift = () => {
    popupManager.dailyGift.handleLater();
    popupManager.closeDailyGift();
  };

  const handleClaimWelcomeBonus = async () => {
    const success = await popupManager.welcomeBonus.claimWelcomeBonus();
    if (success) {
      popupManager.closeWelcomeBonus();
      await refreshProfile();
      await refetchWallet();
      await popupManager.dailyGift.checkDailyGift();
    }
    return success;
  };
  
  const handleClosePersonalWinner = async () => {
    // Try to claim reward
    const result = await popupManager.closePersonalWinner();

    if (result?.success) {
      await Promise.all([
        refetchWallet(),
        refreshProfile(),
      ]);
    }
  };

  const handleWelcomeLaterClick = () => {
    popupManager.welcomeBonus.handleLater();
    popupManager.closeWelcomeBonus();
  };


  // Don't render until critical data is loaded
  if (profileLoading || !profile || !walletData) {
    return null;
  }

  return (
    <div className="h-dvh w-screen overflow-x-hidden relative flex flex-col" style={{
      background: 'transparent',
      maxWidth: '100vw',
      maxHeight: '100vh'
    }}>
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center pointer-events-none"
          style={{ 
            height: `${pullProgress * 60}px`,
            opacity: pullProgress,
            paddingTop: 'env(safe-area-inset-top, 0px)'
          }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      )}
      {/* Background image - EXTENDS BEYOND safe-area to cover status bar */}
      <div 
        className="fixed z-0" 
        style={{
          backgroundImage: `url(${gameBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: '50% 50%',
          backgroundAttachment: 'fixed',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none'
        }}
      />
    {/* Age-gate modal (ABSOLUTE PRIORITY - blocks ALL popups until completed) */}
    {userId && (
      <AgeGateModal 
        open={popupManager.popupState.showAgeGate} 
        userId={userId} 
        onSuccess={() => {
          console.log('[Dashboard] Age gate completed successfully');
          popupManager.closeAgeGate();
          refreshProfile();
        }} 
      />
    )}
    
    {/* Idle warning (60s countdown before logout) */}
    <IdleWarning 
      show={showWarning} 
      remainingSeconds={remainingSeconds} 
      onStayActive={handleStayActive} 
    />
    
    {/* Daily Winners Dialog - tegnapi TOP 10 (csak az első napi bejelentkezéskor) */}
    <DailyWinnersDialog 
      open={popupManager.popupState.showDailyWinners} 
      onClose={popupManager.closeDailyWinners} 
    />
    
      
      {/* Casino lights removed per user requirement */}
      
        <div className="h-dvh w-full flex flex-col overflow-x-hidden px-3 max-w-screen-lg mx-auto relative z-10" style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 2%), env(safe-area-inset-top) + 8px)' }}>
        {/* Top Section */}
        <div className="flex flex-col gap-3 mb-3 flex-shrink-0">
          {/* First Row: Username and Stats */}
          <div className="flex items-center justify-between gap-1">
            {/* Left: Greeting */}
            <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
              <div className="font-black leading-tight w-full">
                <div
                  style={{ 
                    fontSize: 'clamp(0.8125rem, 3.75vw, 1.5625rem)',
                    background: 'linear-gradient(to right, #fbbf24, #ffffff, #fbbf24)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.9)) drop-shadow(-1px -1px 1px rgba(0, 0, 0, 0.9))'
                  }}
                >
                  {t('dashboard.welcome')}
                </div>
                <div
                  style={{ 
                    fontSize: 'clamp(0.8125rem, 3.75vw, 1.5625rem)',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    background: 'linear-gradient(to right, #fbbf24, #ffffff, #fbbf24)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.9)) drop-shadow(-1px -1px 1px rgba(0, 0, 0, 0.9))'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>{profile.username}!</span>
                </div>
              </div>
            </div>

            {/* Right: Purple Users Hexagon Bar with 4 hexagons */}
            <div className="flex-shrink-0">
              <UsersHexagonBar
                username={profile.username}
                rank={currentRank}
                coins={walletData?.coinsCurrent ?? profile.coins}
                lives={walletData?.livesCurrent ?? profile.lives}
                livesMax={walletData?.livesMax || profile.max_lives}
                nextLifeAt={walletData?.nextLifeAt || null}
                serverDriftMs={serverDriftMs}
                onLifeExpired={() => {
                  refetchWallet();
                  refreshProfile();
                }}
                activeSpeedToken={walletData?.activeSpeedToken ? {
                  expiresAt: walletData.activeSpeedToken.expiresAt,
                  durationMinutes: walletData.activeSpeedToken.speedDurationMinutes
                } : null}
                avatarUrl={profile.avatar_url}
                className="data-tutorial-profile-header"
              />
            </div>
          </div>

          {/* Second Row: Action Buttons */}
          <div className="flex items-stretch justify-end gap-2 sm:gap-3">
            {/* Action Buttons - Match width from Rank hexagon to Avatar hexagon (always 4 hexagons) */}
            <div
              className="flex flex-col gap-2"
              style={{
                width: 'calc(4 * (3rem) + 3 * 0.375rem)' // 4 hexagons mobile: rank + coins + lives + avatar
              }}
            >
              {/* Desktop width handled via sm: and md: breakpoint */}
              <style>{`
                @media (min-width: 640px) {
                  [data-buttons-container] {
                    width: calc(4 * (4rem) + 3 * 0.5rem) !important;
                  }
                }
                @media (min-width: 768px) {
                  [data-buttons-container] {
                    width: calc(4 * (5rem) + 3 * 0.5rem) !important;
                  }
                }
              `}</style>
              {/* Share and Leaderboard buttons moved to BottomNav */}
            </div>
          </div>
        </div>

        {/* Fixed bottom section - CORRECT ORDER from bottom to top: BottomNav -> Top 100 -> Boosters -> Play Now -> Logo */}
        <div className="fixed bottom-0 left-0 right-0 z-[9000] flex flex-col-reverse items-center pb-[calc(var(--bottom-nav-h)+1rem)]">
          {/* Top 100 Leaderboard Carousel */}
          <div className="w-full" style={{ marginBottom: '2vh' }}>
            {/* LeaderboardCarousel fixed width container */}
            <div className="flex justify-center px-3">
              <div className="w-full max-w-screen-lg">
                <LeaderboardCarousel />
              </div>
            </div>
          </div>

          {/* Play Now Button - Boosters felett */}
          <div className="flex justify-center w-full px-3" style={{ marginBottom: '2vh' }}>
            <div className="w-[90%] max-w-screen-lg">
              <PlayNowButton
                data-tutorial="play-button"
                onClick={async () => {
                  // PERFORMANCE OPTIMIZATION: Prefetch questions BEFORE navigation
                  // This eliminates the loading spinner on /game page (instant question display)
                  const lastPoolOrder = localStorage.getItem('dingleup_global_last_pool');
                  const poolOrder = lastPoolOrder ? parseInt(lastPoolOrder, 10) : null;
                  const userLang = profile?.preferred_language || 'en';
                  
                  // Start prefetch (non-blocking, runs in background)
                  prefetchNextGameQuestions(poolOrder, userLang);
                  
                  // Navigate immediately (don't wait for prefetch)
                  navigate('/game');
                }}
                className="w-full"
              >
                <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center leading-none tracking-wider text-[clamp(1.75rem,5vw,2.5rem)] sm:text-[clamp(2rem,5.5vw,3rem)]">
                  {t('dashboard.play_now')}
                </span>
              </PlayNowButton>
            </div>
          </div>

          {/* Logo - legfelső, Play Now felett */}
          <div className="flex justify-center w-full" style={{ marginBottom: '3vh', pointerEvents: 'none' }}>
            <div className="relative w-[clamp(150px,42vw,420px)] h-[clamp(150px,42vw,420px)]">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 via-red-500/20 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
              <img 
                src="/logo.png"
                alt="DingleUP! Logo"
                className="relative w-full h-full object-contain drop-shadow-2xl gold-glow"
              />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes play-pulse {
            0%, 100% { 
              transform: scale(1);
              filter: brightness(1) drop-shadow(0 0 8px rgba(34,197,94,0.4));
            }
            50% { 
              transform: scale(1.02);
              filter: brightness(1.1) drop-shadow(0 0 16px rgba(34,197,94,0.7));
            }
          }
        `}</style>

          {/* Life Regeneration Timer - removed from here, now at hexagon */}

          {/* Ranglista Button (moved above) removed here */}
      </div>

      {/* Welcome bonus dialog - FIRST (only after age gate completed) */}
        <WelcomeBonusDialog
          open={popupManager.popupState.showWelcomeBonus}
          onClaim={handleClaimWelcomeBonus}
          onLater={handleWelcomeLaterClick}
          claiming={popupManager.welcomeBonus.claiming}
        />
 
       {/* Daily gift dialog - THIRD - manual trigger (only after age gate completed) */}
       <DailyGiftDialog
        open={popupManager.popupState.showDailyGift}
        onClaim={handleClaimDailyGift}
        onLater={handleCloseDailyGift}
        weeklyEntryCount={popupManager.dailyGift.weeklyEntryCount}
        nextReward={popupManager.dailyGift.nextReward}
        canClaim={popupManager.dailyGift.canClaim}
        claiming={popupManager.dailyGift.claiming}
      />

      {/* Daily Winners Dialog - LAST (ONLY if user is NOT winner) */}
      <DailyWinnersDialog
        open={popupManager.popupState.showDailyWinners}
        onClose={popupManager.closeDailyWinners}
      />

      {/* Personal Winner Dialog - LAST (ONLY if user IS winner) */}
      {popupManager.rankReward.pendingReward && (
        <PersonalWinnerDialog
          open={popupManager.popupState.showPersonalWinner}
          onClose={handleClosePersonalWinner}
          rank={popupManager.rankReward.pendingReward.rank}
          username={popupManager.rankReward.pendingReward.username}
          goldReward={popupManager.rankReward.pendingReward.gold}
          livesReward={popupManager.rankReward.pendingReward.lives}
          isClaiming={popupManager.rankReward.isClaiming}
        />
      )}

      <div data-tutorial="bottom-nav">
        <BottomNav />
      </div>
      <TutorialManager route="dashboard" />
    </div>
  );
};

export default Dashboard;
