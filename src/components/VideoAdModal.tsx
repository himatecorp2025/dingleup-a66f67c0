import { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle, ExternalLink, Play } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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
 * Features:
 * - True fullscreen (covers entire device screen including safe areas)
 * - Hides platform UI (TikTok likes, comments, profile) with overlay masks
 * - Matte black background for non-16:9 videos
 * - Countdown timer starts immediately (or on tap for Instagram)
 * - Reward credited ONLY when user clicks X after countdown
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
  const rewardShownRef = useRef(false);

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
      rewardShownRef.current = false;
      // Auto-start for platforms that support autoplay
      setIsPlaying(!needsTapToPlay);
      
      // Log for debugging
      if (currentVideo) {
        logger.log('[VideoAdModal] Platform:', currentVideo.platform);
        logger.log('[VideoAdModal] Using embed_url:', currentVideo.embed_url);
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
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 100);
  }, [totalDurationSeconds, videos.length]);

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
    logger.log('[VideoAdModal] Tap to play triggered');
    setIsPlaying(true);
  }, []);

  // Handle close - ONLY HERE does the reward get credited
  const handleClose = useCallback(() => {
    if (!canClose) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Show reward toast ONLY when closing
    if (!rewardShownRef.current) {
      rewardShownRef.current = true;
      
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
    }
    
    // Now trigger the completion callback which credits the reward
    onComplete();
  }, [canClose, onComplete, context, lang, doubledAmount]);

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
    <div className="fixed inset-0 w-screen h-[100dvh] bg-black overflow-hidden z-[9999]">
      {/* Video iframe - FULLSCREEN */}
      {hasVideo && !videoError ? (
        <>
          {/* Crop container - clips overflow to hide platform UI */}
          <div className="absolute inset-0 overflow-hidden bg-black">
            {/* Cropping window - fullscreen */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
              style={{
                width: '100vw',
                height: '100dvh',
              }}
            >
              {/* Oversized iframe shifted DOWN to hide bottom info bar */}
              <iframe
                key={embedUrl}
                src={embedUrl}
                className="absolute left-1/2 border-0 pointer-events-none"
                style={{
                  width: '110vw',
                  height: '115dvh',
                  top: '50%',
                  transform: 'translateX(-50%) translateY(10vh)',
                  backgroundColor: '#000',
                }}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="origin-when-cross-origin"
                onError={() => setVideoError(true)}
              />
            </div>
          </div>
          
          {/* TOP MASK - hides TikTok/IG top bar with profile info */}
          <div 
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{
              top: 0,
              height: 'calc(env(safe-area-inset-top, 0px) + 80px)',
              background: 'linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)',
            }}
          />
          
          {/* BOTTOM MASK - hides TikTok/IG bottom bar with "View on TikTok" etc */}
          <div 
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{
              bottom: 0,
              height: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
              background: 'linear-gradient(to top, #000 0%, #000 70%, transparent 100%)',
            }}
          />
          
          {/* RIGHT MASK - hides TikTok like/comment/share buttons */}
          <div 
            className="absolute top-0 bottom-0 z-10 pointer-events-none"
            style={{
              right: 0,
              width: '80px',
              background: 'linear-gradient(to left, #000 0%, #000 50%, transparent 100%)',
            }}
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
          className="absolute z-20"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '16px',
          }}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-full px-5 py-2.5 min-w-[70px] text-center shadow-lg">
            <span className="text-white font-bold text-2xl tabular-nums">
              {Math.max(0, countdown)}{t.seconds}
            </span>
          </div>
        </div>
      )}

      {/* Video progress indicator (if multiple videos) */}
      {videos.length > 1 && isPlaying && (
        <div 
          className="absolute z-20 flex gap-1"
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
          className="absolute z-20 bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors active:scale-95 shadow-lg"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: '16px',
          }}
        >
          <X className="w-7 h-7 text-white" />
        </button>
      )}

      {/* Go to creator CTA - bottom center, only visible after timer completed */}
      {canClose && currentVideo?.video_url && (
        <button
          onClick={handleGoToCreator}
          className="absolute left-1/2 -translate-x-1/2 z-20 bg-primary hover:bg-primary/90 rounded-full px-6 py-3 flex items-center gap-2 transition-colors active:scale-95 shadow-lg"
          style={{ 
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
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
