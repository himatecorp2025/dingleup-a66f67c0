import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import introVideo from '@/assets/loading-video.mp4';
import dingleupLogo from '@/assets/dingleup-logo-loading.png';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  videoUrl?: string; // Original video URL for "Go to creator" link
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  durationSeconds?: number;
}

interface FullscreenRewardVideoViewProps {
  videos: RewardVideo[];
  durationSecondsPerVideo?: number;
  onCompleted: (watchedVideoIds: string[]) => void;
  onClose: () => void;
  context?: 'daily_gift' | 'game_end' | 'refill';
  rewardAmount?: number;
}

// Build embed URL with autoplay parameters per platform
const buildAutoplayUrl = (video: RewardVideo): string => {
  let url = video.embedUrl;
  
  try {
    const urlObj = new URL(url);
    
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
        urlObj.searchParams.set('autoplay', '1');
        urlObj.searchParams.set('mute', '1');
        break;
      case 'instagram':
        urlObj.searchParams.set('autoplay', '1');
        break;
      case 'facebook':
        urlObj.searchParams.set('autoplay', '1');
        urlObj.searchParams.set('mute', '1');
        break;
    }
    
    return urlObj.toString();
  } catch (e) {
    return url;
  }
};

// Derive original video URL from embed URL
const getOriginalVideoUrl = (video: RewardVideo): string => {
  if (video.videoUrl) return video.videoUrl;
  
  // Try to derive from embedUrl
  try {
    if (video.platform === 'tiktok') {
      // TikTok embed: https://www.tiktok.com/embed/v2/VIDEO_ID
      const match = video.embedUrl.match(/\/embed\/v2\/(\d+)/);
      if (match) {
        return `https://www.tiktok.com/@user/video/${match[1]}`;
      }
    } else if (video.platform === 'youtube') {
      // YouTube embed: https://www.youtube.com/embed/VIDEO_ID
      const match = video.embedUrl.match(/\/embed\/([^?]+)/);
      if (match) {
        return `https://www.youtube.com/watch?v=${match[1]}`;
      }
    } else if (video.platform === 'instagram') {
      // Instagram embed
      return video.embedUrl.replace('/embed', '');
    }
  } catch (e) {
    // Fallback
  }
  
  return video.embedUrl;
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
  const totalDurationSeconds = videos.length * durationSecondsPerVideo;
  const [secondsLeft, setSecondsLeft] = useState(totalDurationSeconds);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCreatorLink, setShowCreatorLink] = useState(false);
  const watchedIdsRef = useRef<Set<string>>(new Set());
  const videoQueueRef = useRef<RewardVideo[]>([...videos]);
  const [videoKey, setVideoKey] = useState(0);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const lastVideoSwitchRef = useRef<number>(Date.now());

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

  // Simple timer: every 15 seconds switch video, at 12 seconds show creator link
  useEffect(() => {
    const interval = setInterval(() => {
      const totalElapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDurationSeconds - Math.floor(totalElapsed));
      setSecondsLeft(remaining);
      
      // Timer finished
      if (remaining === 0 && !timerFinished) {
        videoQueueRef.current.forEach(v => watchedIdsRef.current.add(v.id));
        setTimerFinished(true);
        setCanClose(true);
        setShowIntroVideo(true);
        setShowCreatorLink(false);
        
        const doubledAmount = rewardAmount ? rewardAmount * 2 : 0;
        let toastMessage: string;
        if (context === 'refill') {
          toastMessage = lang === 'hu' 
            ? 'Zárd be a videót a jutalom jóváírásához! +500 arany és 5 élet' 
            : 'Close the video to claim your reward! +500 gold and 5 lives';
        } else if (doubledAmount > 0) {
          toastMessage = lang === 'hu' 
            ? `Zárd be a videót a jutalom jóváírásához! +${doubledAmount} arany` 
            : `Close the video to claim your reward! +${doubledAmount} gold`;
        } else {
          toastMessage = lang === 'hu' 
            ? 'Zárd be a videót a jutalom jóváírásához!' 
            : 'Close the video to claim your reward!';
        }
        toast.success(toastMessage, { position: 'top-center', duration: 2000 });
        return;
      }
      
      if (showIntroVideo || timerFinished || isTransitioning) return;
      
      // Time elapsed in current 15-second segment
      const elapsedInSegment = (Date.now() - lastVideoSwitchRef.current) / 1000;
      
      // At 12 seconds (3 seconds before switch), show creator link button
      if (elapsedInSegment >= 12 && !showCreatorLink) {
        setShowCreatorLink(true);
      }
      
      // At 15 seconds, switch to next video
      if (elapsedInSegment >= 15) {
        // Mark current video as watched
        if (currentVideo) {
          watchedIdsRef.current.add(currentVideo.id);
        }
        
        // Show transition overlay
        setIsTransitioning(true);
        setShowCreatorLink(false);
        
        setTimeout(() => {
          if (remaining > 3) {
            // More time left - switch to next video
            const nextIndex = (currentVideoIndex + 1) % videoQueueRef.current.length;
            setCurrentVideoIndex(nextIndex);
            lastVideoSwitchRef.current = Date.now();
            setVideoKey(prev => prev + 1);
          } else {
            // Less than 3 seconds - show intro video
            setShowIntroVideo(true);
          }
          
          setTimeout(() => {
            setIsTransitioning(false);
          }, 100);
        }, 50);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [totalDurationSeconds, lang, currentVideoIndex, timerFinished, showIntroVideo, isTransitioning, context, rewardAmount, currentVideo, showCreatorLink]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(Array.from(watchedIdsRef.current));
    onClose();
  }, [canClose, onCompleted, onClose]);

  const handleCreatorLinkClick = useCallback(() => {
    if (!currentVideo) return;
    const url = getOriginalVideoUrl(currentVideo);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentVideo]);

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

      {/* TRANSITION OVERLAY - Logo on black background during video switch */}
      {isTransitioning && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: '#000000', zIndex: 50 }}
        >
          <img 
            src={dingleupLogo} 
            alt="DingleUP" 
            className="animate-pulse"
            style={{
              width: 'min(200px, 50vw)',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Show intro video OR creator video */}
      {showIntroVideo ? (
        <video
          ref={introVideoRef}
          src={introVideo}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 10 }}
        />
      ) : (
        <>
          {/* Black background container */}
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: '#000000', zIndex: 5 }}
          />
          
          {/* Creator video iframe - HIDDEN during transition */}
          {!isTransitioning && (
            <iframe
              key={`${currentVideo?.id}-${currentVideoIndex}-${videoKey}`}
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
          )}
          
          {/* Black overlay strips for sides */}
          <div 
            className="absolute top-0 left-0 h-full"
            style={{ width: '15vw', backgroundColor: '#000000', zIndex: 15 }}
          />
          <div 
            className="absolute top-0 right-0 h-full"
            style={{ width: '15vw', backgroundColor: '#000000', zIndex: 15 }}
          />
          
          {/* Top black overlay */}
          <div 
            className="absolute top-0 left-0 right-0"
            style={{ height: '15vh', backgroundColor: '#000000', zIndex: 15 }}
          />
          
          {/* Bottom black overlay */}
          <div 
            className="absolute bottom-0 left-0 right-0"
            style={{ height: '15vh', backgroundColor: '#000000', zIndex: 15 }}
          />
        </>
      )}

      {/* Countdown timer - top left */}
      <div 
        className="absolute"
        style={{ 
          top: 'max(env(safe-area-inset-top, 0px), 16px)', 
          left: '16px',
          zIndex: 60,
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

      {/* Progress dots for multi-video */}
      {videos.length > 1 && !showIntroVideo && (
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

      {/* TikTok-style "Go to creator" button - bottom left, appears at 12 seconds */}
      {showCreatorLink && currentVideo && !showIntroVideo && !isTransitioning && (
        <button
          onClick={handleCreatorLinkClick}
          className="absolute flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 animate-fade-in"
          style={{
            bottom: 'max(env(safe-area-inset-bottom, 0px), 100px)',
            left: '16px',
            zIndex: 60,
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <ExternalLink size={16} />
          <span>{lang === 'hu' ? 'Tovább az alkotó oldalára' : 'Go to creator page'}</span>
        </button>
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
            zIndex: 60,
          }}
        >
          <X color="#fff" size={28} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};