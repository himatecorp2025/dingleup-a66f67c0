import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Film } from 'lucide-react';
import { useI18n } from '@/i18n';

interface VideoAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: VideoData[];
  totalDurationSeconds: number;
  onComplete: () => void;
  onCancel: () => void;
  context: 'daily_gift' | 'game_end' | 'refill';
}

interface VideoData {
  id: string;
  video_url: string;
  embed_url: string | null;
  platform: string;
  duration_seconds: number | null;
}

const SEGMENT_DURATION = 15; // Each video segment is 15 seconds

export const VideoAdModal = ({
  isOpen,
  onClose,
  videos,
  totalDurationSeconds,
  onComplete,
  onCancel,
  context,
}: VideoAdModalProps) => {
  const { t, lang } = useI18n();
  const [countdown, setCountdown] = useState(totalDurationSeconds);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [showRewardMessage, setShowRewardMessage] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoStartTimeRef = useRef<number>(0);

  // Calculate how many 15-second segments we need
  const totalSegments = Math.ceil(totalDurationSeconds / SEGMENT_DURATION);

  // Get embed URL for platform
  const getEmbedUrl = (video: VideoData): string => {
    if (video.embed_url) return video.embed_url;
    
    const url = video.video_url;
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&modestbranding=1`;
      }
    }
    
    // TikTok
    if (url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1`;
      }
    }
    
    // Instagram
    if (url.includes('instagram.com/reel')) {
      const reelId = url.match(/reel\/([^/?]+)/)?.[1];
      if (reelId) {
        return `https://www.instagram.com/reel/${reelId}/embed/?autoplay=1`;
      }
    }
    
    // Facebook
    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=1`;
    }
    
    return url;
  };

  // Start countdown timer
  useEffect(() => {
    if (!isOpen) return;

    setCountdown(totalDurationSeconds);
    setCurrentVideoIndex(0);
    setCanClose(false);
    setShowRewardMessage(false);
    videoStartTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        const newValue = prev - 1;
        
        // Check if we need to switch videos (every 15 seconds)
        const elapsedTime = totalDurationSeconds - newValue;
        const currentSegment = Math.floor(elapsedTime / SEGMENT_DURATION);
        
        if (currentSegment > currentVideoIndex && currentSegment < videos.length) {
          setCurrentVideoIndex(currentSegment);
          videoStartTimeRef.current = Date.now();
        }
        
        if (newValue <= 0) {
          setCanClose(true);
          setShowRewardMessage(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        
        return newValue;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, totalDurationSeconds, videos.length]);

  const handleClose = useCallback(() => {
    if (canClose) {
      onComplete();
      onClose();
    }
  }, [canClose, onComplete, onClose]);

  const handleBackdropClick = useCallback((e: Event) => {
    e.preventDefault();
    // Cannot close by clicking backdrop until countdown finishes
  }, []);

  const currentVideo = videos[currentVideoIndex];
  const embedUrl = currentVideo ? getEmbedUrl(currentVideo) : '';

  // Text translations
  const texts = {
    hu: {
      watching: 'Videó megtekintése...',
      rewardGranted: 'Gratulálunk! Jutalmad jóváírva!',
      close: 'Bezárok',
      secondsRemaining: 'mp',
    },
    en: {
      watching: 'Watching video...',
      rewardGranted: 'Congratulations! Your reward has been credited!',
      close: 'Close',
      secondsRemaining: 's',
    },
  };

  const t_local = texts[lang as 'hu' | 'en'] || texts.en;

  if (!isOpen || videos.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[90vw] md:max-w-[600px] p-0 bg-black border-none overflow-hidden !z-[999999]"
        overlayClassName="!z-[999998]"
        style={{ zIndex: 999999 }}
        onPointerDownOutside={handleBackdropClick}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Video Ad</DialogTitle>
        <DialogDescription className="sr-only">Watch video to earn rewards</DialogDescription>
        <div className="relative w-full aspect-[9/16] md:aspect-video bg-black">
          {/* Video iframe */}
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            frameBorder="0"
          />
          
          {/* Countdown overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            {/* Countdown timer */}
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              <span className="text-white font-bold text-sm">
                {countdown}{t_local.secondsRemaining}
              </span>
            </div>
            
            {/* Close button - only visible after countdown */}
            {canClose && (
              <button
                onClick={handleClose}
                className="pointer-events-auto bg-black/70 backdrop-blur-sm rounded-full p-2 hover:bg-black/90 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Video indicator (for multi-video sequences) */}
          {videos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {videos.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentVideoIndex 
                      ? 'bg-primary w-6' 
                      : idx < currentVideoIndex 
                        ? 'bg-green-500' 
                        : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Simple close overlay when done - no reward text */}
          {showRewardMessage && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in">
              <button
                onClick={handleClose}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-full transition-colors text-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAdModal;
