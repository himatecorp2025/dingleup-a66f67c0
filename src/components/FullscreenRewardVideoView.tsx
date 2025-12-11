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
  platform?: string;
}

// Platforms that reliably support autoplay when muted
const AUTOPLAY_PLATFORMS = ['youtube', 'tiktok', 'facebook'];

/**
 * Fullscreen video player for reward videos.
 * 
 * Requirements:
 * - FULLSCREEN: 100vw × 100vh, covers entire screen including nav bars
 * - AUTOPLAY: Video starts automatically for supported platforms (muted)
 * - For Instagram: Show tap-to-play overlay, countdown starts only after tap
 * - NO PLATFORM UI: Just the video, no cards/borders/margins
 * - MATTE BLACK background for non-9:16 videos
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

  // Texts
  const texts = {
    hu: { goToCreator: 'Tovább az alkotóhoz', seconds: 'mp', tapToPlay: 'Koppints a lejátszáshoz' },
    en: { goToCreator: 'Go to creator', seconds: 's', tapToPlay: 'Tap to play' },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  const normalizedPlatform = platform?.toLowerCase() || '';
  const supportsAutoplay = AUTOPLAY_PLATFORMS.includes(normalizedPlatform);

  // Add autoplay params to URL if not present
  const getAutoplayUrl = useCallback((url: string): string => {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (!urlObj.searchParams.has('autoplay')) urlObj.searchParams.set('autoplay', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        if (!urlObj.searchParams.has('playsinline')) urlObj.searchParams.set('playsinline', '1');
        if (!urlObj.searchParams.has('controls')) urlObj.searchParams.set('controls', '0');
        return urlObj.toString();
      }
      
      if (url.includes('tiktok.com')) {
        if (!urlObj.searchParams.has('auto_play')) urlObj.searchParams.set('auto_play', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        return urlObj.toString();
      }
      
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
      setCountdown(durationSeconds);
      setCanClose(false);
      completedRef.current = false;
      // Auto-start for platforms that support autoplay
      setIsPlaying(supportsAutoplay);
    }
  }, [isOpen, durationSeconds, supportsAutoplay]);

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

  // Handle tap to play (for Instagram and other non-autoplay platforms)
  const handleTapToPlay = useCallback(() => {
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

  const finalEmbedUrl = getAutoplayUrl(embedUrl);

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
      {/* Video iframe - TRUE FULLSCREEN */}
      <iframe
        src={finalEmbedUrl}
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

      {/* Tap to play overlay for non-autoplay platforms (Instagram) */}
      {!isPlaying && !supportsAutoplay && (
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
