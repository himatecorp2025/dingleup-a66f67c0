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
        lang === 'hu' 
          ? `Gratulálunk! A jutalmad jóváíródott! +${coins} arany, +${lives} élet` 
          : `Congratulations! Your reward has been credited! +${coins} gold, +${lives} lives`,
        { position: 'top-center', duration: 2000 }
      );
      onClose();
    },
  });

  // Check availability when opened
  useEffect(() => {
    if (isOpen && userId) {
      setCheckingAvailability(true);
      videoAdFlow.checkRefillAvailable().then((available) => {
        setVideoAdAvailable(available);
        setCheckingAvailability(false);
        
        // If available, auto-start the flow
        if (available) {
          videoAdFlow.startRefillFlow();
        }
      });
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
