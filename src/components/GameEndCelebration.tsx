import { useState, useEffect } from 'react';
import { Film, Sparkles, Trophy, Star, Zap } from 'lucide-react';
import { useI18n } from '@/i18n';
import { CoinIcon3D } from './icons/CoinIcon3D';

interface GameEndCelebrationProps {
  isVisible: boolean;
  correctAnswers: number;
  coinsEarned: number;
  avgResponseTime: string;
  onDoubleRewardClick: () => void;
  onDismiss: () => void;
  videoAdAvailable?: boolean;
}

export const GameEndCelebration = ({
  isVisible,
  correctAnswers,
  coinsEarned,
  avgResponseTime,
  onDoubleRewardClick,
  onDismiss,
  videoAdAvailable = true,
}: GameEndCelebrationProps) => {
  const { t } = useI18n();
  const [showContent, setShowContent] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate celebration particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        size: Math.random() * 8 + 4,
      }));
      setParticles(newParticles);
      
      // Animate content in
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const performanceRating = correctAnswers >= 12 ? 'excellent' : correctAnswers >= 8 ? 'good' : 'okay';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ 
        background: 'radial-gradient(ellipse at center, rgba(88, 28, 135, 0.95) 0%, rgba(15, 15, 35, 0.98) 100%)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onDismiss}
    >
      {/* Animated particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: particle.id % 3 === 0 
              ? 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' 
              : particle.id % 3 === 1
              ? 'radial-gradient(circle, #a78bfa 0%, transparent 70%)'
              : 'radial-gradient(circle, #60a5fa 0%, transparent 70%)',
            borderRadius: '50%',
            animation: `float-particle ${3 + particle.delay}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Main celebration card */}
      <div 
        className={`relative mx-4 max-w-sm w-full transition-all duration-700 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: showContent ? 'translateY(0)' : 'translateY(50px)',
        }}
      >
        {/* Outer glow */}
        <div 
          className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #a855f7 50%, #3b82f6 100%)',
          }}
        />

        {/* Card container with 3D effect */}
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(88, 28, 135, 0.9) 0%, rgba(30, 20, 60, 0.95) 100%)',
            border: '3px solid transparent',
            borderImage: 'linear-gradient(180deg, #fbbf24 0%, #a855f7 50%, #fbbf24 100%) 1',
            boxShadow: `
              0 0 60px rgba(251, 191, 36, 0.4),
              0 20px 60px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.2),
              inset 0 -1px 0 rgba(0, 0, 0, 0.3)
            `,
          }}
        >
          {/* Top decorative bar */}
          <div 
            className="h-1.5"
            style={{
              background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 25%, #fbbf24 50%, #f59e0b 75%, #fbbf24 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />

          <div className="p-6">
            {/* Trophy section with 3D effect */}
            <div className="flex flex-col items-center mb-4">
              <div 
                className="relative mb-3"
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(251, 191, 36, 0.5))',
                }}
              >
                {/* Trophy glow ring */}
                <div 
                  className="absolute inset-0 -m-4 rounded-full animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
                  }}
                />
                <Trophy 
                  className={`w-16 h-16 ${performanceRating === 'excellent' ? 'text-yellow-400' : performanceRating === 'good' ? 'text-yellow-500' : 'text-yellow-600'}`}
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))',
                    animation: 'trophy-bounce 1s ease-out',
                  }}
                />
                {/* Stars around trophy */}
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse" />
                <Star className="absolute -bottom-1 -left-3 w-5 h-5 text-yellow-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>

              {/* Title with gradient */}
              <h2 
                className="text-2xl font-black tracking-wide"
                style={{
                  background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 10px rgba(251, 191, 36, 0.5)',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              >
                {t('game_results.title')}
              </h2>
            </div>

            {/* Stats grid with 3D boxes */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Correct answers box */}
              <div 
                className="flex flex-col items-center p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                  border: '2px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <div className="text-2xl mb-1">✅</div>
                <div className="font-bold text-green-400 text-xl">{correctAnswers}/15</div>
                <div className="text-[10px] text-green-300/70 uppercase tracking-wider">{t('game_results.correct')}</div>
              </div>

              {/* Coins earned box */}
              <div 
                className="flex flex-col items-center p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)',
                  border: '2px solid rgba(251, 191, 36, 0.4)',
                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <CoinIcon3D size={28} className="mb-1" />
                <div className="font-bold text-yellow-400 text-xl">{coinsEarned}</div>
                <div className="text-[10px] text-yellow-300/70 uppercase tracking-wider">{t('game_results.gold')}</div>
              </div>

              {/* Time box */}
              <div 
                className="flex flex-col items-center p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <Zap className="w-7 h-7 text-blue-400 mb-1" />
                <div className="font-bold text-blue-400 text-xl">{avgResponseTime}s</div>
                <div className="text-[10px] text-blue-300/70 uppercase tracking-wider">{t('game_results.time')}</div>
              </div>
            </div>

            {/* DOUBLE REWARD SECTION - Most prominent */}
            {coinsEarned > 0 && videoAdAvailable && (
              <div className="mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDoubleRewardClick();
                  }}
                  className="w-full relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 70%, #fbbf24 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient-shift 3s ease infinite',
                    boxShadow: `
                      0 0 30px rgba(251, 191, 36, 0.6),
                      0 8px 25px rgba(217, 119, 6, 0.5),
                      inset 0 2px 0 rgba(255, 255, 255, 0.4),
                      inset 0 -2px 0 rgba(0, 0, 0, 0.2)
                    `,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {/* Shimmer effect */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      animation: 'shimmer-slide 2s ease-in-out infinite',
                    }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-center gap-3">
                    {/* Double coins visual */}
                    <div className="flex -space-x-2">
                      <CoinIcon3D size={36} className="relative z-10" />
                      <CoinIcon3D size={36} className="relative z-0 opacity-90" />
                    </div>

                    {/* Text */}
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-2xl font-black"
                          style={{
                            color: '#1a1a2e',
                            textShadow: '0 1px 0 rgba(255,255,255,0.5)',
                          }}
                        >
                          {coinsEarned * 2}
                        </span>
                        <span 
                          className="text-lg font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(0,0,0,0.2)',
                            color: '#1a1a2e',
                          }}
                        >
                          2×
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#1a1a2e' }}>
                        <Film className="w-4 h-4" />
                        <span>{t('game_results.watch_to_double')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsing border effect */}
                  <div 
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: '2px solid rgba(255, 255, 255, 0.6)',
                      animation: 'pulse-border 1.5s ease-in-out infinite',
                    }}
                  />
                </button>
              </div>
            )}

            {/* Swipe instruction */}
            <div 
              className="text-center text-sm font-semibold text-white/70 animate-pulse"
            >
              {t('game_results.swipe_for_new')}
            </div>
          </div>

          {/* Bottom decorative bar */}
          <div 
            className="h-1"
            style={{
              background: 'linear-gradient(90deg, #a855f7 0%, #7c3aed 50%, #a855f7 100%)',
            }}
          />
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes trophy-bounce {
          0% { transform: scale(0) rotate(-10deg); }
          50% { transform: scale(1.2) rotate(5deg); }
          70% { transform: scale(0.9) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-border {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default GameEndCelebration;
