import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const COIN_PACKAGES = [
  { coins: 200, price: 0.99 },
  { coins: 300, price: 1.39 },
  { coins: 400, price: 1.79 },
  { coins: 500, price: 2.19 },
  { coins: 600, price: 2.59 },
  { coins: 700, price: 2.99 },
  { coins: 800, price: 3.39 },
  { coins: 900, price: 3.79 },
  { coins: 1000, price: 3.99 },
  { coins: 1500, price: 5.49 },
  { coins: 2000, price: 6.99 },
  { coins: 2500, price: 8.49 },
  { coins: 3000, price: 9.99 },
  { coins: 4000, price: 12.99 },
  { coins: 5000, price: 14.99 },
];

const CoinShop = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handlePurchase = (coins: number, price: number) => {
    // Payment integration will be added later
    toast.info(`${coins} ${t('shop.coins_purchase')} - $${price.toFixed(2)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-[#1a0033] to-transparent p-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Title */}
      <div className="text-center px-4 mb-6">
        <h1 className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-2">
          <Coins className="w-8 h-8" />
          {t('shop.title')}
        </h1>
      </div>

      {/* Coin Packages Grid */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          {COIN_PACKAGES.map((pkg) => (
            <button
              key={pkg.coins}
              onClick={() => handlePurchase(pkg.coins, pkg.price)}
              className="relative flex flex-col items-center justify-center p-3 rounded-xl
                bg-gradient-to-br from-yellow-900/40 via-yellow-800/30 to-amber-900/40
                border border-yellow-500/30 hover:border-yellow-400/60
                shadow-lg shadow-yellow-900/20 hover:shadow-yellow-500/30
                transition-all duration-200 hover:scale-105 active:scale-95
                backdrop-blur-sm"
              style={{ minHeight: 'clamp(90px, 15vh, 120px)' }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              
              {/* Coin icon */}
              <div className="relative z-10 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Coins className="w-5 h-5 text-yellow-900" />
                </div>
              </div>

              {/* Coin amount */}
              <span className="relative z-10 text-yellow-400 font-bold text-lg leading-tight">
                {pkg.coins.toLocaleString()}
              </span>

              {/* Price */}
              <span className="relative z-10 text-white/90 font-semibold text-sm mt-1 bg-yellow-600/30 px-2 py-0.5 rounded-full">
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
