import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, Target, Rocket } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import creatorsHeroBg from '@/assets/creators-hero-bg.png';

// Social Media Icons as inline SVGs for floating animation
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white/60">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white/60">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white/60">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white/60">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

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
    <div className="fixed inset-0 flex flex-col">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: `url(${creatorsHeroBg})`,
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />
      {/* Dark overlay for readability */}
      <div 
        className="fixed inset-0 bg-black/40 pointer-events-none"
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
        
          {/* Hero Section - Ultra Modern */}
          <section className="relative min-h-[80vh] rounded-3xl overflow-hidden shadow-2xl">
            {/* Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 z-0" />
            
            {/* Floating Social Icons - Parallax Animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
              <div className="absolute top-[15%] left-[8%] animate-[float_4s_ease-in-out_infinite]">
                <TikTokIcon />
              </div>
              <div className="absolute top-[25%] right-[10%] animate-[float_5s_ease-in-out_infinite_0.5s]">
                <YouTubeIcon />
              </div>
              <div className="absolute bottom-[30%] left-[12%] animate-[float_6s_ease-in-out_infinite_1s]">
                <InstagramIcon />
              </div>
              <div className="absolute bottom-[20%] right-[8%] animate-[float_4.5s_ease-in-out_infinite_0.8s]">
                <FacebookIcon />
              </div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center min-h-[80vh] px-6 py-8 md:px-10 text-center md:text-left">
              <div className="md:max-w-[480px]">
                {/* H1 - Main Title with fade-up animation */}
                <h1 
                  className="text-[clamp(1.5rem,6vw,3rem)] text-white leading-[1.1] mb-3 tracking-[0.02em] animate-[fadeUp_0.6s_ease-out_0.25s_both]"
                  style={{ 
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 800,
                    textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)'
                  }}
                >
                  {t('creators.hero_h1_part1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4F8B] to-[#FFA800]">{t('creators.hero_h1_highlight')}</span> {t('creators.hero_h1_part2')}
                </h1>

                {/* H2 - Subheadline */}
                <p 
                  className="text-[clamp(0.95rem,3.5vw,1.25rem)] text-white/80 leading-relaxed mb-3 animate-[fadeUp_0.6s_ease-out_0.35s_both]"
                  style={{ 
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500
                  }}
                >
                  {t('creators.hero_h2')}
                </p>

                {/* H3 - Micro line */}
                <p 
                  className="text-[clamp(0.8rem,2.8vw,1rem)] text-white/65 mb-6 animate-[fadeUp_0.6s_ease-out_0.4s_both]"
                  style={{ 
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 400
                  }}
                >
                  {t('creators.hero_h3')}
                </p>

                {/* CTA Button - Pill Shape with Gradient */}
                <div className="animate-[fadeUp_0.6s_ease-out_0.45s_both]">
                  <button
                    disabled
                    aria-disabled="true"
                    className="w-full md:w-auto px-10 rounded-full opacity-60 cursor-not-allowed shadow-2xl transition-transform duration-200"
                    style={{
                      height: 'clamp(52px, 12vw, 60px)',
                      background: 'linear-gradient(90deg, #FF4F8B 0%, #FFA800 100%)',
                      boxShadow: '0 8px 32px rgba(255,79,139,0.4), 0 4px 16px rgba(255,168,0,0.3)'
                    }}
                  >
                    <span 
                      className="text-[clamp(1rem,4vw,1.2rem)] text-white drop-shadow-lg"
                      style={{ 
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600
                      }}
                    >
                      {t('creators.hero_cta')}
                    </span>
                  </button>
                  
                  {/* Coming Soon Notice */}
                  <p 
                    className="mt-3 text-[clamp(0.65rem,2vw,0.75rem)] text-white/55 text-center md:text-left"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {t('creators.hero_coming_soon')}
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
                  className="bg-black/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors"
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
                  className="relative bg-black/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
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
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
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
