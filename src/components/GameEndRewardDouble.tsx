import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Film, Coins } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRewardVideoStore, RewardVideo } from '@/stores/rewardVideoStore';
import { FullscreenRewardVideoView } from './FullscreenRewardVideoView';

interface GameEndRewardDoubleProps {
  isOpen: boolean;
  onClose: () => void;
  coinsEarned: number;
  userId: string | undefined;
  onRewardDoubled: (additionalCoins: number) => void;
}

export const GameEndRewardDouble = ({
  isOpen,
  onClose,
  coinsEarned,
  userId,
  onRewardDoubled,
}: GameEndRewardDoubleProps) => {
  const { lang } = useI18n();
  const [showVideo, setShowVideo] = useState(false);
  const [videosToPlay, setVideosToPlay] = useState<RewardVideo[]>([]);

  // New reward video store
  const { 
    isPreloaded, 
    hasEnoughVideos,
    getVideosFromQueue,
    activeSession, 
    startRewardSession,
    completeRewardSession,
    cancelSession,
  } = useRewardVideoStore();

  // Video availability based on preloaded queue (game end needs 1 video)
  const videoAdAvailable = isPreloaded && hasEnoughVideos(1);

  const texts = {
    hu: {
      title: 'Játék vége!',
      coinsEarned: 'Megszerzett arany:',
      doubleOffer: 'Duplázd meg a jutalmadat!',
      watchVideo: 'Megnézem a videót',
      notNow: 'Most nem',
      noVideoAvailable: 'Gratulálunk a játékhoz!',
    },
    en: {
      title: 'Game Over!',
      coinsEarned: 'Coins earned:',
      doubleOffer: 'Double your reward!',
      watchVideo: 'Watch video',
      notNow: 'Not now',
      noVideoAvailable: 'Congratulations on your game!',
    },
  };

  const t = texts[lang as 'hu' | 'en'] || texts.en;

  // PERFORMANCE CRITICAL: Show video INSTANTLY using preloaded queue
  const handleAcceptDouble = () => {
    if (!userId) return;
    
    // INSTANT: Get videos from preloaded queue synchronously
    const videosFromQueue = getVideosFromQueue(1);
    
    if (videosFromQueue.length === 0) {
      toast.error(lang === 'hu' ? 'Nincs elérhető videó' : 'No video available');
      return;
    }
    
    // INSTANT: Show video view IMMEDIATELY - no async waiting!
    setVideosToPlay(videosFromQueue);
    setShowVideo(true);
    
    // Start session in background (non-blocking) - just for tracking
    startRewardSession(userId, 'end_game', coinsEarned);
  };

  // Handle video completion (called when user clicks X after watching)
  const handleVideoComplete = async (watchedVideoIds: string[]) => {
    // Complete the session and get reward
    const result = await completeRewardSession(watchedVideoIds);
    
    setShowVideo(false);
    
    if (result.success) {
      onRewardDoubled(result.coinsDelta);
      toast.success(
        <div className="flex flex-col items-center gap-2 text-center max-w-[75vw]">
          <div className="text-2xl">🎉</div>
          <div className="font-bold text-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
            {lang === 'hu' ? 'Gratulálunk!' : 'Congratulations!'}
          </div>
          <div className="text-sm text-foreground/90">
            {lang === 'hu' 
              ? 'Jutalmad jóváírásra került!' 
              : 'Your reward has been credited!'}
          </div>
          <div className="flex items-center gap-2 mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 shadow-lg shadow-yellow-500/20">
            <span className="font-bold text-yellow-400 text-lg">2× 🪙</span>
          </div>
        </div>,
        { position: 'top-center', duration: 3000 }
      );
      onClose();
    } else {
      toast.error(lang === 'hu' ? 'Hiba történt' : 'An error occurred');
      onClose();
    }
  };

  // Handle video close without completion
  const handleVideoClose = () => {
    cancelSession();
    setShowVideo(false);
    onClose();
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowVideo(false);
    }
  }, [isOpen]);

  // Show fullscreen video view - use locally stored videos for instant display
  if (showVideo && videosToPlay.length > 0) {
    return (
      <FullscreenRewardVideoView
        videos={videosToPlay}
        durationSecondsPerVideo={15}
        onCompleted={handleVideoComplete}
        onClose={handleVideoClose}
        context="game_end"
        rewardAmount={coinsEarned}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-primary/30">
        <DialogTitle className="sr-only">{t.title}</DialogTitle>
        <DialogDescription className="sr-only">Game end reward screen</DialogDescription>
        
        <div className="flex flex-col items-center text-center p-4">
          {/* Trophy icon */}
          <div className="text-6xl mb-4">🏆</div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-4">{t.title}</h2>

          {/* Coins earned */}
          <div className="flex items-center gap-2 mb-6">
            <Coins className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold text-yellow-400">{coinsEarned}</span>
          </div>

          {/* Double offer or close */}
          {videoAdAvailable ? (
            <>
              {/* Film icon */}
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Film className="w-8 h-8 text-primary" />
              </div>

              <p className="text-lg font-semibold text-white mb-4">{t.doubleOffer}</p>

              <div className="flex flex-col w-full gap-3">
                <Button
                  onClick={handleAcceptDouble}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
                >
                  {t.watchVideo}
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white"
                >
                  {t.notNow}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-4">{t.noVideoAvailable}</p>
              <Button
                onClick={onClose}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
              >
                OK
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameEndRewardDouble;
