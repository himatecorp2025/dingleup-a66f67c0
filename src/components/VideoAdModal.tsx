import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Film, AlertTriangle, ExternalLink } from 'lucide-react';
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
  doubledAmount?: number; // The doubled coin amount to show in toast
}

interface VideoData {
  id: string;
  video_url: string;
  embed_url: string | null;
  platform: string;
  duration_seconds: number | null;
  creator_name?: string;
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
  doubledAmount,
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
    return url.includes('/embed/') || url.includes('/embed') || url.includes('plugins/video');
  };

  // Get embed URL for platform
  const getEmbedUrl = (video: VideoData): string => {
    if (video.embed_url && isValidEmbedUrl(video.embed_url)) {
      console.log('[VideoAdModal] Using stored embed_url:', video.embed_url);
      return video.embed_url;
    }
    
    const url = video.video_url;
    console.log('[VideoAdModal] Generating embed URL from video_url:', url, 'platform:', video.platform);
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId: string | undefined;
      
      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) videoId = shortsMatch[1];
      
      if (!videoId) {
        const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) videoId = watchMatch[1];
      }
      
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
    
    // TikTok - add autoplay parameter
    if (url.includes('tiktok.com')) {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        const embedUrl = `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}?autoplay=1`;
        console.log('[VideoAdModal] Generated TikTok embed:', embedUrl);
        return embedUrl;
      }
      console.warn('[VideoAdModal] TikTok shortlink detected - cannot embed:', url);
      return '';
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

  // Show toast when countdown ends - NO AUTO CLOSE
  const showRewardToast = useCallback(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;

    if (context === 'refill') {
      toast.success(
        lang === 'hu'
          ? 'Jutalmad jóváíródott, 500 arany és 5 élet!'
          : 'Reward credited: 500 gold and 5 lives!',
        { duration: 4000, position: 'top-center' }
      );
    } else if (doubledAmount) {
      // Show the actual doubled amount for daily_gift and game_end
      toast.success(
        lang === 'hu'
          ? `Duplázott jutalmad: ${doubledAmount} arany! Gratulálok!`
          : `Your doubled reward: ${doubledAmount} gold! Congratulations!`,
        { duration: 4000, position: 'top-center' }
      );
    } else {
      toast.success(
        lang === 'hu'
          ? 'Jutalmad Duplázódott! Gratulálok!'
          : 'Your reward has been doubled! Congratulations!',
        { duration: 4000, position: 'top-center' }
      );
    }
  }, [context, lang, doubledAmount]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Start countdown timer - NEVER auto-close
  useEffect(() => {
    if (!isOpen) return;

    const initialCountdown = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
    setCountdown(initialCountdown);
    countdownRef.current = initialCountdown;
    setCurrentVideoIndex(0);
    setCanClose(false);
    setVideoError(false);
    toastShownRef.current = false;
    videoStartTimeRef.current = Date.now();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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
        // ONLY enable close button - DO NOT auto-close or trigger any other action
        setCanClose(true);
        showRewardToast();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // CRITICAL: Do NOT call onComplete or onClose here
        // User MUST click the X button to close
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, totalDurationSeconds, videos.length, showRewardToast]);

  // Handle close - ONLY when user clicks X button
  // Only calls onComplete (which handles reward), onClose is just for UI cleanup
  const handleClose = useCallback(() => {
    if (canClose) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Call onComplete to process reward, then close UI
      onComplete();
    }
  }, [canClose, onComplete]);

  const handleForceClose = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onCancel();
    onClose();
  }, [onCancel, onClose]);

  // Handle go to creator
  const handleGoToCreator = useCallback(() => {
    const currentVideo = videos[currentVideoIndex];
    if (currentVideo?.video_url) {
      window.open(currentVideo.video_url, '_blank', 'noopener,noreferrer');
    }
  }, [videos, currentVideoIndex]);

  const currentVideo = videos[currentVideoIndex];
  const embedUrl = currentVideo ? getEmbedUrl(currentVideo) : '';
  const hasVideos = videos.length > 0 && embedUrl && embedUrl.length > 0;
  
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
      goToCreator: 'Tovább',
    },
    en: {
      secondsRemaining: 's',
      noVideo: 'No video available',
      closeEarly: 'Close',
      tiktokShortlink: 'TikTok video cannot be loaded directly. Please try again later!',
      goToCreator: 'Go to',
    },
  };

  const t_local = texts[lang as 'hu' | 'en'] || texts.en;

  if (!isOpen) return null;

  // TRUE FULLSCREEN OVERLAY - covers entire device screen
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black"
      style={{
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        width: 'calc(100% + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
        height: 'calc(100% + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        overflow: 'hidden',
      }}
    >
      {/* Video container - fills entire screen with overflow hidden to crop TikTok UI */}
      <div 
        className="relative w-full h-full"
        style={{
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        {/* Video iframe - scaled and shifted up to hide bottom TikTok UI (username, description) but keep right icons */}
        {hasVideos && !videoError ? (
          <iframe
            src={embedUrl}
            style={{
              position: 'absolute',
              top: '40%', // Shift up to hide bottom UI (username, description)
              left: '50%', // Keep centered to show right side icons
              transform: 'translate(-50%, -50%) scale(1.6)', // Scale up to crop bottom
              width: '100vw',
              height: '100dvh',
              border: 'none',
            }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
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

        {/* Platform icon - top right */}
        {currentVideo?.platform && (
          <div 
            className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            {currentVideo.platform === 'tiktok' && (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <path d="M34.1 15.8c-2.2-1.4-3.7-3.8-4-6.6V8h-6v24c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.5 0 1 .1 1.5.2V20c-.5-.1-1-.1-1.5-.1-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12V21.3c2.3 1.6 5 2.5 7.9 2.5v-6c-1.5 0-2.9-.4-4.2-1" fill="currentColor" className="text-cyan-400"/>
              </svg>
            )}
            {currentVideo.platform === 'youtube' && (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8z" fill="#FF0000"/>
                <path d="M9.5 15.5l6.5-3.5-6.5-3.5v7z" fill="#fff"/>
              </svg>
            )}
            {currentVideo.platform === 'instagram' && (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <defs>
                  <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FED576"/>
                    <stop offset="25%" stopColor="#F47133"/>
                    <stop offset="50%" stopColor="#BC3081"/>
                    <stop offset="75%" stopColor="#4C63D2"/>
                  </linearGradient>
                </defs>
                <rect width="20" height="20" x="2" y="2" rx="5" stroke="url(#igGrad)" strokeWidth="2"/>
                <circle cx="12" cy="12" r="4" stroke="url(#igGrad)" strokeWidth="2"/>
                <circle cx="18" cy="6" r="1.5" fill="url(#igGrad)"/>
              </svg>
            )}
            {currentVideo.platform === 'facebook' && (
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path fill="#1877F2" d="M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4C19.6 23 24 18 24 12z"/>
              </svg>
            )}
          </div>
        )}

        {/* Countdown timer overlay - top left */}
        <div 
          className="absolute top-4 left-4 z-10"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="text-white font-bold text-xl tabular-nums">
              {Math.max(0, countdown)}{t_local.secondsRemaining}
            </span>
          </div>
        </div>

        {/* Close button - ONLY visible after timer completed */}
        {canClose && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-sm rounded-full p-3 hover:bg-black/90 transition-colors active:scale-95"
            style={{ 
              top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
              right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
              minWidth: '48px', 
              minHeight: '48px' 
            }}
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Go to creator CTA - bottom left, only visible after timer completed */}
        {canClose && (
          <button
            onClick={handleGoToCreator}
            className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 hover:bg-black/90 transition-colors active:scale-95"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
            <span className="text-white font-medium">{t_local.goToCreator}</span>
            <ExternalLink className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Video indicator (for multi-video sequences) */}
        {videos.length > 1 && hasVideos && (
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
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
    </div>
  );
};

export default VideoAdModal;
