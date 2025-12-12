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

// === TUNING CONSTANTS - adjust these to hide bottom platform info ===
const CROP_Y_VH = 8;      // How much to push iframe DOWN (positive = down)
const OVERSIZE_W = 110;   // Width percentage (110 = 110vw)
const OVERSIZE_H = 115;   // Height percentage (115 = 115dvh)

// Instagram doesn't reliably support autoplay - needs tap to play
const NEEDS_TAP_TO_PLAY = ['instagram'];

/**
 * Ensures autoplay parameters are added to embed URL
 */
const ensureAutoplayParams = (url: string): string => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    
    // Add autoplay params for various platforms
    if (!urlObj.searchParams.has('autoplay')) {
      urlObj.searchParams.set('autoplay', '1');
    }
    if (!urlObj.searchParams.has('muted') && !urlObj.searchParams.has('mute')) {
      urlObj.searchParams.set('muted', '1');
    }
    if (!urlObj.searchParams.has('playsinline')) {
      urlObj.searchParams.set('playsinline', '1');
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
};

/**
 * VideoAdModal - Platform-independent fullscreen video ad player
 * 
 * Features:
 * - True fullscreen (covers entire device screen)
 * - Hides platform bottom info bar by pushing iframe DOWN
 * - Autoplay with muted + playsinline for iOS compatibility
 * - Countdown timer with reward on close
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
  const [isLoading, setIsLoading] = useState(true);
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
      loading: 'Betöltés...',
    },
    en: {
      seconds: 's',
      noVideo: 'No video available',
      close: 'Close',
      goToCreator: 'Go to creator',
      tapToPlay: 'Tap to play',
      loading: 'Loading...',
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
      setIsLoading(true);
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

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    logger.log('[VideoAdModal] Iframe loaded');
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

  // Build embed URL with autoplay params
  const rawEmbedUrl = currentVideo?.embed_url || '';
  const embedUrl = ensureAutoplayParams(rawEmbedUrl);
  const hasVideo = rawEmbedUrl.length > 0;

  return (
    // ROOT: True fullscreen, black background, no wrapper box
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#000',
        overflow: 'hidden',
        zIndex: 9999,
      }}
    >
      {/* Video content */}
      {hasVideo && !videoError ? (
        <>
          {/* OVERFLOW CONTAINER - clips the oversized iframe */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              backgroundColor: '#000',
            }}
          >
            {/* OVERSIZED IFRAME - pushed DOWN to hide bottom platform info */}
            <iframe
              key={embedUrl}
              src={embedUrl}
              onLoad={handleIframeLoad}
              onError={() => setVideoError(true)}
              style={{
                position: 'absolute',
                // Center horizontally, but with oversized width
                left: `${-(OVERSIZE_W - 100) / 2}vw`,
                // Push DOWN by CROP_Y_VH to hide bottom info bar
                top: `${CROP_Y_VH}vh`,
                width: `${OVERSIZE_W}vw`,
                height: `${OVERSIZE_H}dvh`,
                border: 'none',
                backgroundColor: '#000',
              }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin-when-cross-origin"
            />
          </div>
          
          {/* Loading indicator - shown while iframe loads */}
          {isLoading && (
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000',
                zIndex: 5,
              }}
            >
              <p style={{ color: '#fff', fontSize: '18px' }}>{t.loading}</p>
            </div>
          )}
          
          {/* Tap to play overlay for platforms without autoplay (Instagram) */}
          {!isPlaying && needsTapToPlay && (
            <div 
              onClick={handleTapToPlay}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)',
                cursor: 'pointer',
                zIndex: 20,
              }}
            >
              <div 
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <Play style={{ width: '48px', height: '48px', color: '#fff', marginLeft: '8px' }} fill="#fff" />
              </div>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>{t.tapToPlay}</p>
            </div>
          )}
        </>
      ) : (
        // No video or error state
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            backgroundColor: '#000',
          }}
        >
          <AlertTriangle style={{ width: '64px', height: '64px', color: '#eab308' }} />
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>{t.noVideo}</p>
          <button
            onClick={handleForceClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'hsl(var(--primary))',
              color: '#fff',
              borderRadius: '9999px',
              fontWeight: 'bold',
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.close}
          </button>
        </div>
      )}

      {/* Countdown timer overlay - top left */}
      {isPlaying && (
        <div 
          style={{ 
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '16px',
            zIndex: 30,
          }}
        >
          <div 
            style={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
              borderRadius: '9999px',
              padding: '10px 20px',
              minWidth: '70px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '24px', fontVariantNumeric: 'tabular-nums' }}>
              {Math.max(0, countdown)}{t.seconds}
            </span>
          </div>
        </div>
      )}

      {/* Video progress indicator (if multiple videos) */}
      {videos.length > 1 && isPlaying && (
        <div 
          style={{ 
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            zIndex: 30,
          }}
        >
          {videos.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '32px',
                height: '4px',
                borderRadius: '9999px',
                backgroundColor: idx === currentVideoIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'background-color 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* Close button - top right, only visible after timer completed */}
      {canClose && (
        <button
          onClick={handleClose}
          style={{ 
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: '16px',
            zIndex: 30,
            backgroundColor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            borderRadius: '50%',
            padding: '12px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          }}
        >
          <X style={{ width: '28px', height: '28px', color: '#fff' }} />
        </button>
      )}

      {/* Go to creator CTA - bottom center, only visible after timer completed */}
      {canClose && currentVideo?.video_url && (
        <button
          onClick={handleGoToCreator}
          style={{ 
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            backgroundColor: 'hsl(var(--primary))',
            borderRadius: '9999px',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 600 }}>{t.goToCreator}</span>
          <ExternalLink style={{ width: '16px', height: '16px', color: '#fff' }} />
        </button>
      )}
    </div>
  );
};

export default VideoAdModal;
