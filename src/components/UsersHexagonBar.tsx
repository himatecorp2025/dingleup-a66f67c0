import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DiamondHexagon } from './DiamondHexagon';
import { RankHexagon } from './RankHexagon';
import { NextLifeTimer } from './NextLifeTimer';
import { useI18n } from '@/i18n/useI18n';

interface UsersHexagonBarProps {
  username: string;
  rank: number | null;
  coins: number;
  lives: number;
  livesMax: number;
  nextLifeAt: string | null;
  serverDriftMs?: number;
  onLifeExpired?: () => void;
  activeSpeedToken?: {
    expiresAt: string;
    durationMinutes: number;
  } | null;
  avatarUrl?: string | null;
  className?: string;
}

/**
 * Users hexagon bar component
 * Purple SVG background container with 4 hexagons positioned inside:
 * - Blue hexagon (rank)
 * - Gold hexagon (coins)
 * - Red hexagon (lives)
 * - Purple hexagon (avatar)
 */
export const UsersHexagonBar: React.FC<UsersHexagonBarProps> = ({
  username,
  rank,
  coins,
  lives,
  livesMax,
  nextLifeAt,
  serverDriftMs = 0,
  onLifeExpired,
  activeSpeedToken,
  avatarUrl,
  className = ''
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`relative ${className}`} style={{ minWidth: '260px', minHeight: '120px' }}>
      {/* Rank Hexagon */}
      <div className="absolute z-10 flex flex-col items-center" style={{ left: '15%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <RankHexagon
          value={rank !== null ? rank : '...'}
          onClick={() => navigate('/leaderboard')}
        />
        <span className="text-white uppercase text-xs font-bold mt-1" style={{ 
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
        }}>
          {t('hexagon.rank')}
        </span>
      </div>

      {/* Coins Hexagon */}
      <div className="absolute z-10 flex flex-col items-center" style={{ left: '40%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <DiamondHexagon type="coins" value={coins} onClick={() => navigate('/coin-shop')} />
        <span className="text-white uppercase text-xs font-bold mt-1" style={{ 
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
        }}>
          {t('hexagon.gold')}
        </span>
      </div>

      {/* Lives Hexagon */}
      <div className="absolute z-10 flex flex-col items-center" style={{ left: '65%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <div className="relative flex flex-col items-center">
          <DiamondHexagon type="lives" value={`${lives}/${livesMax}`} onClick={() => navigate('/invitation')} />
          {activeSpeedToken ? (
            <NextLifeTimer
              nextLifeAt={activeSpeedToken.expiresAt}
              livesCurrent={lives}
              livesMax={livesMax}
              serverDriftMs={serverDriftMs}
              onExpired={onLifeExpired}
              isSpeedBoost={true}
            />
          ) : (
            <NextLifeTimer
              nextLifeAt={nextLifeAt}
              livesCurrent={lives}
              livesMax={livesMax}
              serverDriftMs={serverDriftMs}
              onExpired={onLifeExpired}
            />
          )}
          <span className="text-white uppercase text-xs font-bold mt-1" style={{ 
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
          }}>
            {t('hexagon.lives')}
          </span>
        </div>
      </div>

      {/* Avatar Hexagon */}
      <div className="absolute z-10 flex flex-col items-center" style={{ left: '90%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <DiamondHexagon 
          type="avatar" 
          value={username} 
          avatarUrl={avatarUrl}
          onClick={() => navigate('/profile')}
        />
        <span className="text-white uppercase text-xs font-bold mt-1" style={{ 
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
        }}>
          {t('hexagon.profile')}
        </span>
      </div>
    </div>
  );
};
