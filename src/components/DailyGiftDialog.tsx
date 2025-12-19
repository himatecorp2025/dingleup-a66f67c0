import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { usePlatformDetection } from '@/hooks/usePlatformDetection';
import { trackBonusEvent, trackFeatureUsage } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import HexShieldFrame from './frames/HexShieldFrame';
import { useI18n } from '@/i18n';
import { FullscreenRewardVideoView } from './FullscreenRewardVideoView';
import { useRewardVideoStore, RewardVideo } from '@/stores/rewardVideoStore';
import { toast } from 'sonner';

interface DailyGiftDialogProps {
  open: boolean;
  onClaim: (claimType: 'base' | 'ad') => Promise<boolean>;
  onLater: () => void;
  weeklyEntryCount: number;
  nextReward: number;
  baseReward?: number;
  multiplier?: number;
  yesterdayRank?: number | null;
  isTop10Yesterday?: boolean;
  canClaim: boolean;
  claiming: boolean;
  isPremium?: boolean;
}

const DAILY_REWARDS = [50, 75, 110, 160, 220, 300, 500];

// Calculate correct multiplied rewards based on TOP10 status
const getRewardAmounts = (baseReward: number, isTop10: boolean) => {
  // Not TOP10: base = 1x, ad = 2x
  // TOP10: base = 3x, ad = 5x
  const baseMultiplier = isTop10 ? 3 : 1;
  const adMultiplier = isTop10 ? 5 : 2;
  return {
    baseAmount: baseReward * baseMultiplier,
    adAmount: baseReward * adMultiplier,
    baseMultiplier,
    adMultiplier
  };
};

