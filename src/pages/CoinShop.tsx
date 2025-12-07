import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { useMobilePayment } from '@/hooks/useMobilePayment';
import gameBackground from '@/assets/game-background.png';
import BottomNav from '@/components/BottomNav';

/**
 * Coin Shop - Aranyérme vásárlás
 * 
 * Fix árazási struktúra lépcsőkkel - Apple Pay / Google Pay támogatással
 */

const COIN_TIERS = [
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
  const [tierIndex, setTierIndex] = useState(0);
  const { startPayment, isProcessing } = useMobilePayment();

  const currentTier = COIN_TIERS[tierIndex];
  const quantity = currentTier.coins;
  const price = currentTier.price;

  const handleIncrease = () => {
    setTierIndex(prev => Math.min(COIN_TIERS.length - 1, prev + 1));
  };

  const handleDecrease = () => {
    setTierIndex(prev => Math.max(0, prev - 1));
  };

  const handlePurchase = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('errors.not_logged_in'));
        navigate('/auth/login');
        return;
      }

      // Apple Pay / Google Pay indítása
      await startPayment({
        productType: 'coins',
        amount: Math.round(price * 100), // cents
        currency: 'usd',
        displayName: `${quantity} Gold Coins`,
        metadata: { 
          coin_quantity: String(quantity) 
        },
        onSuccess: () => {
          toast.success(t('payment.success'));
          navigate('/dashboard');
        },
        onError: (error) => {
          console.error('Coin purchase error:', error);
          toast.error(t('errors.payment_failed'));
        }
      });
    } catch (error) {
      console.error('Coin purchase error:', error);
      toast.error(t('errors.payment_failed'));
    }
  };

  // 3D Coin Icon SVG
  const Coin3DIcon = () => (
    <svg viewBox="0 0 120 120" className="w-28 h-28 sm:w-36 sm:h-36 drop-shadow-[0_8px_24px_rgba(251,191,36,0.6)]">
      <defs>
        <linearGradient id="coinGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="25%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="75%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="coinEdgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="coinShine" cx="35%" cy="35%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="coinShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.4"/>
        </filter>
      </defs>
      
      {/* 3D Edge/Rim */}
      <ellipse cx="60" cy="68" rx="48" ry="12" fill="url(#coinEdgeGradient)" />
      
      {/* Main coin face */}
      <circle cx="60" cy="56" r="48" fill="url(#coinGoldGradient)" filter="url(#coinShadow)" />
      
      {/* Inner ring */}
      <circle cx="60" cy="56" r="40" fill="none" stroke="#b45309" strokeWidth="3" opacity="0.6" />
      <circle cx="60" cy="56" r="36" fill="none" stroke="#fef3c7" strokeWidth="1.5" opacity="0.4" />
      
      {/* Dollar sign */}
      <text x="60" y="68" textAnchor="middle" fontSize="42" fontWeight="bold" fill="#78350f" opacity="0.9">$</text>
      
      {/* Shine overlay */}
      <circle cx="60" cy="56" r="48" fill="url(#coinShine)" />
      
      {/* Top highlight arc */}
      <path d="M 25 40 Q 60 15 95 40" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="h-dvh w-screen overflow-hidden relative flex flex-col">
      {/* Background extending behind safe areas */}
      <div 
        className="fixed z-0" 
        style={{
          backgroundImage: `url(${gameBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />

      {/* Content */}
      <div 
        className="relative z-10 flex-1 flex flex-col px-4"
        style={{ 
          paddingTop: 'max(calc(env(safe-area-inset-top) + 2%), env(safe-area-inset-top) + 16px)',
          paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 16px)'
        }}
      >
        {/* Header with 3D back button */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="relative rounded-full hover:scale-110 transition-all"
            style={{
              padding: 'clamp(8px, 2vw, 12px)',
              minWidth: 'clamp(40px, 10vw, 56px)',
              minHeight: 'clamp(40px, 10vw, 56px)'
            }}
          >
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-700 via-yellow-600 to-yellow-900 border-2 border-yellow-400/50 shadow-lg" aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-yellow-600 via-yellow-500 to-yellow-800" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[5px] rounded-full bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-700" style={{ boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.3)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[5px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)' }} aria-hidden />
            
            {/* Icon */}
            <ArrowLeft 
              className="text-yellow-900 relative z-10" 
              style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
            />
          </button>
          
          {/* 3D Title */}
          <h1 
            className="text-2xl sm:text-3xl font-black tracking-wide"
            style={{
              background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 40%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 12px rgba(251, 191, 36, 0.5)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          >
            {t('coin_shop.title')}
          </h1>
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* 3D Coin Icon */}
          <div className="relative">
            {/* Outer glow */}
            <div 
              className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse"
              style={{ 
                background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)',
                width: '160px',
                height: '160px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
            <Coin3DIcon />
          </div>

          {/* 3D Quantity Card */}
          <div className="relative w-full max-w-xs">
            {/* BASE SHADOW */}
            <div 
              className="absolute inset-0 rounded-2xl bg-black/50"
              style={{ transform: 'translate(4px, 4px)', filter: 'blur(8px)' }}
              aria-hidden
            />
            
            {/* OUTER FRAME */}
            <div 
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 border-2 border-yellow-500/30"
              aria-hidden
            />
            
            {/* INNER PANEL */}
            <div 
              className="relative rounded-2xl p-6"
              style={{ 
                background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(30,30,60,0.8) 100%)',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 8px rgba(0,0,0,0.4)'
              }}
            >
              <span className="block text-center text-white/60 text-sm font-medium uppercase tracking-widest mb-4">
                {t('coin_shop.quantity')}
              </span>
              
              <div className="flex items-center justify-center gap-4">
                {/* 3D Decrease button */}
                <button
                  onClick={handleDecrease}
                  disabled={tierIndex <= 0}
                  className="relative w-14 h-14 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
                >
                  {/* BASE SHADOW */}
                  <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(2px, 2px)', filter: 'blur(3px)' }} aria-hidden />
                  
                  {/* OUTER FRAME */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-800 border-2 border-gray-400/50" aria-hidden />
                  
                  {/* MIDDLE FRAME */}
                  <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-gray-500 via-gray-600 to-gray-700" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }} aria-hidden />
                  
                  {/* INNER LAYER */}
                  <div className="absolute inset-[4px] rounded-full bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800" style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.1), inset 0 -4px 8px rgba(0,0,0,0.3)' }} aria-hidden />
                  
                  {/* SPECULAR HIGHLIGHT */}
                  <div className="absolute inset-[4px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)' }} aria-hidden />
                  
                  <ChevronDown className="w-7 h-7 text-white relative z-10 mx-auto" />
                </button>

                {/* 3D Quantity display */}
                <div className="relative min-w-[140px] h-20">
                  {/* BASE SHADOW */}
                  <div 
                    className="absolute inset-0 rounded-xl bg-black/50"
                    style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }}
                    aria-hidden
                  />
                  
                  {/* OUTER FRAME */}
                  <div 
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-700 via-yellow-600 to-yellow-900 border-2 border-yellow-400/60"
                    aria-hidden
                  />
                  
                  {/* INNER PANEL */}
                  <div 
                    className="absolute inset-[3px] rounded-lg flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(40,30,10,0.9) 100%)',
                      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.4)'
                    }}
                  >
                    <span 
                      className="text-4xl font-black"
                      style={{
                        background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.5))'
                      }}
                    >
                      {quantity.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 3D Increase button */}
                <button
                  onClick={handleIncrease}
                  className="relative w-14 h-14 rounded-full hover:scale-105 active:scale-95 transition-all"
                >
                  {/* BASE SHADOW */}
                  <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(2px, 2px)', filter: 'blur(3px)' }} aria-hidden />
                  
                  {/* OUTER FRAME */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-800 border-2 border-yellow-300/60" aria-hidden />
                  
                  {/* MIDDLE FRAME */}
                  <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-600" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }} aria-hidden />
                  
                  {/* INNER LAYER */}
                  <div className="absolute inset-[4px] rounded-full bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600" style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.3), inset 0 -4px 8px rgba(0,0,0,0.2)' }} aria-hidden />
                  
                  {/* SPECULAR HIGHLIGHT */}
                  <div className="absolute inset-[4px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5) 0%, transparent 50%)' }} aria-hidden />
                  
                  <ChevronUp className="w-7 h-7 text-yellow-900 relative z-10 mx-auto" />
                </button>
              </div>

              {/* 3D Price display */}
              <div className="mt-6 text-center">
                <span className="block text-white/50 text-xs uppercase tracking-widest mb-1">
                  {t('coin_shop.price')}
                </span>
                <span 
                  className="text-3xl font-black"
                  style={{
                    background: 'linear-gradient(180deg, #86efac 0%, #22c55e 50%, #16a34a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 4px rgba(34,197,94,0.5))'
                  }}
                >
                  ${price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 3D Purchase button */}
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="relative w-full max-w-xs h-16 rounded-xl disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {/* BASE SHADOW */}
            <div 
              className="absolute inset-0 rounded-xl bg-black/50"
              style={{ transform: 'translate(4px, 4px)', filter: 'blur(6px)' }}
              aria-hidden
            />
            
            {/* OUTER FRAME */}
            <div 
              className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-700 border-2 border-yellow-300/70"
              style={{ boxShadow: '0 0 20px rgba(251,191,36,0.4)' }}
              aria-hidden
            />
            
            {/* MIDDLE FRAME */}
            <div 
              className="absolute inset-[3px] rounded-lg bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600"
              style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4)' }}
              aria-hidden
            />
            
            {/* INNER LAYER */}
            <div 
              className="absolute inset-[5px] rounded-lg bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600"
              style={{ boxShadow: 'inset 0 6px 12px rgba(255,255,255,0.3), inset 0 -6px 12px rgba(0,0,0,0.15)' }}
              aria-hidden
            />
            
            {/* SPECULAR HIGHLIGHT */}
            <div 
              className="absolute inset-[5px] rounded-lg pointer-events-none"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
              aria-hidden
            />
            
            {/* Button text */}
            <span 
              className="relative z-10 text-lg font-black uppercase tracking-wide"
              style={{
                color: '#78350f',
                textShadow: '0 1px 0 rgba(255,255,255,0.3)'
              }}
            >
              {isProcessing ? t('payment.processing') : t('coin_shop.buy_now')}
            </span>
          </button>

          {/* Info text */}
          <p className="text-white/40 text-xs text-center max-w-xs px-4">
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
