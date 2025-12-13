import { useState, useEffect, useCallback } from 'react';
import { Film, Coins, Heart } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { VideoAdModal } from './VideoAdModal';
import { VideoAdPrompt } from './VideoAdPrompt';
import { useVideoAdFlow } from '@/hooks/useVideoAdFlow';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface RefillByVideoProps {
  userId: string | undefined;
  onRefillComplete: (coins: number, lives: number) => void;
  trigger: 'low_lives' | 'low_coins' | 'manual';
  isOpen: boolean;
  onClose: () => void;
}

export const RefillByVideo = ({
  userId,
  onRefillComplete,
  trigger,
  isOpen,
  onClose,
}: RefillByVideoProps) => {
  const { lang } = useI18n();
  const [videoAdAvailable, setVideoAdAvailable] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);

  const videoAdFlow = useVideoAdFlow({
    userId,
    onRewardClaimed: (coins, lives) => {
      onRefillComplete(coins, lives);
      toast.success(
        <div className="flex flex-col items-center gap-2 text-center max-w-[75vw]">
          <div className="text-2xl">🎉</div>
          <div className="font-bold text-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
            {lang === 'hu' ? 'Gratulálunk!' : 'Congratulations!'}
          </div>
          <div className="text-sm text-foreground/90">
            {lang === 'hu' 
              ? `A jutalmad jóváíródott!` 
              : `Your reward has been credited!`}
          </div>
          <div className="flex items-center gap-3 mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 shadow-lg shadow-yellow-500/20">
            <span className="font-bold text-yellow-400 text-lg">+{coins} 🪙</span>
            <span className="text-foreground/50">|</span>
            <span className="font-bold text-red-400 text-lg">+{lives} ❤️</span>
          </div>
        </div>,
        { position: 'top-center', duration: 3000 }
      );
      onClose();
    },
  });

  // Check availability when opened
  useEffect(() => {
    if (isOpen && userId) {
      // INSTANT: checkRefillAvailable is now synchronous
      const available = videoAdFlow.checkRefillAvailable();
      setVideoAdAvailable(available);
      setCheckingAvailability(false);
      
      // If available, auto-start the flow
      if (available) {
        videoAdFlow.startRefillFlow();
      }
    }
  }, [isOpen, userId]);

  const texts = {
    hu: {
      title: 'Töltsd fel a készleteidet!',
      description: 'Nézz meg 2×15 másodperces videót és kapj:',
      reward: '500 arany + 5 élet',
      watchVideos: 'Megnézem a 2 videót',
      cancel: 'Mégsem',
      notAvailable: 'Jelenleg nincs elérhető videó.',
    },
    en: {
      title: 'Refill your supplies!',
      description: 'Watch 2×15 second videos and get:',
      reward: '500 gold + 5 lives',
      watchVideos: 'Watch 2 videos',
      cancel: 'Cancel',
      notAvailable: 'No videos available at the moment.',
    },
  };

  const t = texts[lang as 'hu' | 'en'] || texts.en;

  // Show video prompt
  if (videoAdFlow.showPrompt) {
    return (
      <VideoAdPrompt
        isOpen={true}
        onClose={() => {
          videoAdFlow.declinePrompt();
          onClose();
        }}
        onAccept={videoAdFlow.acceptPrompt}
        onDecline={() => {
          videoAdFlow.declinePrompt();
          onClose();
        }}
        context="refill"
        rewardText={t.reward}
      />
    );
  }

  // Show video modal (2 videos, 30 seconds total)
  if (videoAdFlow.showVideo && videoAdFlow.videos.length > 0) {
    return (
      <VideoAdModal
        isOpen={true}
        onClose={videoAdFlow.onVideoComplete}
        videos={videoAdFlow.videos}
        totalDurationSeconds={videoAdFlow.totalDuration}
        onComplete={videoAdFlow.onVideoComplete}
        onCancel={() => {
          videoAdFlow.cancelVideo();
          onClose();
        }}
        context="refill"
      />
    );
  }

  // If checking or not available, show nothing (modal closed)
  if (!isOpen || checkingAvailability || !videoAdAvailable) {
    return null;
  }

  return null;
};

// Hook to check if refill option should be shown
export const useRefillAvailability = (userId: string | undefined) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(async () => {
    if (!userId) {
      setIsAvailable(false);
      return false;
    }

    setIsChecking(true);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAvailable(false);
        return false;
      }
      
      // Check if at least one video is available
      const { data } = await supabase.functions.invoke('get-ad-video', {
        body: { context: 'refill' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      const available = data?.available === true;
      setIsAvailable(available);
      return available;
    } catch (error) {
      logger.error('[useRefillAvailability] Error:', error);
      setIsAvailable(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [userId]);

  return {
    isAvailable,
    isChecking,
    checkAvailability,
  };
};

export default RefillByVideo;
