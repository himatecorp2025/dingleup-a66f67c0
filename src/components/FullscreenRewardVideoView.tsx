import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
}

interface FullscreenRewardVideoViewProps {
  videos: RewardVideo[];
  durationSecondsPerVideo?: number;
  onCompleted: (watchedVideoIds: string[]) => void;
  onClose: () => void;
}

// Build embed URL with autoplay parameters per platform
const buildAutoplayUrl = (video: RewardVideo): string => {
  let url = video.embedUrl;
  
  try {
    const urlObj = new URL(url);
    
    // Platform-specific autoplay params
    switch (video.platform) {
      case 'youtube':
        urlObj.searchParams.set('autoplay', '1');
        urlObj.searchParams.set('mute', '1');
        urlObj.searchParams.set('playsinline', '1');
        urlObj.searchParams.set('controls', '0');
        urlObj.searchParams.set('showinfo', '0');
        urlObj.searchParams.set('rel', '0');
        urlObj.searchParams.set('modestbranding', '1');
        break;
      case 'tiktok':
        // TikTok embed auto-plays by default, but ensure it's set
        urlObj.searchParams.set('autoplay', '1');
        urlObj.searchParams.set('mute', '1');
        break;
      case 'instagram':
        // Instagram Reels embed
        urlObj.searchParams.set('autoplay', '1');
        break;
      case 'facebook':
        // Facebook video embed
        urlObj.searchParams.set('autoplay', '1');
        urlObj.searchParams.set('mute', '1');
        break;
    }
    
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, return original
    return url;
  }
};

export const FullscreenRewardVideoView: React.FC<FullscreenRewardVideoViewProps> = ({
  videos,
  durationSecondsPerVideo = 15,
  onCompleted,
  onClose,
}) => {
  const { lang } = useI18n();
  const startTimeRef = useRef<number>(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(videos.length * durationSecondsPerVideo);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const watchedIdsRef = useRef<Set<string>>(new Set());

  const totalDurationSeconds = videos.length * durationSecondsPerVideo;
  const currentVideo = videos[currentVideoIndex];

  // Lock body scroll
  useEffect(() => {
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      height: document.body.style.height,
    };
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.position = originalStyles.position;
      document.body.style.width = originalStyles.width;
      document.body.style.height = originalStyles.height;
    };
  }, []);

  // Single unified timer - Date.now() based for accuracy
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDurationSeconds - Math.floor(elapsed));
      
      setSecondsLeft(remaining);
      
      // Calculate which video should be playing
      const newIndex = Math.min(videos.length - 1, Math.floor(elapsed / durationSecondsPerVideo));
      
      if (newIndex !== currentVideoIndex) {
        // Mark previous video as watched
        if (videos[currentVideoIndex]) {
          watchedIdsRef.current.add(videos[currentVideoIndex].id);
        }
        setCurrentVideoIndex(newIndex);
      }
      
      // Timer finished
      if (remaining === 0) {
        // Mark all videos as watched
        videos.forEach(v => watchedIdsRef.current.add(v.id));
        
        clearInterval(interval);
        setCanClose(true);
        
        toast.success(
          lang === 'hu' 
            ? 'Zárd be a videót a jutalom jóváírásához!' 
            : 'Close the video to claim your reward!',
          { position: 'top-center', duration: 5000 }
        );
      }
    }, 100); // Update frequently for smooth countdown

    return () => clearInterval(interval);
  }, [totalDurationSeconds, durationSecondsPerVideo, videos, lang, currentVideoIndex]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(Array.from(watchedIdsRef.current));
    onClose();
  }, [canClose, onCompleted, onClose]);

  if (!currentVideo) return null;

  const embedSrc = buildAutoplayUrl(currentVideo);

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black overflow-hidden"
      style={{ 
        width: '100vw', 
        height: '100dvh',
      }}
    >
      {/* FULLSCREEN iframe - scaled and positioned to hide platform UI */}
      <iframe
        key={`${currentVideo.id}-${currentVideoIndex}`}
        src={embedSrc}
        className="absolute border-0 pointer-events-none"
        style={{ 
          top: '50%',
          left: '50%',
          width: '130vw',
          height: '130vh',
          // Center video, shift DOWN to hide bottom platform UI (username, hashtags, music)
          transform: 'translate(-50%, -40%)',
          transformOrigin: 'center center',
        }}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
        allowFullScreen
      />

      {/* Countdown timer - top left */}
      <div 
        className="absolute z-30"
        style={{ 
          top: 'max(env(safe-area-inset-top, 0px), 16px)', 
          left: '16px',
        }}
      >
        <div 
          className="flex items-center justify-center rounded-full"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            border: '2px solid rgba(255,255,255,0.4)',
            fontWeight: 900,
            fontSize: '24px',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          }}
        >
          {secondsLeft}
        </div>
      </div>

      {/* Progress dots for multi-video (only show if more than 1 video) */}
      {videos.length > 1 && (
        <div 
          className="absolute z-30 flex gap-2"
          style={{ 
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            left: '50%', 
            transform: 'translateX(-50%)',
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

      {/* Close button - only visible when countdown finished */}
      {canClose && (
        <button 
          onClick={handleClose}
          className="absolute z-30 flex items-center justify-center rounded-full border-0 cursor-pointer animate-pulse"
          style={{ 
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            right: '16px',
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(255,255,255,0.3)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <X color="#fff" size={28} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};
