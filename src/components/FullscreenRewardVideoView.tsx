import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

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
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [countdown, setCountdown] = useState(durationSecondsPerVideo);
  const [canClose, setCanClose] = useState(false);
  const watchedIdsRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalVideos = videos.length;
  const currentVideo = videos[currentVideoIndex];

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

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
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentVideoIndex, currentVideo?.id, totalVideos, durationSecondsPerVideo]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(watchedIdsRef.current);
    onClose();
  }, [canClose, onCompleted, onClose]);

  if (!currentVideo) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black" style={{ width: '100vw', height: '100dvh' }}>
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          key={currentVideo.id}
          src={currentVideo.embedUrl}
          className="absolute border-0 pointer-events-none"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150vw', height: '150dvh' }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
      
      {/* Black masks to hide platform UI */}
      <div className="absolute top-0 left-0 right-0 bg-black pointer-events-none" style={{ height: '15dvh' }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none" style={{ height: '15dvh' }} />
      <div className="absolute top-0 left-0 bottom-0 bg-black pointer-events-none" style={{ width: '10vw' }} />
      <div className="absolute top-0 right-0 bottom-0 bg-black pointer-events-none" style={{ width: '10vw' }} />

      {/* Countdown */}
      <div className="absolute z-10" style={{ top: 'max(env(safe-area-inset-top), 16px)', left: '16px' }}>
        <div className="bg-black/70 rounded-full w-14 h-14 flex items-center justify-center font-bold text-white text-xl border-2 border-white/30">
          {countdown}
        </div>
      </div>

      {/* Progress dots for multi-video */}
      {totalVideos > 1 && (
        <div className="absolute z-10 flex gap-2" style={{ top: 'max(env(safe-area-inset-top), 16px)', left: '50%', transform: 'translateX(-50%)' }}>
          {videos.map((_, idx) => (
            <div key={idx} className={`rounded-full ${idx <= currentVideoIndex ? 'bg-white' : 'bg-white/30'}`}
              style={{ width: idx === currentVideoIndex ? '24px' : '8px', height: '8px' }} />
          ))}
        </div>
      )}

      {/* Close button - only when all done */}
      {canClose && (
        <button onClick={handleClose} className="absolute z-10 bg-white/20 hover:bg-white/30 rounded-full p-3"
          style={{ top: 'max(env(safe-area-inset-top), 16px)', right: '16px' }}>
          <X className="text-white w-7 h-7" />
        </button>
      )}
    </div>
  );
};