const DailyGiftDialog = ({ 
  open, 
  onClaim,
  onLater,
  weeklyEntryCount, 
  nextReward, 
  baseReward = nextReward,
  multiplier = 1,
  yesterdayRank = null,
  isTop10Yesterday = false,
  canClaim,
  claiming,
  isPremium = false 
}: DailyGiftDialogProps) => {
  const { t, lang } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const isHandheld = usePlatformDetection();
  const [contentVisible, setContentVisible] = useState(false);
  const flagRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [burstActive, setBurstActive] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [claimed, setClaimed] = useState(false);
  
  // Button press states for visual feedback
  const [normalPressed, setNormalPressed] = useState(false);
  const [videoPressed, setVideoPressed] = useState(false);
  
  // NEW: Video reward system using Zustand store
  const [showVideoView, setShowVideoView] = useState(false);
  const [activeVideos, setActiveVideos] = useState<RewardVideo[]>([]);
  const rewardStore = useRewardVideoStore();
  
  // Check if videos are available (preloaded at login)
  const videoAdAvailable = rewardStore.isPreloaded && rewardStore.videoQueue.length > 0;

  useEffect(() => {
    if (open) {
      // INSTANT visibility - no delay
      setContentVisible(true);
      return () => {
        setContentVisible(false);
        setBurstActive(false);
        setClaimed(false);
      };
    } else {
      setContentVisible(false);
      setBurstActive(false);
      setClaimed(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !contentVisible) return;
    
    // INSTANT burst animation trigger - no delay
    requestAnimationFrame(() => {
      const el = flagRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        setOrigin({ x, y });
        setBurstKey((k) => k + 1);
        setBurstActive(true);
      }
    });
  }, [contentVisible, open]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open && userId) {
      trackBonusEvent(userId, 'daily_shown', 'daily', {
        coins_amount: nextReward,
        streak_day: weeklyEntryCount + 1
      });
    }
  }, [open, userId, nextReward, weeklyEntryCount]);

  // Calculate correct reward amounts based on TOP10 status
  const rewardAmounts = getRewardAmounts(baseReward, isTop10Yesterday);

  const handleClaim = async () => {
    if (!userId) return;
    
    // Track feature usage - claim attempt
    await trackFeatureUsage(userId, 'user_action', 'daily_gift', 'claim_attempt', {
      coins_amount: rewardAmounts.baseAmount,
      streak_day: weeklyEntryCount + 1,
      claim_type: 'base'
    });
    
    // Track claim attempt
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'reward_attempt', {
        event_category: 'daily_gift',
        event_label: 'click_claim',
        value: rewardAmounts.baseAmount
      });
    }
    
    // Execute the actual claim with claimType='base'
    const success = await onClaim('base');
    
    if (success) {
      // Track feature usage - successful claim
      await trackFeatureUsage(userId, 'user_action', 'daily_gift', 'claim_success', {
        coins_amount: rewardAmounts.baseAmount,
        streak_day: weeklyEntryCount + 1,
        claim_type: 'base'
      });
      
      // Track successful claim
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'reward_granted', {
          event_category: 'daily_gift',
          event_label: `day_${weeklyEntryCount + 1}`,
          value: rewardAmounts.baseAmount
        });
      }
      
      // CRITICAL: Show success state on button
      setClaimed(true);
      
      // Auto-close after 600ms - FAST response
      setTimeout(() => {
        onLater();
      }, 600);
    }
  };

  // PERFORMANCE CRITICAL: Show video INSTANTLY using preloaded queue
  // NO WAITING for backend calls - use videos already in memory
  const handleVideoAccept = () => {
    if (!userId) return;
    
    // INSTANT: Get videos from preloaded queue synchronously
    const requiredVideos = 1;
    const videosFromQueue = rewardStore.getVideosFromQueue(requiredVideos);
    
    // If no videos in queue, don't block - show error
    if (videosFromQueue.length === 0) {
      toast.error(lang === 'hu' ? 'Nincs elérhető videó' : 'No video available', {
        position: 'top-center'
      });
      return;
    }
    
    // INSTANT: Show video view IMMEDIATELY - no async waiting!
    setActiveVideos(videosFromQueue);
    setShowVideoView(true);
    
    // Start session in background (non-blocking) - just for tracking
    rewardStore.startRewardSession(userId, 'daily_gift', nextReward);
  };

  // CRITICAL: Video completion - reward is credited ONLY when user closes the modal (X button)
  const handleVideoComplete = async (watchedVideoIds: string[]) => {
    // First claim the ad reward via backend
    const claimSuccess = await onClaim('ad');
    
    // Complete the reward session for tracking
    await rewardStore.completeRewardSession(watchedVideoIds);
    
    if (claimSuccess) {
      toast.success(
        <div className="flex flex-col items-center gap-2 text-center max-w-[75vw]">
          <div className="text-2xl">🎉</div>
          <div className="font-bold text-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
            {lang === 'hu' ? 'Gratulálunk!' : 'Congratulations!'}
          </div>
          <div className="text-sm text-foreground/90">
            {lang === 'hu' 
              ? (isTop10Yesterday ? 'TOP10 + reklám bónusz jóváíródott!' : 'A reklám jutalmad jóváíródott!')
              : (isTop10Yesterday ? 'TOP10 + ad bonus credited!' : 'Your ad reward has been credited!')}
          </div>
          <div className="flex items-center gap-2 mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 shadow-lg shadow-yellow-500/20">
            <span className="font-bold text-yellow-400 text-lg">+{rewardAmounts.adAmount} 🪙</span>
          </div>
        </div>,
        { position: 'top-center', duration: 2000 }
      );
    }
    
    // Close everything FAST - 0.5 seconds after video completion
    setShowVideoView(false);
    setActiveVideos([]);
    setTimeout(() => {
      onLater();
    }, 500);
  };

  const handleVideoClose = () => {
    // User cancelled before completion - no reward
    rewardStore.cancelSession();
    setShowVideoView(false);
    setActiveVideos([]);
  };

  // If video is showing, only render the fullscreen video view (not the gift dialog)
  if (showVideoView && activeVideos.length > 0) {
    return (
      <FullscreenRewardVideoView
        videos={activeVideos}
        durationSecondsPerVideo={15}
        onCompleted={(watchedIds) => { handleVideoComplete(watchedIds); }}
        onClose={handleVideoClose}
        context="daily_gift"
        rewardAmount={nextReward}
      />
    );
  }

  if (!open) return null;
  
  return (
    <>
    <Dialog open={open} onOpenChange={onLater}>
      <DialogContent 
        className="overflow-hidden p-0 border-0 bg-transparent w-screen h-screen max-w-none rounded-none [&>button[data-dialog-close]]:hidden z-[99999]"
        style={{
          margin: 0,
          maxHeight: '100dvh',
          minHeight: '100dvh',
          borderRadius: 0,
          zIndex: 99999
        }}
      >
        {/* Tökéletesen középre igazító, teljes képernyős konténer (fix + flex) */}
        <div 
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{ 
            minHeight: '100dvh', 
            minWidth: '100vw'
          }}
        >
          <DialogTitle className="sr-only">Daily Gift</DialogTitle>
          <DialogDescription className="sr-only">{t('daily_gift.show_reward_description')}</DialogDescription>

          {/* Close X button - PONTOSAN ugyanaz, mint Welcome Bonus */}
          <button
            onClick={onLater}
            disabled={claiming}
            className={`absolute top-[8vh] right-[4vw] text-white/70 hover:text-white font-bold z-30 w-[12vw] h-[12vw] max-w-[60px] max-h-[60px] flex items-center justify-center bg-black/30 hover:bg-black/50 rounded-full transition-all transform duration-500 ease-out focus:outline-none focus-visible:ring-0 ${contentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
            style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)', transitionDelay: '0ms' }}
            aria-label={t('daily_gift.close_aria')}
          >
            ×
          </button>

          {/* BONUS MODAL WRAPPER - Fix arányú, skálázódó layout */}
          <div 
            className="relative z-10"
            style={{ 
              width: 'min(420px, 90vw)',
              aspectRatio: '9 / 16',
              transform: contentVisible ? 'scale(1)' : 'scale(0)',
              opacity: contentVisible ? 1 : 0,
              transition: 'transform 1.125s cubic-bezier(0.34, 1.56, 0.64, 1) 0ms, opacity 1.125s ease-in-out 0ms',
              transformOrigin: 'center center',
              willChange: contentVisible ? 'transform, opacity' : 'auto'
            }}
          >
            {/* BONUS MODAL CARD - Teljes belső tartalom */}
            <div 
              className="absolute inset-0"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HexShieldFrame showShine={true}>
              {/* Top Hex Badge - "DAILY GIFT" - Gold if TOP10, otherwise Blue */}
              <div 
                ref={badgeRef}
                className="relative -mt-12 mb-3 mx-auto z-20" 
                style={{ width: '78%' }}
              >
                <div className="absolute inset-0 translate-y-1 translate-x-1"
                     style={{
                       clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                       background: 'rgba(0,0,0,0.4)',
                       filter: 'blur(4px)',
                       zIndex: -1
                     }} />
                
                <div className="absolute inset-0"
                     style={{
                       clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                       background: 'linear-gradient(135deg, hsl(var(--dup-gold-700)), hsl(var(--dup-gold-600)) 50%, hsl(var(--dup-gold-800)))',
                       boxShadow: 'inset 0 0 0 2px hsl(var(--dup-gold-900)), 0 3px 8px rgba(0,0,0,0.175)'
                     }} />
                
                <div className="absolute inset-[3px]"
                     style={{
                       clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                       background: 'linear-gradient(180deg, hsl(var(--dup-gold-400)), hsl(var(--dup-gold-500)) 40%, hsl(var(--dup-gold-700)))',
                       boxShadow: 'inset 0 1px 0 hsl(var(--dup-gold-300))'
                     }} />
                
                <div className="relative px-[5vw] py-[1.2vh]"
                     style={{
                       clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                     }}>
                  {/* Inner background - GOLD if TOP10, RED otherwise */}
                  <div className="absolute inset-[6px]"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                         background: isTop10Yesterday 
                           ? 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(45 100% 65%) 0%, hsl(45 90% 50%) 30%, hsl(45 85% 40%) 60%, hsl(45 80% 30%) 100%)'
                           : 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(0 85% 60%) 0%, hsl(0 80% 50%) 30%, hsl(0 75% 40%) 60%, hsl(0 70% 32%) 100%)',
                         boxShadow: 'inset 0 6px 12px rgba(255,255,255,0.125), inset 0 -6px 12px rgba(0,0,0,0.2)'
                       }} />
                  
                  <div className="absolute inset-[6px] pointer-events-none"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                         background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 12px, transparent 12px, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 24px)',
                         opacity: 0.7
                       }} />
                  
                  <div className="absolute inset-[6px] pointer-events-none" style={{
                    clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                    background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5), transparent 60%)'
                  }} />
                  
                  <h1 ref={flagRef} className="relative z-10 font-black text-foreground text-center drop-shadow-[0_0_18px_hsl(var(--foreground)/0.3),0_2px_8px_rgba(0,0,0,0.9)]"
                      style={{ 
                        fontSize: 'clamp(1.25rem, 5.2vw, 2.1rem)', 
                        letterSpacing: '0.05em',
                        textShadow: '0 0 12px rgba(255,255,255,0.25)'
                      }}>
                    {t('daily.title')}
                  </h1>
                </div>
              </div>

              {/* Yesterday's Rank Banner - shown below the badge, above content */}
              {yesterdayRank !== null && (
                <div className="text-center mb-2" style={{ marginTop: '-8px' }}>
                  <p className="font-bold"
                     style={{ 
                       fontSize: 'clamp(0.75rem, 3.5vw, 1rem)',
                       color: isTop10Yesterday ? 'hsl(45 100% 70%)' : 'hsl(0 0% 85%)',
                       textShadow: isTop10Yesterday 
                         ? '0 0 10px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0,0,0,0.8)' 
                         : '0 2px 4px rgba(0,0,0,0.8)'
                     }}>
                    {lang === 'hu' 
                      ? `🏆 Gratulálunk! Tegnapi helyezésed: ${yesterdayRank}.` 
                      : `🏆 Congrats! Yesterday's rank: ${yesterdayRank}.`}
                  </p>
                  {isTop10Yesterday && (
                    <p className="font-semibold mt-1"
                       style={{ 
                         fontSize: 'clamp(0.65rem, 3vw, 0.85rem)',
                         color: 'hsl(45 100% 80%)',
                         textShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
                       }}>
                      {lang === 'hu' ? '✨ TOP10 bónusz: 3× alap / 5× reklámmal!' : '✨ TOP10 bonus: 3× base / 5× with ads!'}
                    </p>
                  )}
                </div>
              )}

              {/* Content Area */}
              <div className="relative z-10 flex flex-col items-center justify-between flex-1 px-[8%] pb-[8%] pt-[2%]">
                
                {/* DAY Counter with 3D SVG fire */}
                <div className="flex items-center justify-center gap-2 mb-[3%]">
                  <p className="font-black text-white text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                     style={{ 
                       fontSize: 'clamp(1.5rem, 13cqw, 2.6rem)', 
                       letterSpacing: '0.06em',
                       textShadow: '0 0 16px rgba(255,255,255,0.2)'
                     }}>
                    {t('daily.day_label')} {weeklyEntryCount + 1}
                  </p>
                  
                  {/* 3D Fire SVG - Élethű láng feltöltött SVG alapján */}
                  <svg viewBox="0 0 92.27 122.88" className="flex-shrink-0" style={{ width: 'clamp(36px, 9vw, 60px)', height: 'auto' }}>
                    <defs>
                      <filter id="fireGlowEffect">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <g style={{ animation: 'fireRealisticFlicker 1.2s ease-in-out infinite' }}>
                      {/* Külső láng - narancssárga/piros */}
                      <path 
                        fill="#EC6F59"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        filter="url(#fireGlowEffect)"
                        d="M18.61,54.89C15.7,28.8,30.94,10.45,59.52,0 C42.02,22.71,74.44,47.31,76.23,70.89 c4.19-7.15,6.57-16.69,7.04-29.45c21.43,33.62,3.66,88.57-43.5,80.67c-4.33-0.72-8.5-2.09-12.3-4.13C10.27,108.8,0,88.79,0,69.68 C0,57.5,5.21,46.63,11.95,37.99C12.85,46.45,14.77,52.76,18.61,54.89L18.61,54.89z"
                        style={{ animation: 'fireFlickerOuter 0.9s ease-in-out infinite' }} 
                      />
                      {/* Belső láng - sárga */}
                      <path 
                        fill="#FAD15C"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        filter="url(#fireGlowEffect)"
                        d="M33.87,92.58c-4.86-12.55-4.19-32.82,9.42-39.93c0.1,23.3,23.05,26.27,18.8,51.14 c3.92-4.44,5.9-11.54,6.25-17.15c6.22,14.24,1.34,25.63-7.53,31.43c-26.97,17.64-50.19-18.12-34.75-37.72 C26.53,84.73,31.89,91.49,33.87,92.58L33.87,92.58z"
                        style={{ animation: 'fireFlickerInner 1s ease-in-out infinite 0.15s' }}
                      />
                    </g>
                    
                    <style>{`
                      @keyframes fireRealisticFlicker {
                        0%, 100% { 
                          transform: translateY(0) scale(1);
                          opacity: 1;
                        }
                        25% { 
                          transform: translateY(-2px) scale(1.02, 0.98);
                          opacity: 0.95;
                        }
                        50% { 
                          transform: translateY(-1px) scale(0.98, 1.02);
                          opacity: 0.98;
                        }
                        75% { 
                          transform: translateY(-3px) scale(1.01, 0.99);
                          opacity: 0.96;
                        }
                      }
                      @keyframes fireFlickerOuter {
                        0%, 100% { transform: scale(1, 1); opacity: 1; }
                        33% { transform: scale(1.02, 0.98); opacity: 0.96; }
                        66% { transform: scale(0.98, 1.02); opacity: 0.98; }
                      }
                      @keyframes fireFlickerInner {
                        0%, 100% { transform: scale(1, 1); opacity: 0.95; }
                        40% { transform: scale(1.04, 0.96); opacity: 1; }
                        80% { transform: scale(0.96, 1.04); opacity: 0.92; }
                      }
                    `}</style>
                  </svg>
                </div>

                {/* Weekly Rewards Preview - 7 boxes with 3D SVG stars and coins */}
                <div className="flex gap-[2.5%] justify-center mb-[4%] flex-wrap w-full">
                  {DAILY_REWARDS.map((reward, index) => {
                    const dayNumber = index + 1;
                    const isActive = dayNumber <= weeklyEntryCount + 1;
                    const displayReward = isPremium ? reward * 2 : reward;
                    
                    return (
                      <div key={dayNumber} className="flex flex-col items-center gap-[1.5%]">
                        {/* 3D Star SVG */}
                        <svg viewBox="0 0 100 100" style={{ 
                          width: 'clamp(21px, 9.75cqw, 36px)', 
                          height: 'auto',
                          filter: isActive 
                            ? `drop-shadow(0 0 6px #FBBF24) drop-shadow(0 0 12px rgba(251,191,36,0.6))` 
                            : 'grayscale(100%) brightness(1.2) drop-shadow(0 0 4px rgba(192,192,192,0.6))'
                        }}>
                          <defs>
                            <linearGradient id={`starGrad${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={isActive ? "#FFD700" : "#C0C0C0"} />
                              <stop offset="50%" stopColor={isActive ? "#FFA500" : "#A0A0A0"} />
                              <stop offset="100%" stopColor={isActive ? "#FF8C00" : "#808080"} />
                            </linearGradient>
                            <radialGradient id={`starHigh${index}`} cx="30%" cy="25%">
                              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                              <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                          </defs>
                          <path d="M50 5 L60 35 L92 35 L67 55 L77 85 L50 65 L23 85 L33 55 L8 35 L40 35 Z" 
                                fill={`url(#starGrad${index})`} 
                                stroke={isActive ? "#B8860B" : "#696969"} 
                                strokeWidth="2" />
                          <ellipse cx="42" cy="25" rx="10" ry="8" fill={`url(#starHigh${index})`} opacity="0.8" />
                        </svg>
                        
                        <div className="relative rounded-lg" style={{ padding: '1.2% 3.5%' }}>
                          <div className="absolute inset-0 rounded-lg"
                               style={{
                                 background: isActive 
                                   ? 'linear-gradient(135deg, hsl(var(--dup-gold-700)), hsl(var(--dup-gold-600)) 50%, hsl(var(--dup-gold-800)))'
                                   : 'linear-gradient(135deg, hsl(0 0% 50%), hsl(0 0% 40%) 50%, hsl(0 0% 30%))',
                                 boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)'
                               }} />
                          
                          <div className="absolute inset-[1.5px] rounded-lg"
                               style={{
                                 background: isActive
                                   ? 'linear-gradient(180deg, rgba(65, 105, 225, 0.3), rgba(30, 64, 175, 0.4))'
                                   : 'linear-gradient(180deg, rgba(100, 100, 100, 0.3), rgba(80, 80, 80, 0.4))',
                               }} />
                          
                          <div className="relative z-10 flex items-center justify-center gap-[0.3em]">
                            {/* Mini 3D Coin SVG */}
                            <svg viewBox="0 0 100 100" style={{ width: 'clamp(10px, 5.2cqw, 18px)', height: 'auto' }}>
                              <defs>
                                <linearGradient id={`miniCoinGrad${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FFD700" />
                                  <stop offset="50%" stopColor="#FFA500" />
                                  <stop offset="100%" stopColor="#FF8C00" />
                                </linearGradient>
                                <radialGradient id={`miniCoinHigh${index}`} cx="35%" cy="30%">
                                  <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                                </radialGradient>
                              </defs>
                              <circle cx="50" cy="50" r="45" fill={`url(#miniCoinGrad${index})`} stroke="#B8860B" strokeWidth="3" />
                              <ellipse cx="45" cy="40" rx="18" ry="15" fill={`url(#miniCoinHigh${index})`} opacity="0.7" />
                            </svg>
                            <span className="font-bold text-white"
                                  style={{ 
                                    fontSize: 'clamp(0.625rem, 5.2cqw, 0.9rem)',
                                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                  }}>
                              +{displayReward}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Today's Reward - BIG DISPLAY with large 3D coin */}
                {/* Show both options side by side if video available */}
                <div className={`flex ${videoAdAvailable ? 'gap-[3%]' : ''} justify-center mb-[4%] w-full`}>
                  
                  {/* Normal reward option - purple - CLICKABLE with press animation */}
                  <div 
                    className={`relative rounded-xl cursor-pointer transition-all duration-150 ${(claiming || claimed) ? 'pointer-events-none opacity-70' : ''}`}
                    style={{ 
                      padding: '2.5% 6%', 
                      flex: videoAdAvailable ? '1' : 'none',
                      transform: normalPressed ? 'scale(0.92)' : 'scale(1)',
                      filter: normalPressed ? 'brightness(0.85)' : 'brightness(1)',
                    }}
                    onTouchStart={() => setNormalPressed(true)}
                    onTouchEnd={() => setNormalPressed(false)}
                    onMouseDown={() => setNormalPressed(true)}
                    onMouseUp={() => setNormalPressed(false)}
                    onMouseLeave={() => setNormalPressed(false)}
                    onClick={handleClaim}
                  >
                    <div className="absolute inset-0 rounded-xl translate-y-0.5 translate-x-0.5"
                         style={{
                           background: 'rgba(0,0,0,0.3)',
                           filter: 'blur(4px)',
                           zIndex: -1
                         }} />
                    
                    <div className="absolute inset-0 rounded-xl"
                         style={{
                           background: 'linear-gradient(135deg, hsl(var(--dup-gold-700)), hsl(var(--dup-gold-600)) 50%, hsl(var(--dup-gold-800)))',
                           boxShadow: 'inset 0 0 0 2px hsl(var(--dup-gold-900)), 0 6px 16px rgba(0,0,0,0.35)'
                         }} />
                    
                    <div className="absolute inset-[3px] rounded-xl"
                         style={{
                           background: 'linear-gradient(180deg, hsl(var(--dup-gold-400)), hsl(var(--dup-gold-500)) 40%, hsl(var(--dup-gold-700)))',
                           boxShadow: 'inset 0 1px 0 hsl(var(--dup-gold-300))'
                         }} />
                    
                    <div className="absolute inset-[6px] rounded-xl"
                         style={{
                           background: 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(var(--dup-purple-500)) 0%, hsl(var(--dup-purple-600)) 40%, hsl(var(--dup-purple-800)) 100%)',
                           boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.15), inset 0 -12px 24px rgba(0,0,0,0.3)'
                         }} />
                    
                    <div className="absolute inset-[6px] rounded-xl pointer-events-none"
                         style={{
                           background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 12px, transparent 12px, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 24px)',
                           opacity: 0.7
                         }} />
                    
                    <div className="absolute inset-[6px] rounded-xl pointer-events-none"
                         style={{
                           background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.35), transparent 60%)'
                         }} />
                    
                    <div className="relative z-10 flex items-center justify-center gap-[0.4em]">
                      {/* Large 3D Coin SVG with pulse animation */}
                      <svg viewBox="0 0 100 100" style={{ 
                        width: videoAdAvailable ? 'clamp(24px, 8cqw, 48px)' : 'clamp(32px, 10cqw, 64px)', 
                        height: 'auto',
                        animation: 'bigCoinPulse 1.5s ease-in-out infinite'
                      }}>
                        <defs>
                          <linearGradient id="bigCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFD700" />
                            <stop offset="25%" stopColor="#FFC700" />
                            <stop offset="50%" stopColor="#FFA500" />
                            <stop offset="75%" stopColor="#FF8C00" />
                            <stop offset="100%" stopColor="#FFD700" />
                          </linearGradient>
                          <radialGradient id="bigCoinHighlight" cx="35%" cy="30%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                            <stop offset="40%" stopColor="rgba(255,255,255,0.4)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                          </radialGradient>
                          <filter id="bigCoinShadow">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#FF8C00" floodOpacity="0.8"/>
                          </filter>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="url(#bigCoinGrad)" stroke="#B8860B" strokeWidth="3" filter="url(#bigCoinShadow)" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(139,69,19,0.4)" strokeWidth="2" />
                        <ellipse cx="42" cy="38" rx="22" ry="18" fill="url(#bigCoinHighlight)" opacity="0.85" />
                        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(139,69,19,0.3)" strokeWidth="1.5" />
                      </svg>
                      <span className="font-black text-white"
                            style={{ 
                              fontSize: videoAdAvailable ? 'clamp(1.2rem, 9cqw, 2rem)' : 'clamp(1.5rem, 12cqw, 2.5rem)',
                              textShadow: '0 0 16px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.9)',
                              letterSpacing: '0.02em'
                            }}>
                        +{rewardAmounts.baseAmount}
                      </span>
                    </div>
                  </div>

                  {/* Double reward option - RED - only show if video available - with press animation */}
                  {videoAdAvailable && (
                    <div 
                      className="relative rounded-xl cursor-pointer transition-all duration-150"
                      style={{ 
                        padding: '2.5% 6%', 
                        flex: '1',
                        transform: videoPressed ? 'scale(0.92)' : 'scale(1)',
                        filter: videoPressed ? 'brightness(0.85)' : 'brightness(1)',
                      }}
                      onTouchStart={() => setVideoPressed(true)}
                      onTouchEnd={() => setVideoPressed(false)}
                      onMouseDown={() => setVideoPressed(true)}
                      onMouseUp={() => setVideoPressed(false)}
                      onMouseLeave={() => setVideoPressed(false)}
                      onClick={handleVideoAccept}
                    >
                      <div className="absolute inset-0 rounded-xl translate-y-0.5 translate-x-0.5"
                           style={{
                             background: 'rgba(0,0,0,0.3)',
                             filter: 'blur(4px)',
                             zIndex: -1
                           }} />
                      
                      {/* Gold frame - same as normal */}
                      <div className="absolute inset-0 rounded-xl"
                           style={{
                             background: 'linear-gradient(135deg, hsl(var(--dup-gold-700)), hsl(var(--dup-gold-600)) 50%, hsl(var(--dup-gold-800)))',
                             boxShadow: 'inset 0 0 0 2px hsl(var(--dup-gold-900)), 0 6px 16px rgba(0,0,0,0.35)'
                           }} />
                      
                      <div className="absolute inset-[3px] rounded-xl"
                           style={{
                             background: 'linear-gradient(180deg, hsl(var(--dup-gold-400)), hsl(var(--dup-gold-500)) 40%, hsl(var(--dup-gold-700)))',
                             boxShadow: 'inset 0 1px 0 hsl(var(--dup-gold-300))'
                           }} />
                      
                      {/* RED inner - instead of purple */}
                      <div className="absolute inset-[6px] rounded-xl"
                           style={{
                             background: 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(0 85% 55%) 0%, hsl(0 80% 45%) 40%, hsl(0 75% 35%) 100%)',
                             boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.15), inset 0 -12px 24px rgba(0,0,0,0.3)'
                           }} />
                      
                      <div className="absolute inset-[6px] rounded-xl pointer-events-none"
                           style={{
                             background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 12px, transparent 12px, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 24px)',
                             opacity: 0.7
                           }} />
                      
                      <div className="absolute inset-[6px] rounded-xl pointer-events-none"
                           style={{
                             background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.35), transparent 60%)'
                           }} />
                      
                      <div className="relative z-10 flex items-center justify-center gap-[0.3em]">
                        {/* Large 3D Coin SVG */}
                        <svg viewBox="0 0 100 100" style={{ 
                          width: 'clamp(24px, 8cqw, 48px)', 
                          height: 'auto',
                          animation: 'bigCoinPulseRed 1.5s ease-in-out infinite'
                        }}>
                          <defs>
                            <linearGradient id="bigCoinGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FFD700" />
                              <stop offset="25%" stopColor="#FFC700" />
                              <stop offset="50%" stopColor="#FFA500" />
                              <stop offset="75%" stopColor="#FF8C00" />
                              <stop offset="100%" stopColor="#FFD700" />
                            </linearGradient>
                            <radialGradient id="bigCoinHighlightRed" cx="35%" cy="30%">
                              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                              <stop offset="40%" stopColor="rgba(255,255,255,0.4)" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                            <filter id="bigCoinShadowRed">
                              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#DC2626" floodOpacity="0.8"/>
                            </filter>
                          </defs>
                          <circle cx="50" cy="50" r="48" fill="url(#bigCoinGradRed)" stroke="#B8860B" strokeWidth="3" filter="url(#bigCoinShadowRed)" />
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(139,69,19,0.4)" strokeWidth="2" />
                          <ellipse cx="42" cy="38" rx="22" ry="18" fill="url(#bigCoinHighlightRed)" opacity="0.85" />
                          <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(139,69,19,0.3)" strokeWidth="1.5" />
                        </svg>
                        
                        <span className="font-black text-white"
                              style={{ 
                                fontSize: 'clamp(1.2rem, 9cqw, 2rem)',
                                textShadow: '0 0 16px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.9)',
                                letterSpacing: '0.02em'
                              }}>
                          +{rewardAmounts.adAmount}
                        </span>
                        
                        {/* Film icon SVG */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                             style={{ 
                               width: 'clamp(16px, 5cqw, 28px)', 
                               height: 'auto',
                               color: 'white',
                               filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                             }}>
                          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                          <line x1="7" y1="2" x2="7" y2="22"/>
                          <line x1="17" y1="2" x2="17" y2="22"/>
                          <line x1="2" y1="12" x2="22" y2="12"/>
                          <line x1="2" y1="7" x2="7" y2="7"/>
                          <line x1="2" y1="17" x2="7" y2="17"/>
                          <line x1="17" y1="17" x2="22" y2="17"/>
                          <line x1="17" y1="7" x2="22" y2="7"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                <style>{`
                  @keyframes bigCoinPulse {
                    0%, 100% { 
                      transform: scale(1) rotate(0deg);
                      filter: drop-shadow(0 0 12px rgba(251,191,36,0.8));
                    }
                    50% { 
                      transform: scale(1.08) rotate(5deg);
                      filter: drop-shadow(0 0 20px rgba(251,191,36,1)) drop-shadow(0 0 32px rgba(251,191,36,0.6));
                    }
                  }
                  @keyframes bigCoinPulseRed {
                    0%, 100% { 
                      transform: scale(1) rotate(0deg);
                      filter: drop-shadow(0 0 12px rgba(220,38,38,0.8));
                    }
                    50% { 
                      transform: scale(1.08) rotate(5deg);
                      filter: drop-shadow(0 0 20px rgba(220,38,38,1)) drop-shadow(0 0 32px rgba(220,38,38,0.6));
                    }
                  }
                `}</style>

                {/* Button removed - boxes are now clickable */}
              </div>
              </HexShieldFrame>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DailyGiftDialog;
