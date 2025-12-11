import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink, Play } from 'lucide-react';
import { useI18n } from '@/i18n';

export interface FullscreenRewardVideoViewProps {
  isOpen: boolean;
  embedUrl: string;
  durationSeconds: number;
  onCompleted: () => void;
  onClose: () => void;
  videoUrl?: string;
  platform?: 'tiktok' | 'youtube' | 'instagram' | 'facebook' | string;
}

// Instagram doesn't reliably support autoplay - needs tap to play
const NEEDS_TAP_TO_PLAY = ['instagram'];

/**
 * FullscreenRewardVideoView - Platform-independent fullscreen video player
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
export const FullscreenRewardVideoView = ({
  isOpen,
  embedUrl,
  durationSeconds,
  onCompleted,
  onClose,
  videoUrl,
  platform,
}: FullscreenRewardVideoViewProps) => {
  const { lang } = useI18n();
  const [countdown, setCountdown] = useState(durationSeconds);
  const [canClose, setCanClose] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const texts = {
    hu: { goToCreator: 'Tovább az alkotóhoz', seconds: 'mp', tapToPlay: 'Koppints a lejátszáshoz' },
    en: { goToCreator: 'Go to creator', seconds: 's', tapToPlay: 'Tap to play' },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  const normalizedPlatform = platform?.toLowerCase() || '';
  const needsTapToPlay = NEEDS_TAP_TO_PLAY.includes(normalizedPlatform);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Log embedUrl for debugging
      console.log('[FullscreenRewardVideoView] Platform:', platform);
      console.log('[FullscreenRewardVideoView] Using embedUrl:', embedUrl);
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen, embedUrl, platform]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(durationSeconds);
      setCanClose(false);
      completedRef.current = false;
      // Auto-start for platforms that support autoplay
      setIsPlaying(!needsTapToPlay);
    }
  }, [isOpen, durationSeconds, needsTapToPlay]);

  // Start countdown function
  const startCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      
      setCountdown(remaining);

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        setCanClose(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 100);
  }, [durationSeconds]);

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
    console.log('[FullscreenRewardVideoView] Tap to play triggered');
    setIsPlaying(true);
  }, []);

  // Handle close - calls onCompleted for reward processing
  const handleClose = useCallback(() => {
    if (!canClose) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    onCompleted();
    onClose();
  }, [canClose, onCompleted, onClose]);

  // Handle go to creator
  const handleGoToCreator = useCallback(() => {
    if (videoUrl) {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  }, [videoUrl]);

  if (!isOpen || !embedUrl) return null;

  // Use embedUrl DIRECTLY from backend - DO NOT modify it
  // Backend already includes autoplay=1&mute=1 params for each platform

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
      {/* Video iframe - FULLSCREEN, uses backend embedUrl directly */}
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
              {countdown}{t.seconds}
            </span>
          </div>
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
      {canClose && videoUrl && (
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

export default FullscreenRewardVideoView;
