import { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle, ExternalLink, Play } from 'lucide-react';
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
  doubledAmount?: number;
}

interface VideoData {
  id: string;
  video_url: string;
  embed_url: string | null;
  platform: string;
  duration_seconds: number | null;
  creator_name?: string;
}

const SEGMENT_DURATION = 15;

// Instagram doesn't reliably support autoplay - needs tap to play
const NEEDS_TAP_TO_PLAY = ['instagram'];

/**
 * VideoAdModal - Platform-independent fullscreen video ad player
 * 
 * IMPORTANT: This component does NOT modify the embedUrl.
 * The backend provides the embed URL with all necessary autoplay/mute params.
 * 
 * Same behavior on ALL platforms:
 * - Full screen (100vw × 100vh) with black background  
 * - Autoplay muted (params set by backend)
 * - Same countdown overlay (15 or 30 seconds)
 * - NO platform-specific feed UI visible
 */
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
  const [isPlaying, setIsPlaying] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastShownRef = useRef(false);

  const texts = {
    hu: {
      seconds: 'mp',
      noVideo: 'Nincs elérhető videó',
      close: 'Bezárás',
      goToCreator: 'Tovább az alkotóhoz',
      tapToPlay: 'Koppints a lejátszáshoz',
    },
    en: {
      seconds: 's',
      noVideo: 'No video available',
      close: 'Close',
      goToCreator: 'Go to creator',
      tapToPlay: 'Tap to play',
    },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  const currentVideo = videos[currentVideoIndex];
  const currentPlatform = currentVideo?.platform?.toLowerCase() || '';
  const needsTapToPlay = NEEDS_TAP_TO_PLAY.includes(currentPlatform);

  // Show reward toast
  const showRewardToast = useCallback(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;

    if (context === 'refill') {
      toast.success(
        lang === 'hu'
          ? 'Jutalmad jóváíródott: 500 arany és 5 élet!'
          : 'Reward credited: 500 gold and 5 lives!',
        { duration: 4000, position: 'top-center' }
      );
    } else if (doubledAmount) {
      toast.success(
        lang === 'hu'
          ? `Duplázott jutalmad: ${doubledAmount} arany!`
          : `Doubled reward: ${doubledAmount} gold!`,
        { duration: 4000, position: 'top-center' }
      );
    } else {
      toast.success(
        lang === 'hu'
          ? 'Jutalmad duplázódott!'
          : 'Your reward has been doubled!',
        { duration: 4000, position: 'top-center' }
      );
    }
  }, [context, lang, doubledAmount]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(totalDurationSeconds);
      setCurrentVideoIndex(0);
      setCanClose(false);
      setVideoError(false);
      toastShownRef.current = false;
      // Auto-start for platforms that support autoplay
      setIsPlaying(!needsTapToPlay);
      
      // Log for debugging
      if (currentVideo) {
        console.log('[VideoAdModal] Platform:', currentVideo.platform);
        console.log('[VideoAdModal] Using embed_url:', currentVideo.embed_url);
      }
    }
  }, [isOpen, totalDurationSeconds, needsTapToPlay, currentVideo]);

  // Start countdown function
  const startCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const duration = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setCountdown(remaining);

      // Switch videos every SEGMENT_DURATION seconds
      const currentSegment = Math.floor(elapsed / SEGMENT_DURATION);
      if (currentSegment < videos.length) {
        setCurrentVideoIndex(currentSegment);
      }

      if (remaining <= 0) {
        setCanClose(true);
        showRewardToast();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 100);
  }, [totalDurationSeconds, videos.length, showRewardToast]);

  // Countdown timer - only starts when isPlaying is true
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    startCountdown();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, isPlaying, startCountdown]);

  // Handle tap to play (for Instagram)
  const handleTapToPlay = useCallback(() => {
    console.log('[VideoAdModal] Tap to play triggered');
    setIsPlaying(true);
  }, []);

  // Handle close - user must click X button
  const handleClose = useCallback(() => {
    if (!canClose) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    onComplete();
  }, [canClose, onComplete]);

  // Handle force close (error state)
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
    if (currentVideo?.video_url) {
      window.open(currentVideo.video_url, '_blank', 'noopener,noreferrer');
    }
  }, [currentVideo]);

  if (!isOpen) return null;

  // Use embed_url DIRECTLY from backend - DO NOT modify it
  const embedUrl = currentVideo?.embed_url || '';
  const hasVideo = embedUrl.length > 0;

  return (
    <div 
      className="fixed inset-0 z-[9999]"
      style={{
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
        height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        backgroundColor: '#000',
      }}
    >
      {/* Video iframe - FULLSCREEN, uses backend embed_url directly */}
      {hasVideo && !videoError ? (
        <>
          <iframe
            src={embedUrl}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '100vw',
              height: '100dvh',
              minWidth: '100vw',
              minHeight: '100dvh',
              border: 'none',
              backgroundColor: '#000',
            }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
            allowFullScreen
            onError={() => setVideoError(true)}
          />
          
          {/* Tap to play overlay for platforms without autoplay (Instagram) */}
          {!isPlaying && needsTapToPlay && (
            <div 
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 cursor-pointer"
              onClick={handleTapToPlay}
            >
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 hover:bg-white/30 transition-colors">
                <Play className="w-12 h-12 text-white ml-2" fill="white" />
              </div>
              <p className="text-white text-lg font-medium">{t.tapToPlay}</p>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
          <AlertTriangle className="w-16 h-16 text-yellow-500" />
          <p className="text-lg font-medium">{t.noVideo}</p>
          <button
            onClick={handleForceClose}
            className="px-6 py-3 bg-primary text-white rounded-full font-bold text-base hover:bg-primary/90 active:scale-95 transition-all"
          >
            {t.close}
          </button>
        </div>
      )}

      {/* Countdown timer overlay - top left (only show when playing) */}
      {isPlaying && (
        <div 
          className="absolute z-10"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '16px',
          }}
        >
          <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 min-w-[60px] text-center">
            <span className="text-white font-bold text-xl tabular-nums">
              {Math.max(0, countdown)}{t.seconds}
            </span>
          </div>
        </div>
      )}

      {/* Video progress indicator (if multiple videos) */}
      {videos.length > 1 && isPlaying && (
        <div 
          className="absolute z-10 flex gap-1"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {videos.map((_, idx) => (
            <div
              key={idx}
              className={`w-8 h-1 rounded-full transition-colors ${
                idx === currentVideoIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Close button - top right, only visible after timer completed */}
      {canClose && (
        <button
          onClick={handleClose}
          className="absolute z-10 bg-black/70 backdrop-blur-sm rounded-full p-3 hover:bg-black/90 transition-colors active:scale-95"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: '16px',
          }}
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Go to creator CTA - bottom center, only visible after timer completed */}
      {canClose && currentVideo?.video_url && (
        <button
          onClick={handleGoToCreator}
          className="absolute left-1/2 -translate-x-1/2 z-10 bg-primary hover:bg-primary/90 rounded-full px-6 py-3 flex items-center gap-2 transition-colors active:scale-95"
          style={{ 
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          }}
        >
          <span className="text-white font-semibold">{t.goToCreator}</span>
          <ExternalLink className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  );
};

export default VideoAdModal;
