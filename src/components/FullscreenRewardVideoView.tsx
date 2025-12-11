import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, ExternalLink } from 'lucide-react';
import { useI18n } from '@/i18n';

export interface RewardVideoData {
  id: string;
  video_url: string;
  embed_url: string | null;
  platform: string;
  creator_name?: string;
}

interface FullscreenRewardVideoViewProps {
  isOpen: boolean;
  video: RewardVideoData;
  requiredSeconds: number;
  onTimerCompleted: () => void;
  onClosed: () => void;
  onGoToCreator?: () => void;
}

export const FullscreenRewardVideoView = ({
  isOpen,
  video,
  requiredSeconds,
  onTimerCompleted,
  onClosed,
  onGoToCreator,
}: FullscreenRewardVideoViewProps) => {
  const { lang } = useI18n();
  const [countdown, setCountdown] = useState(requiredSeconds);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerCompletedCalledRef = useRef(false);

  // Texts
  const texts = {
    hu: {
      goToCreator: 'Tovább',
      tapToPlay: 'Érintsd meg a lejátszáshoz',
    },
    en: {
      goToCreator: 'Go to',
      tapToPlay: 'Tap to play',
    },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  // Check if URL is a proper embed URL (not just a shortlink)
  const isValidEmbedUrl = (url: string | null): boolean => {
    if (!url) return false;
    return url.includes('/embed/') || url.includes('/embed') || url.includes('plugins/video');
  };

  // Get embed URL - prefer stored embed_url, fallback to generating one
  const getEmbedUrl = useCallback((videoData: RewardVideoData): string => {
    // Only use stored embed_url if it's a proper embed URL
    if (videoData.embed_url && isValidEmbedUrl(videoData.embed_url)) {
      console.log('[FullscreenRewardVideoView] Using stored embed_url:', videoData.embed_url);
      return videoData.embed_url;
    }
    
    const url = videoData.video_url;
    const platform = videoData.platform;
    console.log('[FullscreenRewardVideoView] Generating embed URL from:', { url, platform });
    
    // YouTube
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
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
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`;
        console.log('[FullscreenRewardVideoView] Generated YouTube embed:', embedUrl);
        return embedUrl;
      }
    }
    
    // TikTok - shortlinks cannot be embedded
    if (platform === 'tiktok' || url.includes('tiktok.com')) {
      const videoIdMatch = url.match(/\/video\/(\d+)/);
      if (videoIdMatch) {
        const embedUrl = `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`;
        console.log('[FullscreenRewardVideoView] Generated TikTok embed:', embedUrl);
        return embedUrl;
      }
      console.warn('[FullscreenRewardVideoView] TikTok shortlink cannot be embedded:', url);
      return ''; // Cannot embed shortlinks
    }
    
    // Instagram
    if (platform === 'instagram' || url.includes('instagram.com')) {
      const match = url.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const embedUrl = `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
        console.log('[FullscreenRewardVideoView] Generated Instagram embed:', embedUrl);
        return embedUrl;
      }
    }
    
    // Facebook
    if (platform === 'facebook' || url.includes('facebook.com')) {
      const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
      console.log('[FullscreenRewardVideoView] Generated Facebook embed:', embedUrl);
      return embedUrl;
    }
    
    console.warn('[FullscreenRewardVideoView] Unknown platform:', url);
    return url;
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCountdown(requiredSeconds);
      setTimerCompleted(false);
      setAutoplayBlocked(false);
      setVideoStarted(false);
      timerCompletedCalledRef.current = false;
    }
  }, [isOpen, requiredSeconds]);

  // Start countdown timer
  useEffect(() => {
    if (!isOpen || !videoStarted) return;

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        const newValue = prev - 1;
        
        if (newValue <= 0) {
          if (!timerCompletedCalledRef.current) {
            timerCompletedCalledRef.current = true;
            setTimerCompleted(true);
            onTimerCompleted();
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        
        return newValue;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, videoStarted, onTimerCompleted]);

  // Try to auto-start video
  useEffect(() => {
    if (!isOpen) return;

    // Give iframe a moment to load, then check if autoplay worked
    const checkAutoplay = setTimeout(() => {
      // For now, assume autoplay works and start timer
      // If autoplay is blocked, user will see play button
      setVideoStarted(true);
    }, 500);

    return () => clearTimeout(checkAutoplay);
  }, [isOpen]);

  // Handle manual play start (if autoplay blocked)
  const handleManualPlay = useCallback(() => {
    setAutoplayBlocked(false);
    setVideoStarted(true);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (timerCompleted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      onClosed();
    }
  }, [timerCompleted, onClosed]);

  // Handle go to creator
  const handleGoToCreator = useCallback(() => {
    // Open original video URL
    window.open(video.video_url, '_blank', 'noopener,noreferrer');
    onGoToCreator?.();
  }, [video.video_url, onGoToCreator]);

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

  if (!isOpen) return null;

  const embedUrl = getEmbedUrl(video);

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black"
      style={{
        // Extend beyond safe areas to cover everything
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        width: 'calc(100% + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
        height: 'calc(100% + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        overflow: 'hidden',
      }}
    >
      {/* Video container - fills entire device screen */}
      <div 
        className="relative w-full h-full"
        style={{
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          backgroundColor: '#000', // Matte black background for non-9:16 videos
        }}
      >
        {/* Video iframe - scaled to crop platform UI (bottom creator info) */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          style={{
            position: 'absolute',
            top: '45%', // Shift up to crop bottom platform UI
            left: '50%',
            transform: 'translate(-50%, -50%) scale(1.25)', // Scale up to fill and crop edges
            width: '100vw',
            height: '100dvh',
            border: 'none',
            backgroundColor: '#000',
          }}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />

        {/* Autoplay blocked overlay */}
        {autoplayBlocked && !videoStarted && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 cursor-pointer"
            onClick={handleManualPlay}
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
              <Play className="w-10 h-10 text-primary fill-primary" />
            </div>
            <p className="text-white text-lg font-medium">{t.tapToPlay}</p>
          </div>
        )}

        {/* Countdown timer overlay - top left */}
        <div className="absolute top-4 left-4 z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
          <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 min-w-[60px] text-center">
            <span className="text-white font-bold text-xl tabular-nums">
              {countdown}
            </span>
          </div>
        </div>

        {/* Close button - top right, only visible after timer completed */}
        {timerCompleted && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-full p-3 hover:bg-black/90 transition-colors active:scale-95"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Go to creator CTA - bottom left, only visible after timer completed */}
        {timerCompleted && (
          <button
            onClick={handleGoToCreator}
            className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 hover:bg-black/90 transition-colors active:scale-95"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
            <span className="text-white font-medium">{t.goToCreator}</span>
            <ExternalLink className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Video progress indicator for multi-video sequences (optional, handled by parent) */}
      </div>
    </div>
  );
};

export default FullscreenRewardVideoView;
