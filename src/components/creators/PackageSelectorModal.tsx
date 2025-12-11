import { useState } from 'react';
import { X, Check, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PackageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: 'hu' | 'en';
}

const texts = {
  title: {
    hu: 'Indítsd el a Creator tagságod!',
    en: 'Start your Creator membership!',
  },
  subtitle: {
    hu: 'Oszd meg videóidat a játékosainkkal, és építs valódi közönséget.',
    en: 'Share your videos with our players and build a real audience.',
  },
  highlight: {
    hu: '30 napig kötetlenül kipróbálhatod!',
    en: 'Try it free for 30 days!',
  },
  planName: {
    hu: 'Creator Tagság',
    en: 'Creator Membership',
  },
  planFeatures: {
    hu: '3 új videó / 24 óra',
    en: '3 new videos / 24 hours',
  },
  feature90Days: {
    hu: 'Minden videó 90 napig aktív',
    en: 'Each video active for 90 days',
  },
  trialText: {
    hu: '30 napig kötetlenül!',
    en: '30 days free!',
  },
  afterTrial: {
    hu: 'Utána:',
    en: 'After trial:',
  },
  priceHu: '2 990 Ft / hó',
  priceEn: '$10 / month',
  selectThis: {
    hu: 'Kipróbálom',
    en: 'Start free trial',
  },
  legalText: {
    hu: 'A 30 napos kötetlen időszak után az előfizetés automatikusan megújul havi 2.990 Ft díjjal. A próba alatt bármikor lemondhatod.',
    en: 'After the 30-day trial period, the subscription will automatically renew at $10/month. You can cancel anytime during the trial.',
  },
  processing: {
    hu: 'Átirányítás...',
    en: 'Redirecting...',
  },
  error: {
    hu: 'Valami hiba történt. Próbáld újra később.',
    en: 'Something went wrong. Please try again later.',
  },
};

const PackageSelectorModal = ({ isOpen, onClose, onSuccess, lang }: PackageSelectorModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartSubscription = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-creator-subscription', {});

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error(texts.error[lang]);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ paddingBottom: '70px' }}>
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex-1 m-3 bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-5 md:p-6 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6 pr-8 flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              {texts.title[lang]}
            </h2>
            <p className="text-white/80 text-base md:text-lg mb-2">
              {texts.subtitle[lang]}
            </p>
            <p className="text-green-400 text-base md:text-lg font-semibold">
              {texts.highlight[lang]}
            </p>
          </div>

          {/* Single Package Card */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="relative p-6 rounded-2xl border-2 border-pink-500/50 bg-white/5 text-center">
                {/* Popular badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-sm font-semibold text-white flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="w-4 h-4" />
                  {lang === 'hu' ? 'Egyetlen csomag' : 'Single Plan'}
                </div>

                {/* Package name */}
                <h3 className="text-2xl md:text-3xl font-bold text-white mt-4 mb-2">
                  {texts.planName[lang]}
                </h3>

                {/* Features */}
                <div className="space-y-2 mb-4">
                  <p className="text-white/90 text-base">
                    ✓ {texts.planFeatures[lang]}
                  </p>
                  <p className="text-white/90 text-base">
                    ✓ {texts.feature90Days[lang]}
                  </p>
                </div>

                {/* Trial text */}
                <p className="text-green-400 text-xl font-bold mb-4">
                  {texts.trialText[lang]}
                </p>

                {/* CTA Button */}
                <button
                  onClick={handleStartSubscription}
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {texts.processing[lang]}
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {texts.selectThis[lang]}
                    </>
                  )}
                </button>

                {/* Price after trial */}
                <p className="text-white/60 text-sm mt-3">
                  {texts.afterTrial[lang]} {lang === 'hu' ? texts.priceHu : texts.priceEn}
                </p>
              </div>
            </div>
          </div>

          {/* Legal text */}
          <p className="text-white/40 text-xs text-center leading-relaxed mt-4 flex-shrink-0">
            {texts.legalText[lang]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PackageSelectorModal;
