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

export const FullscreenRewardVideoView: React.FC<FullscreenRewardVideoViewProps> = ({
  videos,
  durationSecondsPerVideo = 15,
  onCompleted,
  onClose,
}) => {
  const { lang } = useI18n();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [countdown, setCountdown] = useState(durationSecondsPerVideo);
  const [canClose, setCanClose] = useState(false);
  const watchedIdsRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalVideos = videos.length;
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

  // Countdown timer logic
  useEffect(() => {
    if (!currentVideo) return;
    
    setCountdown(durationSecondsPerVideo);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (!watchedIdsRef.current.includes(currentVideo.id)) {
            watchedIdsRef.current.push(currentVideo.id);
          }
          
          if (currentVideoIndex < totalVideos - 1) {
            setCurrentVideoIndex(i => i + 1);
            return durationSecondsPerVideo;
          } else {
            clearInterval(timerRef.current!);
            setCanClose(true);
            
            toast.success(
              lang === 'hu' 
                ? 'Zárd be a videót a jutalom jóváírásához!' 
                : 'Close the video to claim your reward!',
              { position: 'top-center', duration: 5000 }
            );
            
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentVideoIndex, currentVideo?.id, totalVideos, durationSecondsPerVideo, lang]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(watchedIdsRef.current);
    onClose();
  }, [canClose, onCompleted, onClose]);

  if (!currentVideo) return null;

  // Build embed URL with autoplay parameter
  let embedSrc = currentVideo.embedUrl;
  try {
    const url = new URL(embedSrc);
    url.searchParams.set('autoplay', '1');
    embedSrc = url.toString();
  } catch (e) {
    // Keep original URL
  }

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw', 
        height: '100dvh',
        backgroundColor: '#000',
        zIndex: 99999,
      }}
    >
      {/* Iframe container - oversized to hide platform UI */}
      <div 
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <iframe
          key={currentVideo.id}
          src={embedSrc}
          style={{ 
            width: '100vw',
            height: '200dvh',
            border: 'none',
            pointerEvents: 'none',
            transform: 'scale(1.5)',
          }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
          allowFullScreen
        />
      </div>

      {/* SOLID BLACK masks to completely cover platform UI */}
      {/* Top mask - thick solid black */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '20dvh',
          backgroundColor: '#000',
          zIndex: 10,
        }} 
      />
      
      {/* Bottom mask - thick solid black */}
      <div 
        style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '20dvh',
          backgroundColor: '#000',
          zIndex: 10,
        }} 
      />
      
      {/* Left mask */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '12vw',
          backgroundColor: '#000',
          zIndex: 10,
        }} 
      />
      
      {/* Right mask - wider to cover TikTok buttons */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '18vw',
          backgroundColor: '#000',
          zIndex: 10,
        }} 
      />

      {/* Countdown timer */}
      <div 
        style={{ 
          position: 'absolute',
          zIndex: 30,
          top: 'max(env(safe-area-inset-top, 0px), 16px)', 
          left: '16px',
        }}
      >
        <div 
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.85)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '24px',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          }}
        >
          {countdown}
        </div>
      </div>

      {/* Progress dots for multi-video */}
      {totalVideos > 1 && (
        <div 
          style={{ 
            position: 'absolute',
            zIndex: 30,
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            left: '50%', 
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
          }}
        >
          {videos.map((_, idx) => (
            <div 
              key={idx} 
              style={{ 
                width: idx === currentVideoIndex ? '24px' : '8px', 
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx <= currentVideoIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
              }} 
            />
          ))}
        </div>
      )}

      {/* Close button - only when countdown finished */}
      {canClose && (
        <button 
          onClick={handleClose}
          style={{ 
            position: 'absolute',
            zIndex: 30,
            top: 'max(env(safe-area-inset-top, 0px), 16px)', 
            right: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.3)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            animation: 'pulse 2s infinite',
          }}
        >
          <X color="#fff" size={28} strokeWidth={3} />
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};
