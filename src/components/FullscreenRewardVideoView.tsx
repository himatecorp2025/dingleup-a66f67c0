import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import introVideo from '@/assets/loading-video.mp4';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  durationSeconds?: number; // Video duration in seconds
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
  const totalDurationSeconds = videos.length * durationSecondsPerVideo;
  const [secondsLeft, setSecondsLeft] = useState(totalDurationSeconds);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const watchedIdsRef = useRef<Set<string>>(new Set());
  const videoQueueRef = useRef<RewardVideo[]>([...videos]);
  const currentVideoStartRef = useRef<number>(Date.now());
  const introVideoRef = useRef<HTMLVideoElement>(null);

  const currentVideo = videoQueueRef.current[currentVideoIndex];

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
      
      // Check if current video has ended early (based on duration_seconds)
      const currentVid = videoQueueRef.current[currentVideoIndex];
      if (currentVid && currentVid.durationSeconds) {
        const videoElapsed = (Date.now() - currentVideoStartRef.current) / 1000;
        
        // If this video is shorter than expected and has finished playing
        if (currentVid.durationSeconds < durationSecondsPerVideo && videoElapsed >= currentVid.durationSeconds) {
          // Move to next video
          if (currentVideoIndex < videoQueueRef.current.length - 1) {
            watchedIdsRef.current.add(currentVid.id);
            setCurrentVideoIndex(prev => prev + 1);
            currentVideoStartRef.current = Date.now();
          }
        }
      }
      
      // If less than 3 seconds remaining, show intro video
      if (remaining <= 3 && remaining > 0 && !showIntroVideo) {
        setShowIntroVideo(true);
        // Mark current video as watched
        if (currentVid) {
          watchedIdsRef.current.add(currentVid.id);
        }
      }
      
      // Calculate which video should be playing (fallback time-based switching)
      if (!showIntroVideo) {
        const expectedIndex = Math.min(videoQueueRef.current.length - 1, Math.floor(elapsed / durationSecondsPerVideo));
        
        if (expectedIndex !== currentVideoIndex && expectedIndex < videoQueueRef.current.length) {
          // Mark previous video as watched
          if (videoQueueRef.current[currentVideoIndex]) {
            watchedIdsRef.current.add(videoQueueRef.current[currentVideoIndex].id);
          }
          setCurrentVideoIndex(expectedIndex);
          currentVideoStartRef.current = Date.now();
        }
      }
      
      // Timer finished
      if (remaining === 0) {
        // Mark all videos as watched
        videoQueueRef.current.forEach(v => watchedIdsRef.current.add(v.id));
        
        clearInterval(interval);
        setCanClose(true);
        
        // Just show toast to close - reward amount will be shown after completion
        toast.success(
          lang === 'hu' 
            ? 'Zárd be a videót a jutalom jóváírásához!' 
            : 'Close the video to claim your reward!',
          { position: 'top-center', duration: 2000 }
        );
      }
    }, 100); // Update frequently for smooth countdown

    return () => clearInterval(interval);
  }, [totalDurationSeconds, durationSecondsPerVideo, lang, currentVideoIndex, showIntroVideo]);

  // Play intro video when it becomes visible
  useEffect(() => {
    if (showIntroVideo && introVideoRef.current) {
      introVideoRef.current.play().catch(console.error);
    }
  }, [showIntroVideo]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(Array.from(watchedIdsRef.current));
    onClose();
  }, [canClose, onCompleted, onClose]);

  if (!currentVideo && !showIntroVideo) return null;

  const embedSrc = currentVideo ? buildAutoplayUrl(currentVideo) : '';

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ 
        width: '100vw', 
        height: '100dvh',
        backgroundColor: '#000000',
      }}
    >
      {/* Solid black background layer */}
      <div 
        className="absolute inset-0" 
        style={{ backgroundColor: '#000000', zIndex: 0 }}
      />

      {/* Show intro video for last 3 seconds */}
      {showIntroVideo ? (
        <video
          ref={introVideoRef}
          src={introVideo}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 10 }}
          muted
          playsInline
          loop
        />
      ) : (
        <>
          {/* FULLSCREEN iframe - full width, taller than viewport, shifted DOWN to hide bottom platform UI */}
          {/* Black background container ensures no white/light gaps */}
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: '#000000', zIndex: 5 }}
          />
          <iframe
            key={`${currentVideo?.id}-${currentVideoIndex}`}
            src={embedSrc}
            className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-[8vh] border-0 pointer-events-none"
            style={{
              width: '100vw',
              height: '120vh',
              zIndex: 10,
              backgroundColor: '#000000',
            }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
            allowFullScreen
          />
          
          {/* Black overlay strips for sides (in case iframe content has lighter background) */}
          <div 
            className="absolute top-0 left-0 h-full"
            style={{ 
              width: '5vw', 
              backgroundColor: '#000000',
              zIndex: 15,
            }}
          />
          <div 
            className="absolute top-0 right-0 h-full"
            style={{ 
              width: '5vw', 
              backgroundColor: '#000000',
              zIndex: 15,
            }}
          />
        </>
      )}

      {/* Countdown timer - top left */}
      <div 
        className="absolute"
        style={{ 
          top: 'max(env(safe-area-inset-top, 0px), 16px)', 
          left: '16px',
          zIndex: 30,
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
      {videos.length > 1 && !showIntroVideo && (
        <div 
          className="absolute flex gap-2"
          style={{ 
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 30,
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
          className="absolute flex items-center justify-center rounded-full border-0 cursor-pointer animate-pulse"
          style={{ 
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            right: '16px',
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(255,255,255,0.3)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: 30,
          }}
        >
          <X color="#fff" size={28} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};