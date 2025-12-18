import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { LifeIcon3D } from '@/components/icons/LifeIcon3D';
import { CoinIcon3D } from '@/components/icons/CoinIcon3D';
import { GoldRewardCoin3D } from '@/components/icons/GoldRewardCoin3D';
import { LoadingSpinner3D } from '@/components/icons/LoadingSpinner3D';
import { trackConversionEvent } from '@/lib/analytics';
import { useDebounce } from '@/hooks/useDebounce';

interface InGameRescuePopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerReason: 'NO_LIFE' | 'NO_GOLD';
  currentLives: number;
  currentGold: number;
  onStateRefresh: () => Promise<void>;
  onGameEnd?: () => void;
}

export const InGameRescuePopup: React.FC<InGameRescuePopupProps> = ({
  isOpen,
  onClose,
  triggerReason,
  currentLives,
  currentGold,
  onStateRefresh,
  onGameEnd,
}) => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [loadingGoldToLife, setLoadingGoldToLife] = useState(false);
  const [loadingLifeToGold, setLoadingLifeToGold] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track product_view when popup opens
  useEffect(() => {
    const trackProductView = async () => {
      if (isOpen && !hasTrackedView) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await trackConversionEvent(
            session.user.id,
            'product_view',
            'booster_rescue',
            triggerReason,
            { trigger_reason: triggerReason }
          );
          setHasTrackedView(true);
        }
      }
    };
    trackProductView();
  }, [isOpen, hasTrackedView, triggerReason]);

  // Reset tracking flag when popup closes
  useEffect(() => {
    if (!isOpen) {
      setHasTrackedView(false);
    }
  }, [isOpen]);

  // GOLD → LIFE: 500 gold → +5 lives
  const handleGoldToLifePurchaseRaw = async () => {
    if (currentGold < 500) {
      toast.error(lang === 'hu' ? 'Nincs elég aranyad!' : 'Not enough gold!');
      return;
    }

    setLoadingGoldToLife(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('rescue.not_logged_in'));
        setLoadingGoldToLife(false);
        return;
      }

      await trackConversionEvent(
        session.user.id,
        'add_to_cart',
        'booster',
        'GOLD_TO_LIFE',
        { price: 500, currency: 'gold' }
      );
      
      const { data, error } = await supabase.functions.invoke('purchase-booster', {
        body: { boosterCode: 'GOLD_TO_LIFE' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(lang === 'hu' ? '+5 életet kaptál!' : '+5 lives granted!', { position: 'top-center' });
        await onStateRefresh();
        onClose();
      } else {
        toast.error(t('payment.error.purchase_failed'), { duration: 4000 });
        onClose();
        if (onGameEnd) onGameEnd();
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Gold to Life purchase error:', error);
      toast.error(t('payment.error.purchase_failed'), { duration: 4000 });
      onClose();
      if (onGameEnd) onGameEnd();
      navigate('/dashboard');
    } finally {
      setLoadingGoldToLife(false);
    }
  };

  // LIFE → GOLD: 15 lives → +1500 gold
  const handleLifeToGoldPurchaseRaw = async () => {
    if (currentLives < 15) {
      toast.error(lang === 'hu' ? 'Nincs elég életed!' : 'Not enough lives!');
      return;
    }

    setLoadingLifeToGold(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('rescue.not_logged_in'));
        setLoadingLifeToGold(false);
        return;
      }

      await trackConversionEvent(
        session.user.id,
        'add_to_cart',
        'booster',
        'LIFE_TO_GOLD',
        { price: 15, currency: 'lives' }
      );
      
      const { data, error } = await supabase.functions.invoke('purchase-booster', {
        body: { boosterCode: 'LIFE_TO_GOLD' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(lang === 'hu' ? '+1500 aranyat kaptál!' : '+1500 gold granted!', { position: 'top-center' });
        await onStateRefresh();
        onClose();
      } else {
        toast.error(t('payment.error.purchase_failed'), { duration: 4000 });
        onClose();
        if (onGameEnd) onGameEnd();
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Life to Gold purchase error:', error);
      toast.error(t('payment.error.purchase_failed'), { duration: 4000 });
      onClose();
      if (onGameEnd) onGameEnd();
      navigate('/dashboard');
    } finally {
      setLoadingLifeToGold(false);
    }
  };

  const [handleGoldToLifePurchase] = useDebounce(handleGoldToLifePurchaseRaw, 200);
  const [handleLifeToGoldPurchase] = useDebounce(handleLifeToGoldPurchaseRaw, 200);

  const hasEnoughGold = currentGold >= 500;
  const hasEnoughLives = currentLives >= 15;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-red-900/50 via-purple-900/70 to-red-900/50 border-yellow-400 p-3 sm:p-4 md:p-5 shadow-2xl !fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !m-0" style={{ maxWidth: 'clamp(320px, 95vw, 450px)', width: 'clamp(320px, 95vw, 450px)', height: 'auto', minHeight: 'clamp(400px, 65vh, 550px)', borderWidth: 'clamp(3px, 1vw, 6px)', borderRadius: 'clamp(16px, 4vw, 20px)', padding: 'clamp(0.75rem, 2.5vw, 1.25rem)', boxShadow: '0 0 50px rgba(250, 204, 21, 0.7), 0 25px 80px rgba(0, 0, 0, 0.8), inset 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -4px 20px rgba(250, 204, 21, 0.2)' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute z-50 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-200 hover:scale-110"
          style={{ 
            top: 'clamp(0.75rem, 2vh, 1rem)', 
            right: 'clamp(0.75rem, 2vw, 1rem)', 
            padding: 'clamp(0.375rem, 1vh, 0.5rem)' 
          }}
          aria-label="Close"
        >
          <X style={{ width: 'clamp(18px, 4vw, 24px)', height: 'clamp(18px, 4vh, 24px)' }} className="text-yellow-400" />
        </button>

        {/* Animated background stars */}
        <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <DialogHeader className="space-y-1 relative" style={{ marginBottom: 'clamp(0.375rem, 1.5vh, 0.75rem)', marginTop: 'clamp(0.5rem, 2vh, 1rem)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-600/30 via-yellow-500/20 to-transparent" style={{ borderRadius: 'clamp(16px, 4vw, 20px)', boxShadow: 'inset 0 3px 15px rgba(234, 179, 8, 0.4)' }}></div>
          
          <DialogTitle className="relative text-center text-yellow-50 leading-tight tracking-wider" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', textShadow: '0 4px 15px rgba(0, 0, 0, 0.9), 0 6px 25px rgba(0, 0, 0, 0.8)' }}>
            {t('rescue.title')}
          </DialogTitle>
          <p className="relative text-center text-yellow-50 font-bold" style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)', textShadow: '0 3px 10px rgba(0, 0, 0, 0.9)' }}>
            {t('rescue.last_chance')}
          </p>
        </DialogHeader>

        {/* Current Status */}
        <div className="relative bg-gradient-to-r from-blue-900/70 via-purple-900/80 to-blue-900/70 border-blue-400/60 rounded-xl p-2 sm:p-3 shadow-xl" style={{ borderWidth: 'clamp(2px, 0.6vw, 4px)', borderRadius: 'clamp(16px, 4vw, 20px)', padding: 'clamp(0.375rem, 1.5vh, 0.75rem)', marginBottom: 'clamp(0.375rem, 1.5vh, 0.75rem)', marginTop: 'clamp(0.75rem, 2.5vh, 1.5rem)', boxShadow: 'inset 0 5px 20px rgba(0, 0, 0, 0.6), 0 8px 30px rgba(59, 130, 246, 0.6)' }}>
          <div className="relative grid grid-cols-2 gap-4">
            {/* Life indicator */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="relative">
                <LifeIcon3D size={32} className="relative drop-shadow-2xl sm:w-10 sm:h-10" />
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-blue-100 text-[10px] sm:text-xs font-bold">{t('rescue.life_label')}</p>
                <p className="text-white font-black text-xl sm:text-2xl">{currentLives}</p>
              </div>
            </div>
            
            {/* Gold indicator */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="relative">
                <CoinIcon3D size={32} className="relative drop-shadow-2xl sm:w-10 sm:h-10" />
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-yellow-100 text-[10px] sm:text-xs font-bold">{t('rescue.gold_label')}</p>
                <p className="text-white font-black text-xl sm:text-2xl">{currentGold}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two booster options */}
        <div className="grid grid-cols-2 gap-2" style={{ marginTop: 'clamp(0.5rem, 2vh, 0.75rem)' }}>
          
          {/* Option 1: Gold → Life (500 gold → +5 lives) */}
          <div className="relative bg-gradient-to-br from-green-800 via-green-700 to-emerald-800 border-[3px] border-green-300 rounded-[16px] p-2 sm:p-3 shadow-2xl" style={{ boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -4px 20px rgba(52, 211, 153, 0.3)' }}>
            <div className="flex flex-col items-center">
              {/* Life icon */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-green-700 flex items-center justify-center mb-2" style={{ boxShadow: 'inset 0 -10px 30px rgba(0, 0, 0, 0.6), inset 0 10px 30px rgba(255, 255, 255, 0.5)' }}>
                <LifeIcon3D size={28} className="drop-shadow-lg" />
              </div>

              <h4 className="text-[10px] sm:text-xs font-black text-center text-green-100 mb-1 leading-tight" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}>
                {lang === 'hu' ? 'Életet vásárolj!' : 'Buy lives!'}
              </h4>

              {/* Reward display */}
              <div className="flex items-center justify-center gap-1 mb-2">
                <LifeIcon3D size={14} />
                <span className="text-green-200 text-[10px] font-bold">+5</span>
              </div>

              <Button
                onClick={handleGoldToLifePurchase}
                disabled={!hasEnoughGold || loadingGoldToLife}
                className="w-full bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-700 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-600 text-white font-bold text-xs py-2 rounded-[10px] disabled:opacity-50 border-[2px] border-yellow-300 shadow-xl transition-all"
                style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}
              >
                {loadingGoldToLife ? (
                  <LoadingSpinner3D size={14} />
                ) : hasEnoughGold ? (
                  <span className="flex items-center gap-1">
                    <GoldRewardCoin3D size={12} />
                    500
                  </span>
                ) : (
                  <span className="text-[10px]">{lang === 'hu' ? 'Kevés arany' : 'Not enough'}</span>
                )}
              </Button>
            </div>
          </div>

          {/* Option 2: Life → Gold (15 lives → +1500 gold) */}
          <div className="relative bg-gradient-to-br from-yellow-700 via-amber-700 to-orange-800 border-[3px] border-yellow-300 rounded-[16px] p-2 sm:p-3 shadow-2xl" style={{ boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -4px 20px rgba(234, 179, 8, 0.3)' }}>
            <div className="flex flex-col items-center">
              {/* Coin icon */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-700 flex items-center justify-center mb-2" style={{ boxShadow: 'inset 0 -10px 30px rgba(0, 0, 0, 0.6), inset 0 10px 30px rgba(255, 255, 255, 0.7)' }}>
                <GoldRewardCoin3D size={28} className="drop-shadow-lg" />
              </div>

              <h4 className="text-[10px] sm:text-xs font-black text-center text-yellow-100 mb-1 leading-tight" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}>
                {lang === 'hu' ? 'Aranyat vásárolj!' : 'Buy gold!'}
              </h4>

              {/* Reward display */}
              <div className="flex items-center justify-center gap-1 mb-2">
                <GoldRewardCoin3D size={14} />
                <span className="text-yellow-200 text-[10px] font-bold">+1500</span>
              </div>

              <Button
                onClick={handleLifeToGoldPurchase}
                disabled={!hasEnoughLives || loadingLifeToGold}
                className="w-full bg-gradient-to-b from-pink-400 via-pink-500 to-pink-700 hover:from-pink-300 hover:via-pink-400 hover:to-pink-600 text-white font-bold text-xs py-2 rounded-[10px] disabled:opacity-50 border-[2px] border-pink-300 shadow-xl transition-all"
                style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)' }}
              >
                {loadingLifeToGold ? (
                  <LoadingSpinner3D size={14} />
                ) : hasEnoughLives ? (
                  <span className="flex items-center gap-1">
                    <LifeIcon3D size={12} />
                    15
                  </span>
                ) : (
                  <span className="text-[10px]">{lang === 'hu' ? 'Kevés élet' : 'Not enough'}</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Warning if both insufficient */}
        {!hasEnoughGold && !hasEnoughLives && (
          <p className="text-yellow-200 text-[10px] text-center mt-2 font-bold" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
            {lang === 'hu' 
              ? 'Nincs elegendő aranyad vagy életed a folytatáshoz.' 
              : 'Not enough gold or lives to continue.'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InGameRescuePopup;
