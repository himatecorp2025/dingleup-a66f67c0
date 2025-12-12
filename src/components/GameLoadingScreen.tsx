import { useEffect, useRef, useState } from 'react';
import loadingVideo from '@/assets/loading-video.mp4';
import { logger } from '@/lib/logger';

interface GameLoadingScreenProps {
  onVideoEnd: () => void;
}

export const GameLoadingScreen = ({ onVideoEnd }: GameLoadingScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasStarted = useRef(false);
  const hasEnded = useRef(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasStarted.current) return;

    hasStarted.current = true;
    
    logger.log('[GameLoadingScreen] Starting video initialization');
    let playStarted = false;
    let canPlayFired = false;

    const handleCanPlay = () => {
      canPlayFired = true;
      setVideoLoaded(true);
      logger.log('[GameLoadingScreen] canplay event - attempting play');
      
      video.play()
        .then(() => {
          playStarted = true;
          logger.log('[GameLoadingScreen] Video play() successful');
        })
        .catch((err) => {
          logger.warn('[GameLoadingScreen] Autoplay failed:', err);
          if (!hasEnded.current) {
            hasEnded.current = true;
            onVideoEnd();
          }
        });
    };

    const handleEnded = () => {
      if (!hasEnded.current) {
        hasEnded.current = true;
        logger.log('[GameLoadingScreen] Video ended normally');
        onVideoEnd();
      }
    };

    const handleError = (e: any) => {
      logger.error('[GameLoadingScreen] Video loading error:', e);
      if (!hasEnded.current) {
        hasEnded.current = true;
        onVideoEnd();
      }
    };

    // Preload and start immediately
    video.preload = 'auto';
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    
    // Force immediate load
    video.load();
    
    // Attempt to start playing as soon as possible
    video.play()
      .then(() => {
        playStarted = true;
        logger.log('[GameLoadingScreen] Initial play() successful');
      })
      .catch(() => {
        logger.log('[GameLoadingScreen] Initial play() blocked - waiting for canplay');
      });

    // FAST FALLBACK: If video doesn't start playing within 3 seconds, skip it
    const fastFallback = setTimeout(() => {
      if (!playStarted && !hasEnded.current) {
        logger.warn('[GameLoadingScreen] Fast fallback (3s) - video not playing, skipping intro');
        hasEnded.current = true;
        onVideoEnd();
      }
    }, 3000);
    
    // MEDIUM FALLBACK: If canplay never fires within 5 seconds, skip video
    const mediumFallback = setTimeout(() => {
      if (!canPlayFired && !hasEnded.current) {
        logger.warn('[GameLoadingScreen] Medium fallback (5s) - canplay never fired, skipping intro');
        hasEnded.current = true;
        onVideoEnd();
      }
    }, 5000);

    // SAFETY FALLBACK: Force video end after 8 seconds maximum (reduced from 15s)
    const safetyTimeout = setTimeout(() => {
      if (!hasEnded.current) {
        logger.warn('[GameLoadingScreen] Safety timeout (8s) - forcing video end');
        hasEnded.current = true;
        onVideoEnd();
      }
    }, 8000);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(fastFallback);
      clearTimeout(mediumFallback);
      clearTimeout(safetyTimeout);
    };
  }, [onVideoEnd]);

  const handleVideoEnd = () => {
    if (!hasEnded.current) {
      hasEnded.current = true;
      onVideoEnd();
    }
  };

  return (
    <>
      {/* Full-screen gradient background that covers everything including status bar - GPU accelerated */}
      <div 
        className="fixed bg-gradient-to-br from-[#1a0a4e] via-[#2d1b69] to-[#1a0a4e] z-[9998] will-change-transform"
        style={{
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none',
          transform: 'translateZ(0)'
        }}
      />
      
      {/* Video container - GPU accelerated */}
      <div className="fixed z-[9999] will-change-transform" style={{ 
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
        height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        overflow: 'hidden',
        backgroundColor: '#000',
        transform: 'translateZ(0)'
      }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full opacity-100"
          style={{ 
            objectFit: 'cover',
            objectPosition: 'center',
            width: '100%',
            height: '100%'
          }}
          muted
          playsInline
          preload="auto"
          autoPlay
          src={loadingVideo}
          onEnded={handleVideoEnd}
          onPause={(e) => {
            // Prevent accidental pauses - keep video playing
            if (videoRef.current && !hasEnded.current && videoRef.current.currentTime < videoRef.current.duration) {
              videoRef.current.play().catch(() => {});
            }
          }}
        />
      </div>
    </>
  );
};
