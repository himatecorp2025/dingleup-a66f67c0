import { memo } from 'react';
import { LogOut } from "lucide-react";
import { DiamondHexagon } from "@/components/DiamondHexagon";

import { useI18n } from "@/i18n";

interface GameHeaderProps {
  lives: number;
  maxLives: number;
  coins: number;
  onExit: () => void;
}

export const GameHeader = memo(({ lives, maxLives, coins, onExit }: GameHeaderProps) => {
  const { t } = useI18n();
  
  return (
    <div 
      className="flex justify-between items-center"
      style={{
        marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
        paddingLeft: 'clamp(0.5rem, 1.5vw, 1rem)',
        paddingRight: 'clamp(0.5rem, 1.5vw, 1rem)'
      }}
    >
      {/* Exit button with 3D Box Style matching Leaderboard back button */}
      <button
        onClick={onExit}
        className="relative rounded-full hover:scale-110 transition-all"
        style={{
          padding: 'clamp(8px, 2vw, 12px)',
          minWidth: 'clamp(40px, 10vw, 56px)',
          minHeight: 'clamp(40px, 10vw, 56px)'
        }}
        title={t('game.exit_title')}
        aria-label={t('game.exit_aria')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExit();
          }
        }}
      >
        {/* BASE SHADOW */}
        <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} aria-hidden />
        
        {/* OUTER FRAME */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-700 via-red-600 to-red-900 border-2 border-red-400/50 shadow-lg" aria-hidden />
        
        {/* MIDDLE FRAME */}
        <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-red-600 via-red-500 to-red-800" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }} aria-hidden />
        
        {/* INNER LAYER */}
        <div className="absolute inset-[5px] rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-700" style={{ boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.3)' }} aria-hidden />
        
        {/* SPECULAR HIGHLIGHT */}
        <div className="absolute inset-[5px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)' }} aria-hidden />
        
        {/* Icon */}
        <LogOut 
          className="text-white relative z-10 -scale-x-100" 
          style={{ 
            width: 'clamp(20px, 5vw, 24px)',
            height: 'clamp(20px, 5vw, 24px)'
          }}
        />
      </button>

      <div
        className="flex flex-col items-center"
        style={{ gap: 'clamp(8px, 2vw, 12px)' }}
      >
        <div className="flex" style={{ gap: 'clamp(8px, 2vw, 12px)' }}>
          <DiamondHexagon
            type="lives"
            value={`${lives}/${maxLives}`}
            compact
          />
          <DiamondHexagon
            type="coins"
            value={coins}
            compact
          />
        </div>
      </div>
    </div>
  );
});

GameHeader.displayName = 'GameHeader';
