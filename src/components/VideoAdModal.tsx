import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink, Play } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import dingleupLogo from '@/assets/dingleup-logo-loading.png';
import PlatformEmbedFullscreen from './PlatformEmbedFullscreen';

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

const SEGMENT_DURATION = 15; // seconds per video segment

// Instagram doesn't reliably support autoplay - needs tap to play
const NEEDS_TAP_TO_PLAY = ['instagram'];

/**
 * Add autoplay parameters to embed URL
 */
const addAutoplayParams = (url: string, platform: string): string => {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const p = platform.toLowerCase();
    
    // Common autoplay params
    if (!urlObj.searchParams.has('autoplay')) {
      urlObj.searchParams.set('autoplay', '1');
    }
    if (!urlObj.searchParams.has('playsinline')) {
      urlObj.searchParams.set('playsinline', '1');
    }
    
    // Platform-specific mute param
    switch (p) {
      case 'youtube':
        if (!urlObj.searchParams.has('mute')) {
          urlObj.searchParams.set('mute', '1');
        }
        urlObj.searchParams.set('controls', '0');
        urlObj.searchParams.set('rel', '0');
        urlObj.searchParams.set('modestbranding', '1');
        break;
      case 'instagram':
        if (!urlObj.searchParams.has('muted')) {
          urlObj.searchParams.set('muted', '1');
        }
        break;
      default:
        if (!urlObj.searchParams.has('mute')) {
          urlObj.searchParams.set('mute', '1');
        }
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
};

/**
 * VideoAdModal - TRUE FULLSCREEN video ad player
 * 
 * Features:
 * - True fullscreen: 100dvw × 100dvh, black background
 * - Autoplay with mute + playsinline
 * - Single countdown timer (15s or 30s continuous)
 * - Auto-switch to video 2 at 15s mark (for 30s sessions)
 * - Close button only appears when timer reaches 0
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
  const [secondsLeft, setSecondsLeft] = useState<number>(totalDurationSeconds);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const startTsRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardShownRef = useRef(false);

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

  // Calculate total duration and required segments
  const totalDuration = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
  const requiredSegments = totalDuration >= 30 ? 2 : 1;

  // Build playlist based on required segments
  const playlist = (() => {
    if (videos.length === 0) return [];
    if (requiredSegments === 1) return [videos[0]];
    if (requiredSegments === 2) {
      if (videos.length >= 2) return [videos[0], videos[1]];
      return [videos[0], videos[0]]; // Duplicate if only 1 video
    }
    return [videos[0]];
  })();

  const currentVideo = playlist[activeIndex];
  const currentPlatform = currentVideo?.platform?.toLowerCase() || '';
  const needsTapToPlay = NEEDS_TAP_TO_PLAY.includes(currentPlatform);
  
  // Get embed URL with autoplay params
  const embedUrl = currentVideo?.embed_url 
    ? addAutoplayParams(currentVideo.embed_url, currentVideo.platform)
    : '';

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(totalDuration);
      setActiveIndex(0);
      setIsLoaded(false);
      rewardShownRef.current = false;
      setIsPlaying(!needsTapToPlay);
      startTsRef.current = performance.now();
      
      logger.log('[VideoAdModal] Opened - playlist:', playlist.length, 'videos, duration:', totalDuration);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, totalDuration, needsTapToPlay, playlist.length]);

  // Main timer - stable tick using performance.now()
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Use the startTsRef that was set when modal opened
    if (startTsRef.current === 0) {
      startTsRef.current = performance.now();
    }

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSec = Math.floor((now - startTsRef.current) / 1000);
      const remaining = Math.max(0, totalDuration - elapsedSec);
      
      setSecondsLeft(remaining);

      // Auto-switch video at 15s mark for 2-video playlists
      if (playlist.length >= 2 && totalDuration >= 30) {
        const newIndex = elapsedSec >= SEGMENT_DURATION ? 1 : 0;
        setActiveIndex(newIndex);
      }

      // Stop timer when done
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 200); // 200ms tick for stability

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, isPlaying, totalDuration, playlist.length]);

  // Handle tap to play (for Instagram)
  const handleTapToPlay = useCallback(() => {
    logger.log('[VideoAdModal] Tap to play');
    startTsRef.current = performance.now();
    setIsPlaying(true);
  }, []);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoaded(true);
    logger.log('[VideoAdModal] Iframe loaded');
  }, []);

  // Handle close - ONLY HERE does the reward get credited
  const handleClose = useCallback(() => {
    if (secondsLeft > 0) return; // Only allow close when timer is done
    
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
  }, [secondsLeft, onComplete, context, lang, doubledAmount]);

  // Handle go to creator
  const handleGoToCreator = useCallback(() => {
    if (currentVideo?.video_url) {
      window.open(currentVideo.video_url, '_blank', 'noopener,noreferrer');
    }
  }, [currentVideo]);

  if (!isOpen || playlist.length === 0) return null;

  const canClose = secondsLeft === 0;

  return (
    // ROOT: TRUE FULLSCREEN - fixed inset 0, 100dvw × 100dvh
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100dvw', 
        height: '100dvh',
        backgroundColor: '#000000',
        zIndex: 999999,
        overflow: 'hidden',
      }}
    >
      {/* Platform-specific embed - fills entire screen */}
      {currentVideo ? (
        <PlatformEmbedFullscreen
          key={`${currentVideo.id}-${activeIndex}`}
          platform={currentPlatform as 'tiktok' | 'youtube' | 'instagram' | 'facebook'}
          originalUrl={currentVideo.video_url}
          embedUrl={currentVideo.embed_url || undefined}
        />
      ) : (
        // No video - show logo
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
          }}
        >
          <img 
            src={dingleupLogo} 
            alt="DingleUP" 
            style={{ width: 'min(160px, 40vw)', height: 'auto' }}
          />
        </div>
      )}

      {/* Loading overlay removed - PlatformEmbedFullscreen handles its own loading */}

      {/* Tap to play overlay for Instagram */}
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
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 20,
            cursor: 'pointer',
          }}
        >
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Play style={{ width: '40px', height: '40px', color: '#fff', marginLeft: '6px' }} fill="#fff" />
          </div>
          <p style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>{t.tapToPlay}</p>
        </div>
      )}

      {/* Countdown timer - top left */}
      {isPlaying && (
        <div 
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 50,
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '20px',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          {secondsLeft}
        </div>
      )}

      {/* Video progress dots - top center (only if 2 videos) */}
      {playlist.length > 1 && isPlaying && (
        <div 
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex',
            gap: '8px',
          }}
        >
          {playlist.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === activeIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx <= activeIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Close button - top right, ONLY when timer = 0 */}
      {canClose && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 50,
            width: '48px',
            height: '48px',
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
          <X style={{ width: '20px', height: '20px', color: '#fff' }} />
        </button>
      )}

      {/* Go to creator CTA - bottom left */}
      {isPlaying && currentVideo?.video_url && (
        <button
          onClick={handleGoToCreator}
          style={{ 
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <ExternalLink style={{ width: '14px', height: '14px', color: '#fff' }} />
          <span style={{ color: '#fff', fontWeight: 500, fontSize: '12px' }}>{t.goToCreator}</span>
        </button>
      )}
    </div>
  );
};

export default VideoAdModal;
