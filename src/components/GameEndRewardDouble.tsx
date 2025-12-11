import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Film, Coins, Heart } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { VideoAdModal } from './VideoAdModal';
import { VideoAdPrompt } from './VideoAdPrompt';
import { useVideoAdFlow } from '@/hooks/useVideoAdFlow';
import { toast } from 'sonner';

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
  const [videoAdAvailable, setVideoAdAvailable] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);

  const videoAdFlow = useVideoAdFlow({
    userId,
    onRewardClaimed: (coins) => {
      onRewardDoubled(coins);
      toast.success(
        lang === 'hu' 
          ? `Gratulálunk! +${coins} arany jóváírva!` 
          : `Congratulations! +${coins} gold credited!`
      );
    },
  });

  // Check availability when opened
  useEffect(() => {
    if (isOpen && userId) {
      setCheckingAvailability(true);
      videoAdFlow.checkGameEndDoubleAvailable().then((available) => {
        setVideoAdAvailable(available);
        setCheckingAvailability(false);
      });
    }
  }, [isOpen, userId]);

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

  const handleAcceptDouble = () => {
    videoAdFlow.startGameEndDouble(coinsEarned);
  };

  // Show video prompt
  if (videoAdFlow.showPrompt) {
    return (
      <VideoAdPrompt
        isOpen={true}
        onClose={videoAdFlow.declinePrompt}
        onAccept={videoAdFlow.acceptPrompt}
        onDecline={videoAdFlow.declinePrompt}
        context="game_end"
        rewardText={`${coinsEarned} → ${coinsEarned * 2} ${lang === 'hu' ? 'arany' : 'gold'}`}
      />
    );
  }

  // Show video modal
  if (videoAdFlow.showVideo && videoAdFlow.videos.length > 0) {
    return (
      <VideoAdModal
        isOpen={true}
        onClose={videoAdFlow.onVideoComplete}
        videos={videoAdFlow.videos}
        totalDurationSeconds={videoAdFlow.totalDuration}
        onComplete={videoAdFlow.onVideoComplete}
        onCancel={videoAdFlow.cancelVideo}
        context="game_end"
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
          {checkingAvailability ? (
            <div className="text-gray-400 mb-4">...</div>
          ) : videoAdAvailable ? (
            <>
              {/* Film icon */}
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Film className="w-8 h-8 text-primary" />
              </div>

              <p className="text-lg font-semibold text-white mb-4">{t.doubleOffer}</p>

              <div className="flex flex-col w-full gap-3">
                <Button
                  onClick={handleAcceptDouble}
                  disabled={videoAdFlow.isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
                >
                  {videoAdFlow.isLoading ? '...' : t.watchVideo}
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
