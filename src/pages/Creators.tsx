import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, Target, Rocket, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import creatorsHeroBg from '@/assets/creators-hero-bg.png';

const Creators = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const benefits = [
    { icon: Clock, titleKey: 'creators.benefit1_title', textKey: 'creators.benefit1_text' },
    { icon: Target, titleKey: 'creators.benefit2_title', textKey: 'creators.benefit2_text' },
    { icon: Rocket, titleKey: 'creators.benefit3_title', textKey: 'creators.benefit3_text' },
  ];

  const steps = [
    { step: '1', titleKey: 'creators.step1_title', textKey: 'creators.step1_text' },
    { step: '2', titleKey: 'creators.step2_title', textKey: 'creators.step2_text' },
    { step: '3', titleKey: 'creators.step3_title', textKey: 'creators.step3_text' },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] flex flex-col">
      {/* Background extension for safe area */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] pointer-events-none"
        style={{
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />

      {/* Scrollable Content */}
      <div 
        className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden"
        style={{ 
          width: '100%',
          maxWidth: '100%',
          paddingTop: 'clamp(8px, 2vh, 16px)',
          paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 24px)' 
        }}
      >
        <div style={{ 
          width: '90vw',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* Header - Back button matching Profile page style */}
          <div className="flex items-center mb-4">
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
          </div>
        
          {/* Hero Section */}
          <section className="relative w-full overflow-hidden rounded-3xl shadow-2xl min-h-[60vh] sm:min-h-[50vh] md:min-h-[40vh]">
            {/* Background Image - absolute positioned */}
            <div 
              className="absolute inset-0 bg-no-repeat bg-cover bg-center sm:bg-top md:bg-center"
              style={{ 
                backgroundImage: `url(${creatorsHeroBg})`,
                imageRendering: 'auto'
              }}
            />
            
            {/* Gradient Overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
            
            {/* Content */}
            <div className="relative z-10 p-6 md:p-10 text-center flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[50vh] md:min-h-[40vh]">
              {/* Sparkle Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-yellow-300" />
              </div>

              {/* Title */}
              <h1 className="text-[clamp(1.2rem,5vw,2.5rem)] font-bold text-white leading-tight mb-4 tracking-tight whitespace-nowrap drop-shadow-lg">
                {t('creators.hero_title')}
              </h1>

              {/* Tagline */}
              <div className="max-w-lg mx-auto mb-8">
                <p className="text-[clamp(0.875rem,3vw,1.125rem)] text-white leading-relaxed drop-shadow-md">
                  {t('creators.hero_tagline')}
                </p>
              </div>

              {/* CTA Button - Disabled */}
              <div className="max-w-[360px] md:max-w-[450px] mx-auto">
                <button
                  disabled
                  aria-disabled="true"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 opacity-60 cursor-not-allowed shadow-lg transition-none"
                >
                  <span className="block text-[clamp(1rem,4vw,1.25rem)] font-bold text-white whitespace-normal break-words drop-shadow-md">
                    {t('creators.cta_button')}
                  </span>
                </button>
                
                {/* Coming Soon Notice */}
                <div className="mt-4 text-center">
                  <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/80 drop-shadow-sm">
                    {t('creators.cta_notice')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="mt-8">
            <h2 className="text-[clamp(1.125rem,4.5vw,1.5rem)] font-bold text-white text-center mb-6">
              {t('creators.benefits_title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 mx-auto md:mx-0">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[clamp(0.875rem,3vw,1rem)] font-semibold text-white mb-2 text-center md:text-left">
                    {t(benefit.titleKey)}
                  </h3>
                  <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/70 text-center md:text-left leading-relaxed">
                    {t(benefit.textKey)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="mt-10">
            <h2 className="text-[clamp(1.125rem,4.5vw,1.5rem)] font-bold text-white text-center mb-6">
              {t('creators.steps_title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
                >
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 left-0 right-0 mx-auto w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">{step.step}</span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-[clamp(0.875rem,3vw,1rem)] font-semibold text-white mb-2 text-center">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/70 text-center leading-relaxed">
                      {t(step.textKey)}
                    </p>
                  </div>

                  {/* Connector Line (mobile only, between cards) */}
                  {index < steps.length - 1 && (
                    <div className="md:hidden absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-purple-500/50 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Closing Section */}
          <section className="mt-10 mb-6 text-center">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <p className="text-[clamp(0.875rem,3vw,1rem)] text-white leading-relaxed mb-4">
                {t('creators.closing_text')}
              </p>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-yellow-400/80">
                  🚀 {t('creators.closing_notice')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Creators;
