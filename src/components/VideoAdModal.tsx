import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Film, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';

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
  const { lang } = useI18n();
  const [countdown, setCountdown] = useState<number>(totalDurationSeconds);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoStartTimeRef = useRef<number>(0);
  const toastShownRef = useRef(false);
  const countdownRef = useRef<number>(totalDurationSeconds);

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

  // Show toast when countdown ends
  const showRewardToast = useCallback(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;

    if (context === 'refill') {
      // 30s refill reward
      toast.success(
        lang === 'hu'
          ? 'Jutalmad: 500 arany és 5 élet! Gratulálok!'
          : 'Your reward: 500 gold and 5 lives! Congratulations!',
        { duration: 4000 }
      );
    } else {
      // 15s double reward (daily_gift or game_end)
      toast.success(
        lang === 'hu'
          ? 'Jutalmad Duplázódott! Gratulálok!'
          : 'Your reward has been doubled! Congratulations!',
        { duration: 4000 }
      );
    }
  }, [context, lang]);

  // Start countdown timer
  useEffect(() => {
    if (!isOpen) return;

    // Reset all state
    const initialCountdown = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
    setCountdown(initialCountdown);
    countdownRef.current = initialCountdown;
    setCurrentVideoIndex(0);
    setCanClose(false);
    setVideoError(false);
    toastShownRef.current = false;
    videoStartTimeRef.current = Date.now();

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      countdownRef.current -= 1;
      const newValue = countdownRef.current;
      
      setCountdown(newValue);
      
      // Check if we need to switch videos (every 15 seconds)
      const elapsedTime = initialCountdown - newValue;
      const currentSegment = Math.floor(elapsedTime / SEGMENT_DURATION);
      
      if (currentSegment > 0 && currentSegment < videos.length) {
        setCurrentVideoIndex(prev => {
          if (currentSegment !== prev) {
            videoStartTimeRef.current = Date.now();
            return currentSegment;
          }
          return prev;
        });
      }
      
      if (newValue <= 0) {
        setCanClose(true);
        showRewardToast();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, totalDurationSeconds, videos.length, showRewardToast]);

  const handleClose = useCallback(() => {
    if (canClose) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onComplete();
      onClose();
    }
  }, [canClose, onComplete, onClose]);

  const handleForceClose = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onCancel();
    onClose();
  }, [onCancel, onClose]);

  const handleBackdropClick = useCallback((e: Event) => {
    e.preventDefault();
    // Cannot close by clicking backdrop until countdown finishes
  }, []);

  const currentVideo = videos[currentVideoIndex];
  const embedUrl = currentVideo ? getEmbedUrl(currentVideo) : '';
  const hasVideos = videos.length > 0 && embedUrl;

  // Text translations
  const texts = {
    hu: {
      secondsRemaining: 'mp',
      noVideo: 'Nincs elérhető videó',
      closeEarly: 'Bezárás',
    },
    en: {
      secondsRemaining: 's',
      noVideo: 'No video available',
      closeEarly: 'Close',
    },
  };

  const t_local = texts[lang as 'hu' | 'en'] || texts.en;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[90vw] md:max-w-[600px] p-0 bg-black border-none overflow-hidden"
        overlayClassName="!z-[999998]"
        style={{ zIndex: 999999 }}
        onPointerDownOutside={handleBackdropClick}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Video Ad</DialogTitle>
        <DialogDescription className="sr-only">Watch video to earn rewards</DialogDescription>
        <div className="relative w-full aspect-[9/16] md:aspect-video bg-black min-h-[300px]">
          {/* Video iframe or error state */}
          {hasVideos && !videoError ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              onError={() => setVideoError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
              <AlertTriangle className="w-16 h-16 text-yellow-500" />
              <p className="text-lg font-medium">{t_local.noVideo}</p>
              <button
                onClick={handleForceClose}
                className="px-6 py-3 bg-primary text-white rounded-full font-bold text-base hover:bg-primary/90 active:scale-95 transition-all"
              >
                {t_local.closeEarly}
              </button>
            </div>
          )}
          
          {/* Countdown overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-50">
            {/* Countdown timer */}
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 pointer-events-none">
              <Film className="w-5 h-5 text-primary" />
              <span className="text-white font-bold text-base tabular-nums">
                {Math.max(0, countdown)}{t_local.secondsRemaining}
              </span>
            </div>
            
            {/* Close button - only visible after countdown */}
            {canClose && (
              <button
                onClick={handleClose}
                className="bg-black/70 backdrop-blur-sm rounded-full p-3 hover:bg-black/90 active:scale-95 transition-all touch-manipulation"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          {/* Video indicator (for multi-video sequences) */}
          {videos.length > 1 && hasVideos && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAdModal;
