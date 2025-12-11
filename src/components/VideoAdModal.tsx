import { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
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

/**
 * VideoAdModal - Fullscreen video ad player
 * 
 * Requirements:
 * - FULLSCREEN: 100vw × 100vh like TikTok app
 * - AUTOPLAY: Video starts automatically (muted for browser compatibility)
 * - USE BACKEND embedUrl: Don't generate URLs client-side
 * - NO PLATFORM UI: Just the video with countdown overlay
 * - MATTE BLACK background for non-9:16 videos
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
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastShownRef = useRef(false);

  // Text translations
  const texts = {
    hu: {
      seconds: 'mp',
      noVideo: 'Nincs elérhető videó',
      close: 'Bezárás',
      goToCreator: 'Tovább az alkotóhoz',
    },
    en: {
      seconds: 's',
      noVideo: 'No video available',
      close: 'Close',
      goToCreator: 'Go to creator',
    },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  // Get embed URL with autoplay params - USE BACKEND URL DIRECTLY
  const getEmbedUrl = useCallback((video: VideoData): string => {
    // ALWAYS prefer backend-provided embed_url
    let url = video.embed_url || '';
    
    // If no embed_url from backend, we cannot show the video
    if (!url) {
      console.warn('[VideoAdModal] No embed_url from backend for video:', video.id);
      return '';
    }

    console.log('[VideoAdModal] Using backend embed_url:', url);

    // Add autoplay params if not present
    try {
      const urlObj = new URL(url);
      
      // YouTube
      if (url.includes('youtube.com')) {
        if (!urlObj.searchParams.has('autoplay')) urlObj.searchParams.set('autoplay', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        if (!urlObj.searchParams.has('playsinline')) urlObj.searchParams.set('playsinline', '1');
        if (!urlObj.searchParams.has('controls')) urlObj.searchParams.set('controls', '0');
        return urlObj.toString();
      }
      
      // TikTok
      if (url.includes('tiktok.com')) {
        if (!urlObj.searchParams.has('auto_play')) urlObj.searchParams.set('auto_play', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        return urlObj.toString();
      }
      
      // Facebook
      if (url.includes('facebook.com')) {
        if (!urlObj.searchParams.has('autoplay')) urlObj.searchParams.set('autoplay', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        return urlObj.toString();
      }
      
      return url;
    } catch {
      return url;
    }
  }, []);

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

  // Countdown timer using Date.now() for accuracy
  useEffect(() => {
    if (!isOpen) return;

    const duration = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
    setCountdown(duration);
    setCurrentVideoIndex(0);
    setCanClose(false);
    setVideoError(false);
    toastShownRef.current = false;
    startTimeRef.current = Date.now();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setCountdown(remaining);

      // Switch videos every SEGMENT_DURATION seconds
      const currentSegment = Math.floor(elapsed / SEGMENT_DURATION);
      if (currentSegment < videos.length && currentSegment !== currentVideoIndex) {
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

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, totalDurationSeconds, videos.length, showRewardToast]);

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
    const currentVideo = videos[currentVideoIndex];
    if (currentVideo?.video_url) {
      window.open(currentVideo.video_url, '_blank', 'noopener,noreferrer');
    }
  }, [videos, currentVideoIndex]);

  if (!isOpen) return null;

  const currentVideo = videos[currentVideoIndex];
  const embedUrl = currentVideo ? getEmbedUrl(currentVideo) : '';
  const hasVideo = embedUrl.length > 0;

  // TRUE FULLSCREEN OVERLAY - covers entire device screen
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
        backgroundColor: '#000', // Matte black background
      }}
    >
      {/* Video iframe - TRUE FULLSCREEN */}
      {hasVideo && !videoError ? (
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

      {/* Countdown timer overlay - top left */}
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

      {/* Video progress indicator (if multiple videos) */}
      {videos.length > 1 && (
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
