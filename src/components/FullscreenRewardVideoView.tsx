import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import PlatformEmbedFullscreen from '@/components/PlatformEmbedFullscreen';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  videoUrl?: string | null;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  durationSeconds?: number;
  creatorName?: string | null;
}

interface FullscreenRewardVideoViewProps {
  videos: RewardVideo[];
  durationSecondsPerVideo?: number;
  onCompleted: (watchedVideoIds: string[]) => void;
  onClose: () => void;
  context?: 'daily_gift' | 'game_end' | 'refill';
  rewardAmount?: number;
}

// Get display name from video
const getCreatorDisplayName = (video: RewardVideo): string | null => {
  if (video.creatorName) return video.creatorName;
  
  const url = video.videoUrl || video.embedUrl;
  try {
    if (video.platform === 'tiktok') {
      const match = url.match(/@([^\/\?\&]+)/);
      if (match && match[1] !== 'user') return `@${match[1]}`;
    } else if (video.platform === 'youtube') {
      const channelMatch = url.match(/@([^\/\?\&]+)/);
      if (channelMatch) return `@${channelMatch[1]}`;
    } else if (video.platform === 'instagram') {
      const match = url.match(/instagram\.com\/([^\/\?\&]+)/);
      if (match && !['p', 'reel', 'reels', 'embed'].includes(match[1])) {
        return `@${match[1]}`;
      }
    }
  } catch (e) {}
  return null;
};

// Get original video URL for "Go to creator" link
const getOriginalVideoUrl = (video: RewardVideo): string => {
  if (video.videoUrl) return video.videoUrl;
  
  try {
    if (video.platform === 'tiktok') {
      const match = video.embedUrl.match(/\/embed\/v2\/(\d+)/);
      if (match) return `https://www.tiktok.com/@user/video/${match[1]}`;
    } else if (video.platform === 'youtube') {
      const match = video.embedUrl.match(/\/embed\/([^?]+)/);
      if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
    } else if (video.platform === 'instagram') {
      return video.embedUrl.replace('/embed', '');
    }
  } catch (e) {}
  
  return video.embedUrl;
};

// Platform icon component
const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  if (platform === 'tiktok') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.001.595.04.88.12V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V9.45a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.88z"/>
      </svg>
    );
  }
  if (platform === 'youtube') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
        <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }
  if (platform === 'instagram') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="url(#ig-grad)">
        <defs>
          <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0">
            <stop offset="0%" stopColor="#FD5"/>
            <stop offset="50%" stopColor="#FF543E"/>
            <stop offset="100%" stopColor="#C837AB"/>
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }
  return null;
};

