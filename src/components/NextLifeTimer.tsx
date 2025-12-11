import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n';

interface NextLifeTimerProps {
  nextLifeAt: string | null;
  livesCurrent: number;
  livesMax: number;
  serverDriftMs?: number;
  onExpired?: () => void;
  isSpeedBoost?: boolean;
}

export const NextLifeTimer = ({ 
  nextLifeAt, 
  livesCurrent, 
  livesMax,
  serverDriftMs = 0,
  onExpired,
  isSpeedBoost = false
}: NextLifeTimerProps) => {
  const { t } = useI18n();
  const [remainingMs, setRemainingMs] = useState(0);
  const hasExpiredRef = useRef(false);

  // Reset expiry flag when a new timer starts (nextLifeAt or isSpeedBoost changes)
  useEffect(() => {
    hasExpiredRef.current = false;
  }, [nextLifeAt, isSpeedBoost]);

  useEffect(() => {
    // For speed boost timer, always show countdown even if lives are at max
    if (!nextLifeAt || (!isSpeedBoost && livesCurrent >= livesMax)) {
      setRemainingMs(0);
      return;
    }

    const targetTime = new Date(nextLifeAt).getTime();

    const updateRemaining = () => {
      const now = Date.now() + serverDriftMs;
      const diff = Math.max(0, targetTime - now);
      setRemainingMs(diff);
      
      // When timer reaches 00:00, trigger refresh ONCE
      if (diff <= 0 && onExpired && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpired();
      }
    };

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 1000);

    return () => clearInterval(intervalId);
  }, [nextLifeAt, livesCurrent, livesMax, serverDriftMs, onExpired, isSpeedBoost]);

  // Hide timer when lives are at max (but not for speed boost)
  if ((!isSpeedBoost && livesCurrent >= livesMax) || remainingMs === 0) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  // Show just seconds (e.g., "60", "59", "58"...)
  const formattedTime = totalSeconds.toString();

  return (
    <div 
      className="absolute bottom-0 rounded-md z-50 text-[10px]"
      title={t('timer.next_life')}
      style={{ 
        perspective: '1000px',
        width: '44px',
        height: '20px',
        left: '50%',
        transform: 'translateX(-50%) translateY(100%)'
      }}
    >
      {/* DEEP BOTTOM SHADOW - Multiple layers for depth */}
      <div 
        className="absolute inset-0 bg-background/70 rounded-md" 
        style={{ 
          transform: 'translate(4px, 6px) rotateX(5deg)', 
          filter: 'blur(6px)' 
        }} 
        aria-hidden 
      />
      <div 
        className="absolute inset-0 bg-background/40 rounded-md" 
        style={{ 
          transform: 'translate(2px, 4px) rotateX(3deg)', 
          filter: 'blur(4px)' 
        }} 
        aria-hidden 
      />
      
      {/* DEEP 3D LAYERS - Bottom to top */}
      {/* Layer 5 - Deepest */}
      <div 
        className="absolute inset-0 rounded-md bg-gradient-to-b from-accent-darker via-accent-dark to-accent-darkest border-2 border-accent-darkest/80" 
        style={{ 
          transform: 'translateZ(-20px) rotateX(2deg)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
        }} 
        aria-hidden 
      />
      
      {/* Layer 4 */}
      <div 
        className="absolute inset-0 rounded-md bg-gradient-to-b from-accent-dark via-accent to-accent-dark border-2 border-accent-dark/70" 
        style={{ 
          transform: 'translateZ(-15px) rotateX(1.5deg)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.5)'
        }} 
        aria-hidden 
      />
      
      {/* Layer 3 */}
      <div 
        className="absolute inset-0 rounded-md bg-gradient-to-b from-accent via-accent-glow to-accent border-2 border-accent/60" 
        style={{ 
          transform: 'translateZ(-10px) rotateX(1deg)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
        }} 
        aria-hidden 
      />
      
      {/* Layer 2 */}
      <div 
        className="absolute inset-0 rounded-md bg-gradient-to-b from-accent-glow via-accent-light to-accent border-2 border-accent/50" 
        style={{ 
          transform: 'translateZ(-5px) rotateX(0.5deg)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)'
        }} 
        aria-hidden 
      />
      
      {/* TOP SURFACE - Brightest gold */}
      <div 
        className="absolute inset-0 rounded-md bg-gradient-to-b from-accent-light via-accent-glow to-accent border-2 border-accent-glow/40" 
        style={{ 
          transform: 'translateZ(0px)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 20px hsl(var(--accent)/0.5)'
        }} 
        aria-hidden 
      />
      
      {/* BRIGHT SPECULAR HIGHLIGHT */}
      <div 
        className="absolute inset-[2px] rounded-sm pointer-events-none" 
        style={{ 
          background: 'radial-gradient(ellipse 120% 70% at 40% 10%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)',
          transform: 'translateZ(5px)'
        }} 
        aria-hidden 
      />
      
      {/* TEXT - Clean black, no effects */}
      <span 
        className="relative z-10 font-extrabold leading-none flex items-center justify-center" 
        style={{ 
          transform: 'translateZ(10px)',
          textShadow: 'none',
          color: '#000000',
          padding: '1px',
          width: '100%',
          height: '100%'
        }}
      >
        {formattedTime}
      </span>
    </div>
  );
};
