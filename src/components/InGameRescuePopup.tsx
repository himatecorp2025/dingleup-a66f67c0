import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { X, Film } from 'lucide-react';
import { LifeIcon3D } from '@/components/icons/LifeIcon3D';
import { CoinIcon3D } from '@/components/icons/CoinIcon3D';
import { GoldRewardCoin3D } from '@/components/icons/GoldRewardCoin3D';
import { LoadingSpinner3D } from '@/components/icons/LoadingSpinner3D';
import { trackConversionEvent } from '@/lib/analytics';
import { useDebounce } from '@/hooks/useDebounce';
import { useRewardVideoStore } from '@/stores/rewardVideoStore';
import { FullscreenRewardVideoView } from './FullscreenRewardVideoView';

interface InGameRescuePopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerReason: 'NO_LIFE' | 'NO_GOLD';
  currentLives: number;
  currentGold: number;
  onStateRefresh: () => Promise<void>;
  onGameEnd?: () => void;
}

export const InGameRescuePopup: React.FC<InGameRescuePopupProps> = ({
  isOpen,
  onClose,
  triggerReason,
  currentLives,
  currentGold,
  onStateRefresh,
  onGameEnd,
}) => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [loadingGoldSaver, setLoadingGoldSaver] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [showVideo, setShowVideo] = useState(false);

  // New reward video store
  const { 
    isPreloaded, 
    hasEnoughVideos, 
    activeSession, 
    isStartingSession,
    startRewardSession,
    completeRewardSession,
    cancelSession,
  } = useRewardVideoStore();

  // Video availability - as long as there's at least 1 video, we can play (backend handles repetition)
  const videoAdAvailable = isPreloaded && hasEnoughVideos(1);

  // Get userId on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Track product_view when popup opens
  useEffect(() => {
    const trackProductView = async () => {
      if (isOpen && !hasTrackedView) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await trackConversionEvent(
            session.user.id,
            'product_view',
            'booster_rescue',
            triggerReason,
            { trigger_reason: triggerReason }
          );
          setHasTrackedView(true);
        }
      }
    };
    trackProductView();
  }, [isOpen, hasTrackedView, triggerReason]);

  // Reset tracking flag when popup closes
  useEffect(() => {
    if (!isOpen) {
      setHasTrackedView(false);
      setShowVideo(false);
    }
  }, [isOpen]);

  // Handle video refill click - starts 2×15s session (backend handles video repetition if needed)
  const handleVideoRefill = async () => {
    if (!userId) return;
    
    // Start reward session for refill (2 videos required - backend will repeat if only 1 exists)
    const session = await startRewardSession(userId, 'refill', 0);
    
    if (session && session.videos.length > 0) {
      // Close popup immediately and show fullscreen video
      setShowVideo(true);
    } else {
      toast.error(lang === 'hu' ? 'Nincs elérhető videó' : 'No video available');
    }
  };

  // Handle video completion (called when user clicks X after watching)
  const handleVideoComplete = async (watchedVideoIds: string[]) => {
    // Complete the session and get reward
    const result = await completeRewardSession(watchedVideoIds);
    
    setShowVideo(false);
    
    if (result.success) {
      toast.success(
        lang === 'hu' 
          ? `Plusz ${result.livesDelta} élet és ${result.coinsDelta} arany jóváírva!` 
          : `Plus ${result.livesDelta} lives and ${result.coinsDelta} gold credited!`,
        { position: 'top-center' }
      );
      await onStateRefresh();
      onClose();
    } else {
      toast.error(lang === 'hu' ? 'Hiba történt' : 'An error occurred');
    }
  };

  // Handle video close without completion
  const handleVideoClose = () => {
    cancelSession();
    setShowVideo(false);
  };

  const handleGoldSaverPurchaseRaw = async () => {
    if (currentGold < 500) {
      toast.error(t('rescue.insufficient_gold'));
      return;
    }

    setLoadingGoldSaver(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('rescue.not_logged_in'));
        setLoadingGoldSaver(false);
        return;
      }

      // Track add_to_cart
      await trackConversionEvent(
        session.user.id,
        'add_to_cart',
        'booster',
        'GOLD_SAVER',
        { price: 500, currency: 'gold' }
      );
      
      const { data, error } = await supabase.functions.invoke('purchase-booster', {
        body: { boosterCode: 'GOLD_SAVER' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(t('rescue.free_success'));
        await onStateRefresh();
        onClose();
      } else {
        toast.error(t('payment.error.purchase_failed'), { duration: 4000 });
        onClose();
        if (onGameEnd) onGameEnd();
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Gold Saver purchase error:', error);
      toast.error(t('payment.error.purchase_failed'), { duration: 4000 });
      onClose();
      if (onGameEnd) onGameEnd();
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } finally {
      setLoadingGoldSaver(false);
    }
  };

  // Debounced version to prevent double-click
  const [handleGoldSaverPurchase] = useDebounce(handleGoldSaverPurchaseRaw, 500);

  const hasEnoughGold = currentGold >= 500;

  // If video is showing, render fullscreen video view
  if (showVideo && activeSession && activeSession.videos.length > 0) {
    return (
      <FullscreenRewardVideoView
        videos={activeSession.videos}
        durationSecondsPerVideo={15}
        onCompleted={handleVideoComplete}
        onClose={handleVideoClose}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-red-900/50 via-purple-900/70 to-red-900/50 border-yellow-400 p-3 sm:p-4 md:p-5 shadow-2xl !fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !m-0" style={{ maxWidth: 'clamp(320px, 95vw, 450px)', width: 'clamp(320px, 95vw, 450px)', height: 'auto', minHeight: 'clamp(450px, 75vh, 600px)', borderWidth: 'clamp(3px, 1vw, 6px)', borderRadius: 'clamp(16px, 4vw, 20px)', padding: 'clamp(0.75rem, 2.5vw, 1.25rem)', boxShadow: '0 0 50px rgba(250, 204, 21, 0.7), 0 25px 80px rgba(0, 0, 0, 0.8), inset 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -4px 20px rgba(250, 204, 21, 0.2)' }}>
        {/* Close button - top right */}
        <button
          onClick={onClose}
          className="absolute z-50 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-200 hover:scale-110"
          style={{ 
            top: 'clamp(0.75rem, 2vh, 1rem)', 
            right: 'clamp(0.75rem, 2vw, 1rem)', 
            padding: 'clamp(0.375rem, 1vh, 0.5rem)' 
          }}
          aria-label="Close"
        >
          <X style={{ width: 'clamp(18px, 4vw, 24px)', height: 'clamp(18px, 4vh, 24px)' }} className="text-yellow-400" />
        </button>

        {/* Animated background stars */}
        <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            />
          ))}
        </div>

        {/* Header with enhanced 3D styling */}
        <DialogHeader className="space-y-1 relative" style={{ marginBottom: 'clamp(0.375rem, 1.5vh, 0.75rem)', marginTop: 'clamp(0.5rem, 2vh, 1rem)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-600/30 via-yellow-500/20 to-transparent" style={{ borderRadius: 'clamp(16px, 4vw, 20px)', boxShadow: 'inset 0 3px 15px rgba(234, 179, 8, 0.4)' }}></div>
          <div className="absolute inset-0 bg-gradient-radial from-yellow-400/10 via-transparent to-transparent rounded-t-[20px]"></div>
          
          <DialogTitle className="relative text-center text-yellow-50 leading-tight tracking-wider" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', textShadow: '0 4px 15px rgba(0, 0, 0, 0.9), 0 6px 25px rgba(0, 0, 0, 0.8)', filter: 'drop-shadow(0 6px 15px rgba(0, 0, 0, 0.8))' }}>
            {t('rescue.title')}
          </DialogTitle>
          <p className="relative text-center text-yellow-50 font-bold" style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)', textShadow: '0 3px 10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(251, 191, 36, 0.4)' }}>
            {t('rescue.last_chance')}
          </p>
        </DialogHeader>

        {/* Current Status with 3D icons */}
        <div className="relative bg-gradient-to-r from-blue-900/70 via-purple-900/80 to-blue-900/70 border-blue-400/60 rounded-xl p-2 sm:p-3 shadow-xl" style={{ borderWidth: 'clamp(2px, 0.6vw, 4px)', borderRadius: 'clamp(16px, 4vw, 20px)', padding: 'clamp(0.375rem, 1.5vh, 0.75rem)', marginBottom: 'clamp(0.375rem, 1.5vh, 0.75rem)', marginTop: 'clamp(0.75rem, 2.5vh, 1.5rem)', boxShadow: 'inset 0 5px 20px rgba(0, 0, 0, 0.6), inset 0 -3px 15px rgba(59, 130, 246, 0.3), 0 8px 30px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3), 0 15px 50px rgba(0, 0, 0, 0.8)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20 rounded-[20px] pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-600/10 to-blue-600/10 rounded-[20px] pointer-events-none"></div>
          
          <div className="relative grid grid-cols-2 gap-4">
            {/* Life indicator */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/30 rounded-full blur-md"></div>
                <LifeIcon3D size={32} className="relative drop-shadow-2xl sm:w-10 sm:h-10" />
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-blue-100 text-[10px] sm:text-xs font-bold tracking-wide" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>{t('rescue.life_label')}</p>
                <p className="text-white font-black text-xl sm:text-2xl" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 15px rgba(59, 130, 246, 0.5)' }}>{currentLives}</p>
              </div>
            </div>
            
            {/* Gold indicator */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-md"></div>
                <CoinIcon3D size={32} className="relative drop-shadow-2xl sm:w-10 sm:h-10" />
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-yellow-100 text-[10px] sm:text-xs font-bold tracking-wide" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>{t('rescue.gold_label')}</p>
                <p className="text-white font-black text-xl sm:text-2xl" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 15px rgba(234, 179, 8, 0.5)' }}>{currentGold}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two options side by side */}
        <div className="grid grid-cols-2 gap-2" style={{ marginTop: 'clamp(0.5rem, 2vh, 0.75rem)' }}>
          
          {/* Option 1: Video Refill */}
          <div className="relative bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-800 border-[3px] border-purple-300 rounded-[16px] p-2 sm:p-3 shadow-2xl" style={{ boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -4px 20px rgba(168, 85, 247, 0.3)' }}>
            <div className="flex flex-col items-center">
              {/* Film icon */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700 flex items-center justify-center mb-2" style={{ boxShadow: 'inset 0 -10px 30px rgba(0, 0, 0, 0.6), inset 0 10px 30px rgba(255, 255, 255, 0.5)' }}>
                <Film className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
              </div>

              <h4 className="text-[10px] sm:text-xs font-black text-center text-purple-100 mb-1 leading-tight" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}>
                {lang === 'hu' ? 'Nézz alkotókat jutalomért!' : 'Watch creators for reward!'}
              </h4>

              {/* Rewards */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex items-center gap-0.5">
                  <GoldRewardCoin3D size={14} />
                  <span className="text-yellow-200 text-[10px] font-bold">+500</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <LifeIcon3D size={14} />
                  <span className="text-green-200 text-[10px] font-bold">+5</span>
                </div>
              </div>

              <Button
                onClick={handleVideoRefill}
                disabled={!videoAdAvailable || isStartingSession}
                className="w-full bg-gradient-to-b from-purple-400 via-purple-500 to-purple-700 hover:from-purple-300 hover:via-purple-400 hover:to-purple-600 text-white font-bold text-xs py-2 rounded-[10px] disabled:opacity-50 border-[2px] border-purple-300 shadow-xl transition-all"
                style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}
              >
                {isStartingSession ? (
                  <LoadingSpinner3D size={14} />
                ) : (
                  <span className="flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    2×15s
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Option 2: Gold Purchase */}
          <div className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-purple-800 border-[3px] border-yellow-300 rounded-[16px] p-2 sm:p-3 shadow-2xl" style={{ boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -4px 20px rgba(234, 179, 8, 0.3)' }}>
            <div className="flex flex-col items-center">
              {/* Coin icon */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-700 flex items-center justify-center mb-2" style={{ boxShadow: 'inset 0 -10px 30px rgba(0, 0, 0, 0.6), inset 0 10px 30px rgba(255, 255, 255, 0.7)' }}>
                <GoldRewardCoin3D size={28} className="drop-shadow-lg" />
              </div>

              <h4 className="text-[10px] sm:text-xs font-black text-center text-yellow-100 mb-1 leading-tight" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}>
                {lang === 'hu' ? 'Mentsd magad arannyal!' : 'Save yourself with gold!'}
              </h4>

              {/* Rewards - Net: spend 500, get 750+5 = net +250 gold +5 lives */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex items-center gap-0.5">
                  <GoldRewardCoin3D size={14} />
                  <span className="text-yellow-200 text-[10px] font-bold">+250</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <LifeIcon3D size={14} />
                  <span className="text-green-200 text-[10px] font-bold">+5</span>
                </div>
              </div>

              <Button
                onClick={handleGoldSaverPurchase}
                disabled={!hasEnoughGold || loadingGoldSaver}
                className="w-full bg-gradient-to-b from-green-400 via-green-500 to-green-700 hover:from-green-300 hover:via-green-400 hover:to-green-600 text-white font-bold text-xs py-2 rounded-[10px] disabled:opacity-50 border-[2px] border-green-300 shadow-xl transition-all"
                style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}
              >
                {loadingGoldSaver ? (
                  <LoadingSpinner3D size={14} />
                ) : hasEnoughGold ? (
                  <span>500 {lang === 'hu' ? 'arany' : 'gold'}</span>
                ) : (
                  <span className="text-[10px]">{t('rescue.not_enough_short')}</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Warning only if not enough gold (video always available if system has at least 1) */}
        {!hasEnoughGold && !videoAdAvailable && (
          <p className="text-yellow-200 text-[10px] text-center mt-2 font-bold" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
            {lang === 'hu' 
              ? 'Hamarosan érkeznek az alkotók videói...' 
              : 'Creator videos coming soon...'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
