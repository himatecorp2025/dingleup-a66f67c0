import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, Heart } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

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
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] flex flex-col">
      {/* Header - fixed height */}
      <div className="flex-shrink-0 p-[clamp(0.75rem,2vh,1rem)]">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)]" />
          <span className="text-[clamp(0.75rem,3vw,0.875rem)]">{t('common.back')}</span>
        </button>
      </div>

      {/* Title - fixed height */}
      <div className="flex-shrink-0 text-center px-4 pb-[clamp(0.5rem,1.5vh,0.75rem)]">
        <h1 className="text-[clamp(1.25rem,5vw,1.5rem)] font-bold text-yellow-400 flex items-center justify-center gap-2">
          <Coins className="w-[clamp(1.5rem,6vw,2rem)] h-[clamp(1.5rem,6vw,2rem)]" />
          {t('shop.title')}
        </h1>
      </div>

      {/* Coin Packages Grid - flexible, scrollable if needed */}
      <div className="flex-1 overflow-y-auto px-[clamp(0.5rem,2vw,1rem)] pb-[calc(var(--bottom-nav-h,4rem)+0.5rem)]">
        <div className="grid grid-cols-3 gap-[clamp(0.375rem,1.5vw,0.75rem)] max-w-lg mx-auto">
          {COIN_PACKAGES.map((pkg) => (
            <button
              key={pkg.coins}
              onClick={() => handlePurchase(pkg.coins, pkg.price)}
              className="relative flex flex-col items-center justify-center 
                p-[clamp(0.5rem,2vw,0.75rem)] rounded-xl
                bg-gradient-to-br from-yellow-900/40 via-yellow-800/30 to-amber-900/40
                border border-yellow-500/30 hover:border-yellow-400/60
                shadow-lg shadow-yellow-900/20 hover:shadow-yellow-500/30
                transition-all duration-200 hover:scale-105 active:scale-95
                backdrop-blur-sm aspect-square"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              
              {/* Coin and Life icons row */}
              <div className="relative z-10 flex items-center justify-center gap-[clamp(0.25rem,1vw,0.5rem)] mb-[clamp(0.125rem,0.5vh,0.25rem)]">
                <div className="w-[clamp(1.25rem,6vw,1.5rem)] h-[clamp(1.25rem,6vw,1.5rem)] rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Coins className="w-[clamp(0.75rem,4vw,1rem)] h-[clamp(0.75rem,4vw,1rem)] text-yellow-900" />
                </div>
                {pkg.lives > 0 && (
                  <div className="w-[clamp(1.25rem,6vw,1.5rem)] h-[clamp(1.25rem,6vw,1.5rem)] rounded-full bg-gradient-to-br from-red-400 via-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <Heart className="w-[clamp(0.75rem,4vw,1rem)] h-[clamp(0.75rem,4vw,1rem)] text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Coin amount */}
              <span className="relative z-10 text-yellow-400 font-bold text-[clamp(0.75rem,3.5vw,1rem)] leading-tight">
                {pkg.coins.toLocaleString()}
              </span>

              {/* Lives amount */}
              {pkg.lives > 0 && (
                <span className="relative z-10 text-red-400 font-bold text-[clamp(0.625rem,2.5vw,0.75rem)] leading-tight">
                  +{pkg.lives} ❤️
                </span>
              )}

              {/* Price - doubled size */}
              <span className="relative z-10 text-white font-bold text-[clamp(1rem,5vw,1.5rem)] mt-[clamp(0.25rem,1vh,0.5rem)] bg-yellow-600/40 px-[clamp(0.5rem,2vw,0.75rem)] py-[clamp(0.125rem,0.5vh,0.25rem)] rounded-full border border-yellow-500/50">
                ${pkg.price.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CoinShop;
