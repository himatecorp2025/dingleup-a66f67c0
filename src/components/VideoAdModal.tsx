import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink, Play } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import dingleupLogo from '@/assets/dingleup-logo-loading.png';

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

// === BOX DIMENSIONS ===
const BOX_WIDTH_VW = 100;  // box width (vw) - fullscreen
const BOX_HEIGHT_VH = 100; // box height (vh) - fullscreen

// === TUNING CONSTANTS - iframe oversize relative to BOX ===
const IFRAME_W_PERCENT = 110;  // iframe width as % of box width
const IFRAME_H_PERCENT = 135;  // iframe height as % of box height
const SHIFT_DOWN_PERCENT = 12; // shift DOWN as % of box height (to hide bottom platform bar)

const SEGMENT_DURATION = 15;   // seconds per video segment
const LOAD_TIMEOUT_MS = 2500;  // show fallback if iframe doesn't load in this time
const TRANSITION_OVERLAY_MS = 300; // brand overlay duration between segments

// Instagram doesn't reliably support autoplay - needs tap to play
const NEEDS_TAP_TO_PLAY = ['instagram'];

/**
 * Check if URL is a real embed/player URL (not a regular page URL)
 */
const isEmbeddable = (url: string, platform: string): boolean => {
  if (!url) return false;
  
  const p = platform.toLowerCase();
  
  switch (p) {
    case 'youtube':
      return url.includes('youtube.com/embed/');
    case 'tiktok':
      return url.includes('tiktok.com/embed');
    case 'instagram':
      return url.includes('/embed');
    case 'facebook':
      return url.includes('facebook.com/plugins/video.php');
    default:
      return false;
  }
};

/**
 * Build embed URL with autoplay parameters per platform
 * Returns empty string if URL is not embeddable
 */
const buildEmbedUrl = (url: string, platform: string): string => {
  if (!url) return '';
  
  // Only process if it's a real embed URL
  if (!isEmbeddable(url, platform)) {
    logger.log('[VideoAdModal] URL is not embeddable:', url);
    return '';
  }
  
  try {
    const urlObj = new URL(url);
    const p = platform.toLowerCase();
    
    // Common autoplay params
    urlObj.searchParams.set('autoplay', '1');
    urlObj.searchParams.set('playsinline', '1');
    
    // Platform-specific params
    switch (p) {
      case 'youtube':
        urlObj.searchParams.set('mute', '1');
        urlObj.searchParams.set('controls', '0');
        urlObj.searchParams.set('rel', '0');
        urlObj.searchParams.set('modestbranding', '1');
        break;
      case 'tiktok':
        urlObj.searchParams.set('mute', '1');
        break;
      case 'instagram':
        urlObj.searchParams.set('muted', '1');
        break;
      case 'facebook':
        urlObj.searchParams.set('mute', '1');
        break;
      default:
        urlObj.searchParams.set('muted', '1');
    }
    
    return urlObj.toString();
  } catch {
    logger.log('[VideoAdModal] Failed to parse URL:', url);
    return '';
  }
};