export const FullscreenRewardVideoView: React.FC<FullscreenRewardVideoViewProps> = ({
  videos,
  durationSecondsPerVideo = 15,
  onCompleted,
  onClose,
  context,
  rewardAmount,
}) => {
  const { lang } = useI18n();
  const startTimeRef = useRef<number>(Date.now());
  const totalDuration = videos.length * durationSecondsPerVideo;
  const [secondsLeft, setSecondsLeft] = useState(totalDuration);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const watchedIdsRef = useRef<Set<string>>(new Set());
  const lastSwitchRef = useRef<number>(Date.now());

  const currentVideo = videos[currentVideoIndex];

  // CTA visibility logic: show only in last 5 seconds of each segment (10-15s)
  const SEGMENT_DURATION = 15;
  const segmentIndex = Math.floor(elapsedSeconds / SEGMENT_DURATION);
  const segmentElapsed = elapsedSeconds % SEGMENT_DURATION;
  const showCTA = segmentElapsed >= 10 && segmentElapsed < SEGMENT_DURATION && !canClose;
  const activeVideoForCTA = videos[segmentIndex] || null;

  // Lock body scroll
  useEffect(() => {
    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    
    return () => {
      document.body.style.overflow = original.overflow;
      document.body.style.position = original.position;
    };
  }, []);

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDuration - Math.floor(elapsed));
      setSecondsLeft(remaining);
      setElapsedSeconds(Math.floor(elapsed));

      // Timer finished
      if (remaining === 0) {
        videos.forEach(v => watchedIdsRef.current.add(v.id));
        setCanClose(true);
        toast.success(
          lang === 'hu' ? '🎉 Jutalmad jóváírva!' : '🎉 Reward credited!',
          { 
            position: 'top-center', 
            duration: 1500,
            style: { 
              maxWidth: '200px',
              marginTop: '80px',
            }
          }
        );
        clearInterval(interval);
        return;
      }

      // Switch video every 15 seconds
      const elapsedInSegment = (Date.now() - lastSwitchRef.current) / 1000;
      if (elapsedInSegment >= durationSecondsPerVideo && currentVideoIndex < videos.length - 1) {
        if (currentVideo) watchedIdsRef.current.add(currentVideo.id);
        setCurrentVideoIndex(prev => prev + 1);
        lastSwitchRef.current = Date.now();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [totalDuration, durationSecondsPerVideo, currentVideoIndex, videos, currentVideo, lang]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(Array.from(watchedIdsRef.current));
    onClose();
  }, [canClose, onCompleted, onClose]);

  const handleCreatorClick = useCallback(() => {
    if (!activeVideoForCTA) return;
    window.open(getOriginalVideoUrl(activeVideoForCTA), '_blank', 'noopener,noreferrer');
  }, [activeVideoForCTA]);

  if (!currentVideo) return null;

  // CTA creator name is from activeVideoForCTA (segment-based)
  const ctaCreatorName = activeVideoForCTA ? getCreatorDisplayName(activeVideoForCTA) : null;

  return (
    <div 
      className="fixed inset-0 bg-black"
      style={{ width: '100vw', height: '100dvh', zIndex: 1000000 }}
    >
      {/* Video embed - lowest layer */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        <PlatformEmbedFullscreen
          key={`${currentVideo.id}-${currentVideoIndex}`}
          platform={currentVideo.platform}
          originalUrl={currentVideo.videoUrl || currentVideo.embedUrl}
          embedUrl={currentVideo.embedUrl}
        />
      </div>

      {/* Transparent blocking overlay - prevents interaction with embedded video controls */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ 
          zIndex: 50,
          backgroundColor: 'transparent',
        }}
      />

      {/* Timer - top left */}
      <div 
        className="absolute flex items-center justify-center rounded-full bg-black/80 border-2 border-white/40"
        style={{ 
          top: 'max(env(safe-area-inset-top, 0px), 16px)', 
          left: '16px',
          width: '56px',
          height: '56px',
          zIndex: 60,
        }}
      >
        <span className="text-white font-bold text-2xl">{secondsLeft}</span>
      </div>

      {/* Progress dots for multi-video */}
      {videos.length > 1 && (
        <div 
          className="absolute flex gap-2"
          style={{ 
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 60,
          }}
        >
          {videos.map((_, idx) => (
            <div 
              key={idx} 
              className="transition-all duration-300"
              style={{ 
                width: idx === currentVideoIndex ? '24px' : '8px', 
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx <= currentVideoIndex ? '#fff' : 'rgba(255,255,255,0.3)',
              }} 
            />
          ))}
        </div>
      )}

      {/* Creator CTA link - bottom left, only in last 5 seconds of each segment - must be above BottomNav (z-9999) */}
      {showCTA && activeVideoForCTA && (
        <button
          onClick={handleCreatorClick}
          className="absolute flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 border-2 border-white/40 text-white hover:bg-black/90 transition-colors"
          style={{ 
            bottom: 'max(env(safe-area-inset-bottom, 0px), 24px)', 
            left: '16px',
            zIndex: 1000000,
          }}
        >
          <PlatformIcon platform={activeVideoForCTA.platform} />
          <span className="text-sm font-medium">
            {ctaCreatorName || (lang === 'hu' ? 'Tovább az alkotóhoz' : 'Go to creator')}
          </span>
          <ExternalLink className="w-4 h-4 opacity-60" />
        </button>
      )}

      {/* Close button - top right, only when timer finished */}
      {canClose && (
        <button
          onClick={handleClose}
          className="absolute flex items-center justify-center rounded-full bg-black/80 border-2 border-white/40 text-white hover:bg-black/90 transition-colors animate-pulse"
          style={{ 
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            right: '16px',
            width: '56px',
            height: '56px',
            zIndex: 60,
          }}
        >
          <X className="w-7 h-7" />
        </button>
      )}
    </div>
  );
};

export default FullscreenRewardVideoView;
