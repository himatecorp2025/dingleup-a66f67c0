import { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PackageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: 'hu' | 'en';
}

type PackageType = 'starter' | 'creator_plus' | 'creator_pro' | 'creator_max';

interface PackageInfo {
  id: PackageType;
  name: { hu: string; en: string };
  videos: number;
  priceHuf: number;
  popular?: boolean;
}

const packages: PackageInfo[] = [
  {
    id: 'starter',
    name: { hu: 'Starter', en: 'Starter' },
    videos: 1,
    priceHuf: 2990,
  },
  {
    id: 'creator_plus',
    name: { hu: 'Creator Plus', en: 'Creator Plus' },
    videos: 3,
    priceHuf: 5990,
    popular: true,
  },
  {
    id: 'creator_pro',
    name: { hu: 'Creator Pro', en: 'Creator Pro' },
    videos: 5,
    priceHuf: 8990,
  },
  {
    id: 'creator_max',
    name: { hu: 'Creator Max', en: 'Creator Max' },
    videos: 10,
    priceHuf: 14990,
  },
];

const texts = {
  title: {
    hu: 'Még nem vagy aktív Creator tag!',
    en: "You're not an active Creator member yet!",
  },
  subtitle: {
    hu: 'Válassz egy csomagot, és azonnal megoszthatod a videóidat a játékban!',
    en: 'Choose a package and start sharing your videos in the game right away!',
  },
  explanation: {
    hu: '30 napig kötetlenül kipróbálhatod. A kártyádat most csak ellenőrizzük, terhelés nem történik.',
    en: 'Try it free for 30 days. We only verify your card now, no charges will be made.',
  },
  videoActive: {
    hu: 'videó egyszerre aktív',
    en: 'video active at once',
  },
  videosActive: {
    hu: 'videó egyszerre aktív',
    en: 'videos active at once',
  },
  trialText: {
    hu: '30 napig kötetlenül!',
    en: '30 days free trial!',
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
    hu: 'A 30 napos próbaidőszak után az előfizetés automatikusan megújul az általad választott havi díjjal. A próbaidő alatt bármikor lemondhatod, terhelés nélkül. A kártyádat most csak 0 Ft-tal ellenőrizzük.',
    en: 'After the 30-day trial period, the subscription will automatically renew at your chosen monthly rate. You can cancel anytime during the trial without being charged. We only verify your card with a 0 HUF authorization.',
  },
  processing: {
    hu: 'Feldolgozás...',
    en: 'Processing...',
  },
  error: {
    hu: 'Hiba történt. Kérlek próbáld újra!',
    en: 'An error occurred. Please try again!',
  },
};

const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const PackageSelectorModal = ({ isOpen, onClose, onSuccess, lang }: PackageSelectorModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);

  if (!isOpen) return null;

  const handlePackageSelect = async (pkg: PackageInfo) => {
    setSelectedPackage(pkg.id);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-creator-checkout', {
        body: {
          packageType: pkg.id,
          maxVideos: pkg.videos,
          priceHuf: pkg.priceHuf,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        
        // For now, close modal and show success message
        // In production, you'd want to use webhooks to verify payment
        toast.success(
          lang === 'hu'
            ? 'Átirányítunk a fizetési oldalra...'
            : 'Redirecting to payment page...'
        );
        
        // Optionally close modal after redirect
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(texts.error[lang]);
    } finally {
      setIsLoading(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full h-[calc(100vh-70px)] md:h-auto md:min-h-[80vh] md:w-[95vw] md:max-w-xl bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] md:rounded-2xl border border-white/10 flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-4 md:p-6 flex flex-col h-full">
          {/* Header - with padding-right to avoid close button */}
          <div className="text-center mb-3 pr-8">
            <h2 className="text-base md:text-lg font-bold text-white mb-1">
              {texts.title[lang]}
            </h2>
            <p className="text-white/80 text-xs md:text-sm mb-1">
              {texts.subtitle[lang]}
            </p>
            <p className="text-white/60 text-[10px] md:text-xs">
              {texts.explanation[lang]}
            </p>
          </div>

          {/* Package Cards - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 flex-1 mb-3">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handlePackageSelect(pkg)}
                disabled={isLoading}
                className={`relative p-2.5 md:p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center ${
                  selectedPackage === pkg.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : pkg.popular
                    ? 'border-pink-500/50 bg-white/5 hover:bg-white/10 hover:border-pink-500'
                    : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'
                } ${isLoading && selectedPackage === pkg.id ? 'animate-pulse' : ''}`}
              >
                {/* Popular badge */}
                {pkg.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-[9px] md:text-xs font-semibold text-white flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {texts.popular[lang]}
                  </div>
                )}

                {/* Package name */}
                <h3 className="text-sm md:text-base font-bold text-white mb-0.5">
                  {pkg.name[lang]}
                </h3>

                {/* Video count */}
                <p className="text-white/70 text-[10px] md:text-xs mb-0.5">
                  {pkg.videos} {pkg.videos === 1 ? texts.videoActive[lang] : texts.videosActive[lang]}
                </p>

                {/* Trial text */}
                <p className="text-green-400 text-[10px] md:text-xs font-medium mb-0.5">
                  {texts.trialText[lang]}
                </p>

                {/* Price */}
                <p className="text-white/60 text-[9px] md:text-[10px] mb-1.5">
                  {texts.afterTrial[lang]} {formatPrice(pkg.priceHuf)} {texts.perMonth[lang]}
                </p>

                {/* Select button indicator */}
                <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg w-full ${
                  pkg.popular
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                    : 'bg-white/10'
                }`}>
                  {isLoading && selectedPackage === pkg.id ? (
                    <span className="text-white text-[10px] md:text-xs">{texts.processing[lang]}</span>
                  ) : (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span className="text-white text-[10px] md:text-xs font-medium">
                        {texts.selectThis[lang]}
                      </span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Legal text */}
          <p className="text-white/40 text-[9px] md:text-[10px] text-center leading-relaxed">
            {texts.legalText[lang]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PackageSelectorModal;
