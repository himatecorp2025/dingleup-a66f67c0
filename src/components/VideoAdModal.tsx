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

  // Check if URL is a proper embed URL (not just a shortlink)
  const isValidEmbedUrl = (url: string | null): boolean => {
    if (!url) return false;
    // Valid embed URLs contain /embed/, /embed/v2/, or plugins/video
    return url.includes('/embed/') || url.includes('/embed') || url.includes('plugins/video');
  };

  // Get embed URL for platform
  const getEmbedUrl = (video: VideoData): string => {
    // Only use stored embed_url if it's a proper embed URL (not a shortlink)
    if (video.embed_url && isValidEmbedUrl(video.embed_url)) {
      console.log('[VideoAdModal] Using stored embed_url:', video.embed_url);
      return video.embed_url;
    }
    
    const url = video.video_url;
    console.log('[VideoAdModal] Generating embed URL from video_url:', url, 'platform:', video.platform);
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId: string | undefined;
      
      // YouTube Shorts
      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) videoId = shortsMatch[1];
      
      // Standard watch URL
      if (!videoId) {
        const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) videoId = watchMatch[1];
      }
      
      // Short URL (youtu.be)
      if (!videoId) {
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) videoId = shortMatch[1];
      }
      
      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1`;
        console.log('[VideoAdModal] Generated YouTube embed:', embedUrl);
        return embedUrl;
      }
    }
    
    // TikTok - shortlinks (vm.tiktok.com) cannot be embedded, need full URL with video ID
    if (url.includes('tiktok.com')) {
      // Try to extract video ID from full URL format
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        const embedUrl = `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`;
        console.log('[VideoAdModal] Generated TikTok embed:', embedUrl);
        return embedUrl;
      }
      
      // TikTok shortlinks (vm.tiktok.com/XXX) cannot be embedded directly
      // They need to be resolved to get the actual video ID
      // For now, show an error state for shortlinks
      console.warn('[VideoAdModal] TikTok shortlink detected - cannot embed:', url);
      return ''; // Return empty to trigger error state
    }
    
    // Instagram
    if (url.includes('instagram.com')) {
      const reelMatch = url.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/);
      if (reelMatch) {
        const embedUrl = `https://www.instagram.com/${reelMatch[1]}/${reelMatch[2]}/embed/`;
        console.log('[VideoAdModal] Generated Instagram embed:', embedUrl);
        return embedUrl;
      }
    }
    
    // Facebook
    if (url.includes('facebook.com')) {
      const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
      console.log('[VideoAdModal] Generated Facebook embed:', embedUrl);
      return embedUrl;
    }
    
    console.warn('[VideoAdModal] Unknown platform, returning original URL:', url);
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
  const hasVideos = videos.length > 0 && embedUrl && embedUrl.length > 0;
  
  // Debug logging
  console.log('[VideoAdModal] Render state:', {
    isOpen,
    videosCount: videos.length,
    currentVideoIndex,
    currentVideo: currentVideo ? { id: currentVideo.id, platform: currentVideo.platform, video_url: currentVideo.video_url, embed_url: currentVideo.embed_url } : null,
    generatedEmbedUrl: embedUrl,
    hasVideos,
    videoError,
  });

  // Text translations
  const texts = {
    hu: {
      secondsRemaining: 'mp',
      noVideo: 'Nincs elérhető videó',
      closeEarly: 'Bezárás',
      tiktokShortlink: 'A TikTok videó nem tölthető be közvetlenül. Kérjük, próbáld újra később!',
    },
    en: {
      secondsRemaining: 's',
      noVideo: 'No video available',
      closeEarly: 'Close',
      tiktokShortlink: 'TikTok video cannot be loaded directly. Please try again later!',
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
