import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useI18n } from '@/i18n';

export interface FullscreenRewardVideoViewProps {
  isOpen: boolean;
  embedUrl: string;
  durationSeconds: number;
  onCompleted: () => void;
  onClose: () => void;
  videoUrl?: string; // Original URL for "go to creator" link
  platform?: string;
}

/**
 * Fullscreen video player for reward videos.
 * 
 * Requirements:
 * - FULLSCREEN: 100vw × 100vh, covers entire screen including nav bars
 * - AUTOPLAY: Video starts automatically (muted for browser compatibility)
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
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  // Texts
  const texts = {
    hu: { goToCreator: 'Tovább az alkotóhoz', seconds: 'mp' },
    en: { goToCreator: 'Go to creator', seconds: 's' },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  // Add autoplay params to URL if not present
  const getAutoplayUrl = useCallback((url: string): string => {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      
      // YouTube - add autoplay, mute, playsinline
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (!urlObj.searchParams.has('autoplay')) urlObj.searchParams.set('autoplay', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        if (!urlObj.searchParams.has('playsinline')) urlObj.searchParams.set('playsinline', '1');
        if (!urlObj.searchParams.has('controls')) urlObj.searchParams.set('controls', '0');
        return urlObj.toString();
      }
      
      // TikTok - add autoplay param
      if (url.includes('tiktok.com')) {
        // TikTok embed v2 supports auto_play param
        if (!urlObj.searchParams.has('auto_play')) urlObj.searchParams.set('auto_play', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        return urlObj.toString();
      }
      
      // Facebook - add autoplay
      if (url.includes('facebook.com')) {
        if (!urlObj.searchParams.has('autoplay')) urlObj.searchParams.set('autoplay', '1');
        if (!urlObj.searchParams.has('mute')) urlObj.searchParams.set('mute', '1');
        return urlObj.toString();
      }
      
      // Instagram - no autoplay params needed, handled by allow attribute
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

  // Countdown timer using Date.now() for accuracy
  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setCountdown(durationSeconds);
    setCanClose(false);
    completedRef.current = false;
    startTimeRef.current = Date.now();

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

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
    }, 100); // Check more frequently for accuracy

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, durationSeconds]);

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
        // Extend beyond safe areas to cover EVERYTHING
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
            {countdown}{t.seconds}
          </span>
        </div>
      </div>

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
