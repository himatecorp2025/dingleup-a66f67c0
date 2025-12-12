import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import introVideo from '@/assets/loading-video.mp4';
import dingleupLogo from '@/assets/dingleup-logo-loading.png';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  videoUrl?: string | null; // Original video URL for "Go to creator" link and username extraction
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  durationSeconds?: number;
  creatorName?: string | null; // Creator display name from database
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

// Get display name: prefer database creatorName, fallback to URL extraction
const getCreatorDisplayName = (video: RewardVideo): string | null => {
  // Use database creator_name if available
  if (video.creatorName) return video.creatorName;
  
  // Fallback: extract from URL
  return extractCreatorUsernameFromUrl(video);
};

// Extract creator username from embed/video URL (fallback method)
const extractCreatorUsernameFromUrl = (video: RewardVideo): string | null => {
  const url = video.videoUrl || video.embedUrl;
  
  try {
    if (video.platform === 'tiktok') {
      // TikTok patterns: @username in URL
      const match = url.match(/@([^\/\?\&]+)/);
      if (match && match[1] !== 'user') return `@${match[1]}`;
      
      // Check video URL directly if available
      if (video.videoUrl) {
        const videoMatch = video.videoUrl.match(/@([^\/\?\&]+)/);
        if (videoMatch && videoMatch[1] !== 'user') return `@${videoMatch[1]}`;
      }
    } else if (video.platform === 'youtube') {
      // YouTube: @channel or channel name
      const channelMatch = url.match(/@([^\/\?\&]+)/);
      if (channelMatch) return `@${channelMatch[1]}`;
    } else if (video.platform === 'instagram') {
      // Instagram: /username/ pattern
      const match = url.match(/instagram\.com\/([^\/\?\&]+)/);
      if (match && !['p', 'reel', 'reels', 'embed'].includes(match[1])) {
        return `@${match[1]}`;
      }
    } else if (video.platform === 'facebook') {
      // Facebook username
      const match = url.match(/facebook\.com\/([^\/\?\&]+)/);
      if (match && !['watch', 'video', 'videos', 'plugins'].includes(match[1])) {
        return match[1];
      }
    }
  } catch (e) {
    // Silent fail
  }
  
  return null;
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
  const [lastCreatorUsername, setLastCreatorUsername] = useState<string | null>(null);
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

  // Simple timer: every 15 seconds switch video, at 10 seconds show creator link
  useEffect(() => {
    const interval = setInterval(() => {
      const totalElapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDurationSeconds - Math.floor(totalElapsed));
      setSecondsLeft(remaining);
      
      // Timer finished - keep creator link visible!
      if (remaining === 0 && !timerFinished) {
        videoQueueRef.current.forEach(v => watchedIdsRef.current.add(v.id));
        setTimerFinished(true);
        setCanClose(true);
        setShowIntroVideo(true);
        // DO NOT hide creator link - keep it visible during intro video
        
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
      
      // At 10 seconds (5 seconds before switch), show creator link button
      if (elapsedInSegment >= 10 && !showCreatorLink) {
        setShowCreatorLink(true);
        // Store current creator username for persistence during intro
        if (currentVideo) {
          setLastCreatorUsername(getCreatorDisplayName(currentVideo));
        }
      }
      
      // At 15 seconds, switch to next video
      if (elapsedInSegment >= 15) {
        // Mark current video as watched
        if (currentVideo) {
          watchedIdsRef.current.add(currentVideo.id);
        }
        
        // Show transition overlay - but keep creator link visible
        setIsTransitioning(true);
        
        setTimeout(() => {
          if (remaining > 3) {
            // More time left - switch to next video
            const nextIndex = (currentVideoIndex + 1) % videoQueueRef.current.length;
            setCurrentVideoIndex(nextIndex);
            lastVideoSwitchRef.current = Date.now();
            setVideoKey(prev => prev + 1);
            setShowCreatorLink(false); // Reset for next video
          } else {
            // Less than 3 seconds - show intro video
            setShowIntroVideo(true);
          }
          
          // INSTANT transition clear
          setIsTransitioning(false);
        }, 16); // Single frame - 16ms
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

      {/* Creator name display - TOP of video, platform icon + username */}
      {currentVideo && !isTransitioning && (
        <div 
          className="absolute flex items-center gap-2"
          style={{ 
            top: 'max(calc(env(safe-area-inset-top, 0px) + 16px), 80px)',
            left: '16px',
            zIndex: 60,
          }}
        >
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-full"
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Platform icon - SVG */}
            {currentVideo.platform === 'tiktok' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.001.595.04.88.12V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V9.45a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.88z" fill="#fff"/>
              </svg>
            )}
            {currentVideo.platform === 'youtube' && (
              <svg width="20" height="14" viewBox="0 0 24 17" fill="none">
                <path d="M23.5 2.5a3 3 0 0 0-2.1-2.1C19.5 0 12 0 12 0S4.5 0 2.6.4A3 3 0 0 0 .5 2.5C0 4.4 0 8.5 0 8.5s0 4.1.5 6a3 3 0 0 0 2.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1c.5-1.9.5-6 .5-6s0-4.1-.5-6z" fill="#FF0000"/>
                <path d="M9.5 12V5l6.5 3.5-6.5 3.5z" fill="#fff"/>
              </svg>
            )}
            {currentVideo.platform === 'instagram' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8 0-3.2 0-3.6.1-4.8.1-3.2 1.7-4.8 4.9-4.9 1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0z" fill="url(#ig-gradient)"/>
                <path d="M12 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#fff"/>
                <circle cx="18.4" cy="5.6" r="1.4" fill="#fff"/>
                <defs>
                  <linearGradient id="ig-gradient" x1="0" y1="24" x2="24" y2="0">
                    <stop offset="0%" stopColor="#FD5"/>
                    <stop offset="50%" stopColor="#FF543E"/>
                    <stop offset="100%" stopColor="#C837AB"/>
                  </linearGradient>
                </defs>
              </svg>
            )}
            {currentVideo.platform === 'facebook' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
                <path d="M16.671 15.469L17.203 12h-3.328V9.75c0-.95.465-1.875 1.956-1.875h1.513V4.922s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669V12H7.078v3.469h3.047v8.385a12.09 12.09 0 0 0 3.75 0V15.47h2.796z" fill="#fff"/>
              </svg>
            )}
            {/* Creator username */}
            <span 
              style={{ 
                color: '#fff', 
                fontSize: '14px', 
                fontWeight: 600,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                letterSpacing: '0.3px',
              }}
            >
              {getCreatorDisplayName(currentVideo) || (lang === 'hu' ? 'Alkotó' : 'Creator')}
            </span>
          </div>
        </div>
      )}

      {/* TikTok-style "Go to creator" button - bottom left, appears at 10 seconds, stays during intro */}
      {showCreatorLink && currentVideo && !isTransitioning && (
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
          <span>
            {lang === 'hu' 
              ? `Tovább ${lastCreatorUsername || getCreatorDisplayName(currentVideo) || 'az alkotó'} oldalára` 
              : `Go to ${lastCreatorUsername || getCreatorDisplayName(currentVideo) || 'creator'} page`}
          </span>
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