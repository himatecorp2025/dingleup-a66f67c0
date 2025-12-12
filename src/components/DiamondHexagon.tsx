import React from 'react';
import { useI18n } from '@/i18n/useI18n';
import defaultProfileImage from '@/assets/default-profile.png';

interface DiamondHexagonProps {
  type: 'rank' | 'coins' | 'lives' | 'avatar';
  value: string | number;
  className?: string;
  avatarUrl?: string | null;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * 3D Diamond Hexagon with SVG icons
 * Responsive design with diamond cross pattern
 */
export const DiamondHexagon: React.FC<DiamondHexagonProps> = ({ type, value, className = '', avatarUrl, onClick, compact = false }) => {
  const { t } = useI18n();
  // Color schemes per type
  const colorSchemes = {
    rank: {
      gradientOuter: 'from-red-900 via-red-600 to-red-800',
      gradientMiddle: 'from-red-600 via-red-400 to-red-700',
      gradientInner: 'from-red-400 via-red-500 to-red-700',
      borderColor: 'border-red-400',
      shadowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.6),0_8px_25px_rgba(0,0,0,0.5)]',
      glowColor: 'rgba(239, 68, 68, 0.4)',
      iconColor: 'hsl(var(--foreground))',
    },
    coins: {
      gradientOuter: 'from-yellow-900 via-yellow-600 to-yellow-800',
      gradientMiddle: 'from-yellow-600 via-yellow-400 to-yellow-700',
      gradientInner: 'from-yellow-400 via-yellow-500 to-yellow-700',
      borderColor: 'border-yellow-400',
      shadowColor: 'shadow-[0_0_20px_rgba(234,179,8,0.6),0_8px_25px_rgba(0,0,0,0.5)]',
      glowColor: 'rgba(234, 179, 8, 0.4)',
      iconColor: 'hsl(var(--foreground))',
    },
    lives: {
      gradientOuter: 'from-red-900 via-red-600 to-red-800',
      gradientMiddle: 'from-red-600 via-red-400 to-red-700',
      gradientInner: 'from-red-400 via-red-500 to-red-700',
      borderColor: 'border-red-400',
      shadowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.6),0_8px_25px_rgba(0,0,0,0.5)]',
      glowColor: 'rgba(239, 68, 68, 0.4)',
      iconColor: 'hsl(var(--foreground))',
    },
    avatar: {
      gradientOuter: 'from-cyan-900 via-cyan-600 to-cyan-800',
      gradientMiddle: 'from-cyan-600 via-cyan-400 to-cyan-700',
      gradientInner: 'from-cyan-400 via-cyan-500 to-cyan-700',
      borderColor: 'border-cyan-400',
      shadowColor: 'shadow-[0_0_20px_rgba(34,211,238,0.6),0_8px_25px_rgba(0,0,0,0.5)]',
      glowColor: 'rgba(34, 211, 238, 0.4)',
      iconColor: 'hsl(var(--foreground))',
    },
  };

  const colors = colorSchemes[type];

  // SVG Icons
  const renderIcon = () => {
    const iconSize = 16; // Base size for mobile
    const color = colors.iconColor;

    switch (type) {
      case 'rank':
        // Use same heart icon as lives hexagon (full visual copy)
        return (
          <svg
            className="drop-shadow-lg"
            style={{ width: 'clamp(12px, 2vh, 20px)', height: 'clamp(12px, 2vh, 20px)' }}
            viewBox="0 0 24 24"
            fill={color}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              stroke="hsl(var(--destructive))"
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'coins':
        // Coin SVG
        return (
          <svg
            className="drop-shadow-lg"
            style={{ width: 'clamp(12px, 2vh, 20px)', height: 'clamp(12px, 2vh, 20px)' }}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="9" fill={color} stroke="hsl(var(--accent-dark))" strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" fill="none" stroke="hsl(var(--accent-dark))" strokeWidth="1.5" opacity="0.5"/>
            <text x="12" y="16" textAnchor="middle" fill="hsl(var(--accent-dark))" fontSize="10" fontWeight="bold">$</text>
          </svg>
        );
      case 'lives':
        // Heart SVG
        return (
          <svg
            className="drop-shadow-lg"
            style={{ width: 'clamp(12px, 2vh, 20px)', height: 'clamp(12px, 2vh, 20px)' }}
            viewBox="0 0 24 24"
            fill={color}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              stroke="hsl(var(--destructive))"
              strokeWidth="1.5"
            />
          </svg>
        );
    }
  };

  // Accessibility labels
  const getAriaLabel = () => {
    switch (type) {
      case 'rank':
        return `${t('hexagon.rank')}: ${value}`;
      case 'coins':
        return `${t('hexagon.coins')}: ${value}`;
      case 'lives':
        return `${t('hexagon.lives')}: ${value}`;
      case 'avatar':
        return `${t('profile.title')}`;
      default:
        return '';
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Original hexagon design for all types (rank, coins, lives, avatar)
  const containerElement = onClick ? 'button' : 'div';
  const containerProps =
    onClick
      ? { 
          onClick, 
          type: 'button' as const,
          className: `relative ${className}`,
          style: { 
            background: 'transparent', 
            border: 'none', 
            padding: 0, 
            margin: 0,
            display: 'block',
            verticalAlign: 'baseline',
            lineHeight: 0,
            cursor: 'pointer'
          }
        }
      : { className: `relative ${className}` };

  return React.createElement(
    containerElement,
    { ...containerProps, role: "status", "aria-label": getAriaLabel() },
    <>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse"
        style={{ background: colors.glowColor }}
      />

      {/* 3D Hexagon Container - max height limited to Leaderboard back button size */}
      <div className="relative" style={{ width: 'clamp(48px, 7vh, 56px)', height: 'clamp(48px, 7vh, 56px)' }}>
        {/* BASE SHADOW (3D depth) */}
        <div
          className="absolute clip-hexagon"
          style={{
            top: '3px',
            left: '3px',
            right: '-3px',
            bottom: '-3px',
            background: 'rgba(0,0,0,0.35)',
            filter: 'blur(3px)',
          }}
          aria-hidden
        />

        {/* OUTER FRAME - gradient with border */}
        <div
          className={`absolute inset-0 clip-hexagon bg-gradient-to-br ${colors.gradientOuter} border-2 ${colors.borderColor} ${colors.shadowColor}`}
          aria-hidden
        />

        {/* MIDDLE FRAME (bright inner highlight) */}
        <div
          className={`absolute inset-[3px] clip-hexagon bg-gradient-to-b ${colors.gradientMiddle}`}
          style={{ boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.15)' }}
          aria-hidden
        />

        {/* INNER CRYSTAL/COLOR LAYER */}
        <div
          className={`absolute clip-hexagon bg-gradient-to-b ${colors.gradientInner}`}
          style={{
            top: '5px',
            left: '5px',
            right: '5px',
            bottom: '5px',
            boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.1), inset 0 -4px 8px rgba(0,0,0,0.15)',
          }}
          aria-hidden
        />

        {/* SPECULAR HIGHLIGHT (top-left) */}
        <div
          className="absolute clip-hexagon pointer-events-none"
          style={{
            top: '5px',
            left: '5px',
            right: '5px',
            bottom: '5px',
            background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)',
          }}
          aria-hidden
        />


        {/* INNER GLOW (bottom shadow for 3D depth) */}
        <div
          className="absolute clip-hexagon pointer-events-none"
          style={{
            top: '5px',
            left: '5px',
            right: '5px',
            bottom: '5px',
            boxShadow: 'inset 0 0 5px rgba(0,0,0,0.125)',
          }}
          aria-hidden
        />

        {/* Content: avatar esetén külön struktúra közvetlenül inset-[5px]-el, más típusoknál inset-0 + translateY */}
        {type === 'avatar' ? (
          // Avatar Image - inset-y-[3.5px]
          <div className="absolute inset-x-[5px] inset-y-[3.5px] flex items-center justify-center z-[5]">
            <img
              src={avatarUrl || defaultProfileImage}
              alt={String(value)}
              className="w-full h-full object-cover clip-hexagon"
            />
          </div>
        ) : (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center z-10" 
            style={compact 
              ? { gap: '2px' } 
              : { transform: 'translateY(-4px)', gap: 'clamp(2px, 0.5vh, 4px)' }
            }
          >
            {renderIcon()}
            <span 
              className="text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              style={compact 
                ? { fontSize: 'clamp(0.625rem, 1.5vh, 1rem)' }
                : { fontSize: 'clamp(0.625rem, 1.5vh, 1rem)', marginTop: 'clamp(4px, 1vh, 8px)' }
              }
            >
              {value}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

