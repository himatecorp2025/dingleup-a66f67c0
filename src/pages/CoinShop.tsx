import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ArrowLeft, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import gameBackground from '@/assets/game-background.png';
import BottomNav from '@/components/BottomNav';

/**
 * Coin Shop - Aranyérme vásárlás
 * 
 * Árazás:
 * - Alap: 200 aranyérme = $0.99
 * - Lépésköz: 100 aranyérme
 * - Ár kalkuláció: quantity * $0.00495 (lineáris)
 */

const BASE_COINS = 200;
const STEP_COINS = 100;
const PRICE_PER_COIN = 0.00495; // $0.99 / 200 = $0.00495

const CoinShop = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(BASE_COINS);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate price based on quantity
  const calculatePrice = (coins: number): number => {
    return Math.round(coins * PRICE_PER_COIN * 100) / 100;
  };

  const price = calculatePrice(quantity);

  const handleIncrease = () => {
    setQuantity(prev => prev + STEP_COINS);
  };

  const handleDecrease = () => {
    setQuantity(prev => Math.max(BASE_COINS, prev - STEP_COINS));
  };

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('errors.not_logged_in'));
        navigate('/auth/login');
        return;
      }

      toast.loading(t('payment.processing'), { id: 'coin-purchase' });

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-coin-purchase', {
        body: { quantity, priceInCents: Math.round(price * 100) },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error || !data?.url) {
        throw new Error(error?.message || t('errors.payment_failed'));
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Coin purchase error:', error);
      const errorMsg = error instanceof Error ? error.message : t('errors.payment_failed');
      toast.error(errorMsg, { id: 'coin-purchase' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-dvh w-screen overflow-hidden relative flex flex-col">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0" 
        style={{
          backgroundImage: `url(${gameBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-4 pt-safe pb-[calc(var(--bottom-nav-h)+1rem)]">
        {/* Header with back button */}
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-yellow-500/30 hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-yellow-400" />
          </button>
          <h1 
            className="text-2xl font-black"
            style={{
              background: 'linear-gradient(to right, #fbbf24, #ffffff, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(251, 191, 36, 0.3)'
            }}
          >
            {t('coin_shop.title')}
          </h1>
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Large coin icon */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)]">
              <Coins className="w-16 h-16 text-yellow-900" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
          </div>

          {/* Quantity selector */}
          <div className="flex flex-col items-center gap-4">
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
              {t('coin_shop.quantity')}
            </span>
            
            <div className="flex items-center gap-4">
              {/* Decrease button */}
              <button
                onClick={handleDecrease}
                disabled={quantity <= BASE_COINS}
                className="w-14 h-14 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:from-gray-600 hover:to-gray-800 transition-all active:scale-95"
              >
                <ChevronDown className="w-8 h-8 text-white" />
              </button>

              {/* Quantity display */}
              <div className="min-w-[140px] h-20 rounded-2xl bg-black/60 backdrop-blur-sm border-2 border-yellow-500/50 flex items-center justify-center px-6">
                <span 
                  className="text-4xl font-black"
                  style={{
                    background: 'linear-gradient(to bottom, #fef3c7, #fbbf24, #d97706)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {quantity.toLocaleString()}
                </span>
              </div>

              {/* Increase button */}
              <button
                onClick={handleIncrease}
                className="w-14 h-14 rounded-full bg-gradient-to-b from-yellow-500 to-yellow-700 border-2 border-yellow-400 flex items-center justify-center hover:from-yellow-400 hover:to-yellow-600 transition-all active:scale-95"
              >
                <ChevronUp className="w-8 h-8 text-yellow-900" />
              </button>
            </div>

            {/* Price display */}
            <div className="flex flex-col items-center gap-1 mt-2">
              <span className="text-white/50 text-xs uppercase tracking-wider">
                {t('coin_shop.price')}
              </span>
              <span className="text-3xl font-black text-green-400">
                ${price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Purchase button */}
          <Button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="mt-4 w-full max-w-xs h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:via-yellow-300 hover:to-yellow-400 text-black shadow-[0_4px_20px_rgba(251,191,36,0.4)] disabled:opacity-50"
          >
            {isProcessing ? t('payment.processing') : t('coin_shop.buy_now')}
          </Button>

          {/* Info text */}
          <p className="text-white/40 text-xs text-center max-w-xs">
            {t('coin_shop.info')}
          </p>
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default CoinShop;