/**
 * VideoAdModal - Platform-independent video ad player in centered box
 * 
 * Features:
 * - Centered box (90vw × 80vh) on black fullscreen background
 * - Hides platform bottom info bar via oversized iframe + crop + shift down
 * - Autoplay with muted + playsinline for iOS compatibility
 * - Single countdown timer (30s for 2 videos, switches at 15s)
 * - Brand overlay between segment transitions (300ms)
 * - Fallback screen with DingleUP logo if iframe fails/blocks
 * - Reward credited only when user closes modal
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
  const [showFallback, setShowFallback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardShownRef = useRef(false);
  const lastVideoIndexRef = useRef(0);

  const texts = {
    hu: {
      seconds: 'mp',
      goToCreator: 'Tovább az alkotóhoz',
      tapToPlay: 'Koppints a lejátszáshoz',
    },
    en: {
      seconds: 's',
      goToCreator: 'Go to creator',
      tapToPlay: 'Tap to play',
    },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  // Build playlist - if only 1 video but need 2, duplicate it
  const playlist = videos.length >= 2 
    ? videos.slice(0, 2) 
    : videos.length === 1 
      ? (totalDurationSeconds >= 30 ? [videos[0], videos[0]] : [videos[0]])
      : [];

  const currentVideo = playlist[currentVideoIndex];
  const currentPlatform = currentVideo?.platform?.toLowerCase() || '';
  const needsTapToPlay = NEEDS_TAP_TO_PLAY.includes(currentPlatform);
  
  // Check if current video has a valid embeddable URL
  const embedUrl = currentVideo?.embed_url 
    ? buildEmbedUrl(currentVideo.embed_url, currentVideo.platform) 
    : '';
  const hasEmbeddableVideo = playlist.length > 0 && embedUrl !== '';

  // Lock body scroll and prevent touch
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;
      const originalTouchAction = document.body.style.touchAction;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.touchAction = originalTouchAction;
        document.documentElement.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const duration = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
      setCountdown(duration);
      setCurrentVideoIndex(0);
      setCanClose(false);
      setShowFallback(false);
      setIsLoaded(false);
      setShowTransitionOverlay(false);
      setShowEndScreen(false);
      rewardShownRef.current = false;
      lastVideoIndexRef.current = 0;
      setIsPlaying(!needsTapToPlay);
      
      // Start load timeout - show fallback if iframe doesn't load
      loadTimeoutRef.current = setTimeout(() => {
        if (!isLoaded) {
          logger.log('[VideoAdModal] Load timeout - showing fallback');
          setShowFallback(true);
        }
      }, LOAD_TIMEOUT_MS);
      
      logger.log('[VideoAdModal] Opened with', playlist.length, 'videos, duration:', duration);
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [isOpen, totalDurationSeconds, needsTapToPlay, playlist.length]);

  // Main countdown timer - single timer for entire duration
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const duration = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - Math.floor(elapsed));
      
      setCountdown(remaining);

      // Switch videos at 15s mark if we have 2 videos (30s total)
      if (playlist.length >= 2 && duration >= 30) {
        const newIndex = elapsed >= SEGMENT_DURATION ? 1 : 0;
        
        // Show transition overlay when switching videos
        if (newIndex !== lastVideoIndexRef.current) {
          lastVideoIndexRef.current = newIndex;
          setShowTransitionOverlay(true);
          setTimeout(() => {
            setCurrentVideoIndex(newIndex);
            setShowTransitionOverlay(false);
          }, TRANSITION_OVERLAY_MS);
        }
      }

      // Show end screen in last 2 seconds to prevent "recommended videos"
      if (remaining <= 2 && remaining > 0 && !showEndScreen) {
        setShowEndScreen(true);
      }

      // Timer finished
      if (remaining <= 0) {
        setCanClose(true);
        setShowEndScreen(true);
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
  }, [isOpen, isPlaying, totalDurationSeconds, playlist.length, showEndScreen]);

  // Handle tap to play (for Instagram)
  const handleTapToPlay = useCallback(() => {
    logger.log('[VideoAdModal] Tap to play triggered');
    setIsPlaying(true);
  }, []);

  // Handle iframe load success
  const handleIframeLoad = useCallback(() => {
    setIsLoaded(true);
    setShowFallback(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    logger.log('[VideoAdModal] Iframe loaded successfully');
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    logger.log('[VideoAdModal] Iframe error - showing fallback');
    setShowFallback(true);
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
    
    onComplete();
  }, [canClose, onComplete, context, lang, doubledAmount]);

  // Handle go to creator
  const handleGoToCreator = useCallback(() => {
    const video = playlist[currentVideoIndex];
    if (video?.video_url) {
      window.open(video.video_url, '_blank', 'noopener,noreferrer');
    }
  }, [playlist, currentVideoIndex]);

  if (!isOpen) return null;

  // Determine if we should show the iframe or fallback/end screen
  const shouldShowIframe = hasEmbeddableVideo && !showFallback && !showEndScreen && !showTransitionOverlay;

  // Calculate iframe dimensions relative to box
  const iframeWidth = `${(IFRAME_W_PERCENT / 100) * BOX_WIDTH_VW}vw`;
  const iframeHeight = `${(IFRAME_H_PERCENT / 100) * BOX_HEIGHT_VH}vh`;
  const shiftDown = `${(SHIFT_DOWN_PERCENT / 100) * BOX_HEIGHT_VH}vh`;

  return (
    // ROOT: True fullscreen with black background, covers everything
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ 
        width: '100dvw', 
        height: '100dvh',
        backgroundColor: '#000000',
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none',
        zIndex: 999999,
      }}
    >
      {/* CENTERED BOX - 90vw × 80vh */}
      <div 
        className="relative overflow-hidden"
        style={{
          width: `${BOX_WIDTH_VW}vw`,
          height: `${BOX_HEIGHT_VH}vh`,
          backgroundColor: '#000000',
          borderRadius: '8px',
        }}
      >
        {/* Video content area */}
        {shouldShowIframe ? (
          <>
            {/* OVERSIZED IFRAME - shifted DOWN to hide bottom platform info */}
            <iframe
              key={`${currentVideo?.id}-${currentVideoIndex}`}
              src={embedUrl}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="absolute border-0 pointer-events-none"
              style={{
                width: iframeWidth,
                height: iframeHeight,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateY(${shiftDown})`,
                backgroundColor: '#000000',
              }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
            
            {/* Loading indicator - while iframe loads */}
            {!isLoaded && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ backgroundColor: '#000000', zIndex: 20 }}
              >
                <img 
                  src={dingleupLogo} 
                  alt="DingleUP" 
                  className="animate-pulse"
                  style={{ width: 'min(160px, 40vw)', height: 'auto' }}
                />
              </div>
            )}
            
            {/* Tap to play overlay for Instagram */}
            {!isPlaying && needsTapToPlay && (
              <div 
                onClick={handleTapToPlay}
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 25 }}
              >
                <div 
                  className="flex items-center justify-center rounded-full mb-4"
                  style={{ width: '80px', height: '80px', backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Play style={{ width: '40px', height: '40px', color: '#fff', marginLeft: '6px' }} fill="#fff" />
                </div>
                <p style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>{t.tapToPlay}</p>
              </div>
            )}
          </>
        ) : (
          // Fallback / Transition / End screen - DingleUP logo on black
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ backgroundColor: '#000000', zIndex: 20 }}
          >
            <img 
              src={dingleupLogo} 
              alt="DingleUP" 
              className={canClose ? '' : 'animate-pulse'}
              style={{ width: 'min(160px, 40vw)', height: 'auto' }}
            />
            
            {/* Go to creator button - always visible on fallback */}
            {currentVideo?.video_url && canClose && (
              <button
                onClick={handleGoToCreator}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full"
                style={{
                  backgroundColor: 'hsl(var(--primary))',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{t.goToCreator}</span>
                <ExternalLink style={{ width: '14px', height: '14px', color: '#fff' }} />
              </button>
            )}
          </div>
        )}

        {/* Countdown timer - top left of box */}
        {isPlaying && (
          <div 
            className="absolute"
            style={{ 
              top: '12px',
              left: '12px',
              zIndex: 60,
            }}
          >
            <div 
              className="flex items-center justify-center rounded-full"
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(0,0,0,0.85)',
                border: '2px solid rgba(255,255,255,0.4)',
                fontWeight: 900,
                fontSize: '20px',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              }}
            >
              {countdown}
            </div>
          </div>
        )}

        {/* Video progress dots - top center (only if 2 videos) */}
        {playlist.length > 1 && isPlaying && !showEndScreen && (
          <div 
            className="absolute flex gap-2"
            style={{ 
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 60,
            }}
          >
            {playlist.map((_, idx) => (
              <div
                key={idx}
                className="transition-all duration-300"
                style={{
                  width: idx === currentVideoIndex ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx <= currentVideoIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}

        {/* Close button - top right of box, only after timer ends */}
        {canClose && (
          <button
            onClick={handleClose}
            className="absolute"
            style={{
              top: '12px',
              right: '12px',
              zIndex: 60,
              width: '44px',
              height: '44px',
              backgroundColor: 'rgba(0,0,0,0.85)',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Go to creator CTA - bottom left of box (always visible while playing) */}
        {isPlaying && currentVideo?.video_url && !showFallback && (
          <button
            onClick={handleGoToCreator}
            className="absolute flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ 
              bottom: '12px',
              left: '12px',
              zIndex: 60,
              backgroundColor: 'rgba(0,0,0,0.75)',
              border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}
          >
            <ExternalLink style={{ width: '14px', height: '14px', color: '#fff' }} />
            <span style={{ color: '#fff', fontWeight: 500, fontSize: '12px' }}>{t.goToCreator}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoAdModal;
