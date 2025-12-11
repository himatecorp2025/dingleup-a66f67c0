import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import introVideo from '@/assets/loading-video.mp4';
import dingleupLogo from '@/assets/dingleup-logo-loading.png';

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
  context?: 'daily_gift' | 'game_end' | 'refill';
  rewardAmount?: number;
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
  const [isTransitioning, setIsTransitioning] = useState(false); // Black overlay during switch
  const watchedIdsRef = useRef<Set<string>>(new Set());
  const videoQueueRef = useRef<RewardVideo[]>([...videos]);
  const currentVideoStartRef = useRef<number>(Date.now());
  const [videoKey, setVideoKey] = useState(0);
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
      
      // If already showing intro video or timer finished, skip video switching logic
      if (showIntroVideo || timerFinished || isTransitioning) {
        // Timer finished - show close button
        if (remaining === 0 && !timerFinished) {
          videoQueueRef.current.forEach(v => watchedIdsRef.current.add(v.id));
          setTimerFinished(true);
          setCanClose(true);
          
          let toastMessage: string;
          if (context === 'refill') {
            toastMessage = lang === 'hu' 
              ? 'Zárd be a videót a jutalom jóváírásához! +500 arany és 5 élet' 
              : 'Close the video to claim your reward! +500 gold and 5 lives';
          } else if (rewardAmount) {
            toastMessage = lang === 'hu' 
              ? `Zárd be a videót a jutalom jóváírásához! +${rewardAmount} arany` 
              : `Close the video to claim your reward! +${rewardAmount} gold`;
          } else {
            toastMessage = lang === 'hu' 
              ? 'Zárd be a videót a jutalom jóváírásához!' 
              : 'Close the video to claim your reward!';
          }
          
          toast.success(toastMessage, { position: 'top-center', duration: 2000 });
        }
        return;
      }
      
      // Check if current video has ended and we need to switch
      const currentVid = videoQueueRef.current[currentVideoIndex];
      if (currentVid && currentVid.durationSeconds && currentVid.durationSeconds > 0) {
        const videoElapsed = (Date.now() - currentVideoStartRef.current) / 1000;
        
        // CRITICAL: Switch 5 seconds EARLY to completely prevent TikTok "Ajánlott tartalom"
        // TikTok shows recommendations before video fully ends
        const switchThreshold = Math.max(0, currentVid.durationSeconds - 5);
        
        if (videoElapsed >= switchThreshold) {
          // IMMEDIATELY show black overlay to hide TikTok recommendations
          setIsTransitioning(true);
          
          // Mark current video as watched
          watchedIdsRef.current.add(currentVid.id);
          
          // Short delay for black overlay to appear, then switch
          setTimeout(() => {
            // Decision: if >3 sec remaining → next creator video, else → intro video
            if (remaining > 3) {
              console.log('[FullscreenRewardVideoView] Video ending, >3 sec remaining → next creator video');
              const nextIndex = (currentVideoIndex + 1) % videoQueueRef.current.length;
              setCurrentVideoIndex(nextIndex);
              currentVideoStartRef.current = Date.now();
              setVideoKey(prev => prev + 1);
            } else {
              console.log('[FullscreenRewardVideoView] Video ending, ≤3 sec remaining → intro video');
              setShowIntroVideo(true);
            }
            
            // Remove transition overlay after switch
            setTimeout(() => {
              setIsTransitioning(false);
            }, 100);
          }, 50);
        }
      }
      
      // Timer finished - show close button
      if (remaining === 0 && !timerFinished) {
        videoQueueRef.current.forEach(v => watchedIdsRef.current.add(v.id));
        setTimerFinished(true);
        setCanClose(true);
        
        let toastMessage: string;
        if (context === 'refill') {
          toastMessage = lang === 'hu' 
            ? 'Zárd be a videót a jutalom jóváírásához! +500 arany és 5 élet' 
            : 'Close the video to claim your reward! +500 gold and 5 lives';
        } else if (rewardAmount) {
          toastMessage = lang === 'hu' 
            ? `Zárd be a videót a jutalom jóváírásához! +${rewardAmount} arany` 
            : `Close the video to claim your reward! +${rewardAmount} gold`;
        } else {
          toastMessage = lang === 'hu' 
            ? 'Zárd be a videót a jutalom jóváírásához!' 
            : 'Close the video to claim your reward!';
        }
        
        toast.success(toastMessage, { position: 'top-center', duration: 2000 });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [totalDurationSeconds, lang, currentVideoIndex, timerFinished, showIntroVideo, isTransitioning, context, rewardAmount]);

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
      {/* Solid black background layer - ALWAYS visible */}
      <div 
        className="absolute inset-0" 
        style={{ backgroundColor: '#000000', zIndex: 0 }}
      />

      {/* TRANSITION OVERLAY - Logo on black background during video switch */}
      {isTransitioning && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            backgroundColor: '#000000', 
            zIndex: 50,
          }}
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
        /* Intro video - loops until user closes */
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
          
          {/* Black overlay strips for sides - ALWAYS visible */}
          <div 
            className="absolute top-0 left-0 h-full"
            style={{ width: '15vw', backgroundColor: '#000000', zIndex: 15 }}
          />
          <div 
            className="absolute top-0 right-0 h-full"
            style={{ width: '15vw', backgroundColor: '#000000', zIndex: 15 }}
          />
          
          {/* Top black overlay - ALWAYS visible */}
          <div 
            className="absolute top-0 left-0 right-0"
            style={{ height: '15vh', backgroundColor: '#000000', zIndex: 15 }}
          />
          
          {/* Bottom black overlay - ALWAYS visible */}
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