import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { CoinIcon3D } from '@/components/icons/CoinIcon3D';
import { HeartIcon3D } from '@/components/icons/HeartIcon3D';
const COIN_PACKAGES = [
  { coins: 300, price: 1.39, lives: 0 },
  { coins: 500, price: 2.19, lives: 0 },
  { coins: 700, price: 2.99, lives: 0 },
  { coins: 900, price: 3.79, lives: 10 },
  { coins: 1000, price: 3.99, lives: 15 },
  { coins: 1500, price: 5.49, lives: 25 },
  { coins: 2500, price: 8.49, lives: 40 },
  { coins: 3000, price: 9.99, lives: 60 },
  { coins: 5000, price: 14.99, lives: 100 },
];

const CoinShop = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handlePurchase = (coins: number, price: number) => {
    toast.info(`${coins} ${t('shop.coins_purchase')} - $${price.toFixed(2)}`);
  };

  return (
    <div className="h-dvh w-screen fixed inset-0 overflow-y-auto overflow-x-hidden flex flex-col" style={{
      paddingTop: 'max(calc(env(safe-area-inset-top) + 2%), env(safe-area-inset-top) + 8px)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      width: '100vw',
      maxWidth: '100vw',
      maxHeight: '100vh',
      touchAction: 'pan-y',
      overscrollBehaviorX: 'none'
    }}>
      {/* Full-screen background that covers status bar */}
      <div 
        className="fixed bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]"
        style={{
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none'
        }}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden" style={{ 
        width: '100%',
        maxWidth: '100%',
        paddingTop: 'clamp(8px, 2vh, 16px)',
        paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 120px)' 
      }}>
        <div style={{ 
          width: '90vw',
          maxWidth: '90vw',
          margin: '0 auto'
        }}>
          {/* Header - Back button and Title */}
          <div className="flex items-center justify-between mb-4">
            {/* 3D Back Button - matching Profile page style */}
            <button
              onClick={() => navigate('/dashboard')}
              className="relative rounded-full hover:scale-110 transition-all"
              style={{
                padding: 'clamp(8px, 2vw, 12px)',
                minWidth: 'clamp(40px, 10vw, 56px)',
                minHeight: 'clamp(40px, 10vw, 56px)'
              }}
              title={t('common.back')}
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
                style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
              />
            </button>

            {/* 3D Title */}
            <div className="relative text-center flex-1">
              <h1 
                className="text-[clamp(1rem,4vw,1.5rem)] font-bold"
                style={{
                  background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.4)'
                }}
              >
                Szerezz előnyt még ma!
              </h1>
              <p 
                className="text-[clamp(0.65rem,2.5vw,0.875rem)] font-medium mt-0.5"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                }}
              >
                Gyűjts be az aranyakat és az extra életeket!
              </p>
            </div>

            {/* Spacer for alignment */}
            <div style={{ minWidth: 'clamp(40px, 10vw, 56px)' }} />
          </div>

          {/* Coin Packages Grid with 3D styling */}
          <div className="grid grid-cols-3 gap-[clamp(0.375rem,1.5vw,0.75rem)] max-w-lg mx-auto">
            {COIN_PACKAGES.map((pkg) => (
              <button
                key={pkg.coins}
                onClick={() => handlePurchase(pkg.coins, pkg.price)}
                className="relative flex flex-col items-center justify-center 
                  p-[clamp(0.5rem,2vw,0.75rem)] rounded-xl
                  transition-all duration-200 hover:scale-105 active:scale-95
                  aspect-square group"
                style={{
                  background: 'linear-gradient(145deg, rgba(120, 85, 10, 0.6) 0%, rgba(80, 55, 5, 0.7) 50%, rgba(50, 30, 5, 0.8) 100%)',
                  border: '2px solid rgba(251, 191, 36, 0.4)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 0 20px rgba(251, 191, 36, 0.15)'
                }}
              >
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.2) 0%, transparent 70%)',
                    boxShadow: '0 0 30px rgba(251, 191, 36, 0.3)'
                  }}
                />
                
                {/* 3D inner frame */}
                <div 
                  className="absolute inset-[2px] rounded-lg pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)'
                  }}
                />

                {/* Icons with values below - coin on left, heart on right with + between */}
                <div className="relative z-10 flex items-center justify-center gap-[clamp(0.25rem,1vw,0.5rem)]">
                  {/* Coin column */}
                  <div className="flex flex-col items-center">
                    <CoinIcon3D size={28} />
                    <span 
                      className="font-bold text-[clamp(0.7rem,3vw,0.875rem)] leading-tight"
                      style={{
                        background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                      }}
                    >
                      {pkg.coins.toLocaleString()}
                    </span>
                  </div>

                  {/* Plus sign between - 50% larger */}
                  {pkg.lives > 0 && (
                    <span 
                      className="font-bold text-[clamp(1.3rem,6vw,1.875rem)] leading-none"
                      style={{
                        background: 'linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                      }}
                    >
                      +
                    </span>
                  )}

                  {/* Heart column */}
                  {pkg.lives > 0 && (
                    <div className="flex flex-col items-center">
                      <HeartIcon3D size={28} />
                      <span 
                        className="font-bold text-[clamp(0.7rem,3vw,0.875rem)] leading-tight"
                        style={{
                          background: 'linear-gradient(180deg, #f87171 0%, #ef4444 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                        }}
                      >
                        {pkg.lives}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3D Price Button */}
                <div 
                  className="relative z-10 mt-[clamp(0.25rem,1vh,0.5rem)] px-[clamp(0.5rem,2vw,0.75rem)] py-[clamp(0.125rem,0.5vh,0.25rem)] rounded-full"
                  style={{
                    background: 'linear-gradient(145deg, #fbbf24 0%, #d97706 50%, #92400e 100%)',
                    border: '1px solid rgba(251, 191, 36, 0.6)',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)'
                  }}
                >
                  <span className="text-white font-bold text-[clamp(1rem,5vw,1.5rem)]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                    ${pkg.price.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CoinShop;
