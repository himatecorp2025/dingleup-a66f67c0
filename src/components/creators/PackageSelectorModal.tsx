import { useState } from 'react';
import { X, Check, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreatorPlans, CreatorPlan } from '@/hooks/useCreatorPlans';

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
    hu: 'Válassz egy csomagot, és máris megoszthatod a videóidat a játékosainkkal.',
    en: 'Choose a package and start sharing your videos with our players.',
  },
  highlight: {
    hu: '30 napig kötetlenül kipróbálhatod.',
    en: 'Try it free for 30 days.',
  },
  trialText: {
    hu: '30 napig kötetlenül!',
    en: '30 days free!',
  },
  afterTrial: {
    hu: 'Utána:',
    en: 'After trial:',
  },
  perMonth: {
    hu: 'Ft / hó',
    en: 'HUF / month',
  },
  selectThis: {
    hu: 'Ezt választom',
    en: 'Select this',
  },
  popular: {
    hu: 'Legnépszerűbb',
    en: 'Most popular',
  },
  legalText: {
    hu: 'A 30 napos kötetlen időszak után az előfizetés automatikusan megújul az általad választott havi díjjal. A próba alatt bármikor lemondhatod.',
    en: 'After the 30-day trial period, the subscription will automatically renew at your chosen monthly rate. You can cancel anytime during the trial.',
  },
  processing: {
    hu: 'Aktiválás...',
    en: 'Activating...',
  },
  error: {
    hu: 'Valami hiba történt a csomag aktiválása közben. Próbáld újra később.',
    en: 'Something went wrong while activating the package. Please try again later.',
  },
  success: {
    hu: 'Sikeres aktiválás! Most már megoszthatod a videóidat.',
    en: 'Successfully activated! You can now share your videos.',
  },
  loading: {
    hu: 'Csomagok betöltése...',
    en: 'Loading packages...',
  },
};

const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const PackageSelectorModal = ({ isOpen, onClose, onSuccess, lang }: PackageSelectorModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { data: plans, isLoading: plansLoading } = useCreatorPlans();

  if (!isOpen) return null;

  const handlePackageSelect = async (plan: CreatorPlan) => {
    setSelectedPackage(plan.id);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('activate_creator_trial', {
        p_plan_id: plan.id,
      });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string } | null;

      if (result?.success) {
        toast.success(texts.success[lang]);
        onClose();
        onSuccess();
      } else {
        const errorCode = result?.error;
        if (errorCode === 'ALREADY_ACTIVE') {
          toast.info(lang === 'hu' ? 'Már van aktív csomagod!' : 'You already have an active package!');
          onClose();
          onSuccess();
        } else {
          throw new Error(errorCode || 'Unknown error');
        }
      }
    } catch (err) {
      console.error('Activation error:', err);
      toast.error(texts.error[lang]);
    } finally {
      setIsLoading(false);
      setSelectedPackage(null);
    }
  };

  // Check if this is the "plus" package (2nd in sort order, id = "plus")
  const isPopular = (plan: CreatorPlan) => plan.id === 'plus';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full h-[calc(100vh-70px)] md:h-auto md:min-h-[80vh] md:w-[95vw] md:max-w-xl bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] md:rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-4 md:p-6 flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-4 pr-8">
            <h2 className="text-lg md:text-xl font-bold text-white mb-2">
              {texts.title[lang]}
            </h2>
            <p className="text-white/80 text-sm md:text-base mb-2">
              {texts.subtitle[lang]}
            </p>
            <p className="text-green-400 text-sm md:text-base font-semibold">
              {texts.highlight[lang]}
            </p>
          </div>

          {/* Loading state */}
          {plansLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-white/60 text-sm">{texts.loading[lang]}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Package Cards - 2x2 Grid on mobile, can be 1x4 on larger screens */}
              <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 flex-1 mb-4">
                {plans?.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handlePackageSelect(plan)}
                    disabled={isLoading}
                    className={`relative p-4 md:p-5 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-between min-h-[180px] md:min-h-[200px] ${
                      selectedPackage === plan.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : isPopular(plan)
                        ? 'border-pink-500/50 bg-white/5 hover:bg-white/10 hover:border-pink-500'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'
                    } ${isLoading && selectedPackage === plan.id ? 'animate-pulse' : ''}`}
                  >
                    {/* Popular badge */}
                    {isPopular(plan) && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-[10px] md:text-xs font-semibold text-white flex items-center gap-1 whitespace-nowrap">
                        <Sparkles className="w-3 h-3" />
                        {texts.popular[lang]}
                      </div>
                    )}

                    <div className="flex flex-col items-center">
                      {/* Package name */}
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                        {plan.name}
                      </h3>

                      {/* Description (video count) */}
                      <p className="text-white/80 text-sm md:text-base font-medium mb-2">
                        {plan.description}
                      </p>

                      {/* Trial text */}
                      <p className="text-green-400 text-sm md:text-base font-semibold">
                        {texts.trialText[lang]}
                      </p>
                    </div>

                    {/* Select button indicator */}
                    <div className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg w-full mt-3 ${
                      isPopular(plan)
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                        : 'bg-white/10'
                    }`}>
                      {isLoading && selectedPackage === plan.id ? (
                        <span className="text-white text-sm md:text-base font-medium">{texts.processing[lang]}</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span className="text-white text-sm md:text-base font-medium">
                            {texts.selectThis[lang]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Price - BELOW the button */}
                    <p className="text-white/60 text-xs md:text-sm mt-2">
                      {texts.afterTrial[lang]} {formatPrice(plan.monthly_price_huf)} {texts.perMonth[lang]}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Legal text */}
          <p className="text-white/40 text-[10px] md:text-xs text-center leading-relaxed mt-auto">
            {texts.legalText[lang]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PackageSelectorModal;
