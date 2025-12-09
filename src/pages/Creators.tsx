import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, Target, Rocket, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';

const Creators = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const benefits = [
    {
      icon: Clock,
      huTitle: 'Fix 15 mp figyelem minden videódra',
      huText: 'A rendszer garantálja, hogy aki találkozik a videóddal, legalább ~15 másodpercig látja azt a kvízfolyamon belül.',
      enTitle: 'Guaranteed 15 sec attention',
      enText: 'Everyone who sees your clip inside the quiz flow gets ~15 seconds of guaranteed exposure.',
    },
    {
      icon: Target,
      huTitle: 'Mindig a megfelelő témában látszol',
      huText: 'Sport, beauty, tech, gasztro – a videóid azoknál jelennek meg, akik pont az adott témakör kvízét játszák.',
      enTitle: 'Topic-based relevance',
      enText: 'Sport, beauty, tech, food – your videos appear inside quizzes where players already care about that topic.',
    },
    {
      icon: Rocket,
      huTitle: 'Garantált érdeklődői átirányítás',
      huText: 'Ha rákattintanak, nem véletlen kattintás lesz: eleve elkötelezett, témára nyitott nézőket kapsz.',
      enTitle: 'Guaranteed engaged clicks',
      enText: 'When they tap through, it\'s not random – these are already engaged, topic-interested viewers.',
    },
  ];

  const steps = [
    {
      step: '1',
      huTitle: '30 napig teljesen ingyen kipróbálhatod',
      huText: 'Az előfizetés az aktiválástól számított 30 napig 0 Ft – csak akkor fizetsz, ha a próbaidő után is velünk akarsz maradni.',
      enTitle: 'Enjoy 30 days for free',
      enText: 'Your subscription is free for the first 30 days from activation – you only pay if you stay after the trial.',
    },
    {
      step: '2',
      huTitle: 'Összekötöd a csatornáidat',
      huText: 'TikTok, YouTube Shorts, Instagram Reels, Facebook Reels – néhány kattintással beállítod, honnan hozzuk a videóidat.',
      enTitle: 'Connect your channels',
      enText: 'TikTok, YouTube Shorts, Instagram Reels, Facebook Reels – set where we should pull your clips from in a few taps.',
    },
    {
      step: '3',
      huTitle: 'Mi betesszük a videóidat a kvízfolyamba',
      huText: 'Az AI-alapú rendszerünk releváns témakörök közé illeszti a klipjeidet, és figyel arra, hogy ne legyen túlismétlés, se spam.',
      enTitle: 'We place your clips into the quiz flow',
      enText: 'Our AI-based system injects your videos into the right quiz topics and avoids over-showing or spammy repetition.',
    },
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
          <section className="relative rounded-3xl overflow-hidden shadow-2xl">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
            
            {/* Content */}
            <div className="relative z-10 p-6 md:p-10 text-center">
              {/* Sparkle Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-yellow-300" />
              </div>

              {/* Title */}
              <h1 className="text-[clamp(1.5rem,6vw,2.5rem)] font-bold text-white leading-tight mb-2 tracking-tight">
                Válj népszerűvé a DingleUP!-ban!
              </h1>
              <p className="text-[clamp(0.875rem,3.5vw,1.25rem)] text-white/80 font-medium mb-6">
                Become popular inside DingleUP!
              </p>

              {/* Tagline */}
              <div className="max-w-lg mx-auto mb-8 space-y-3">
                <p className="text-[clamp(0.813rem,3vw,1rem)] text-white/95 leading-relaxed">
                  Kapcsold össze TikTok, YouTube Shorts, Insta és Facebook Reels videóid, mi pedig releváns, témaspecifikus kvízjátékok közé tesszük őket – garantált figyelemmel.
                </p>
                <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/70 leading-relaxed italic">
                  Connect your TikTok, YouTube Shorts, Insta and Facebook Reels videos, and we'll place them inside topic-based quiz games – with guaranteed attention.
                </p>
              </div>

              {/* CTA Button - Disabled */}
              <div className="max-w-[360px] md:max-w-[450px] mx-auto">
                <button
                  disabled
                  aria-disabled="true"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 opacity-60 cursor-not-allowed shadow-lg transition-none"
                >
                  <span className="block text-[clamp(1rem,4vw,1.25rem)] font-bold text-white whitespace-normal break-words">
                    Aktiválom a Népszerűségemet!
                  </span>
                  <span className="block text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/70 mt-1">
                    Activate my popularity
                  </span>
                </button>
                
                {/* Coming Soon Notice */}
                <div className="mt-4 text-center space-y-1">
                  <p className="text-[clamp(0.688rem,2.5vw,0.75rem)] text-white/60">
                    Hamarosan indul – az előfizetés aktiválása még fejlesztés alatt áll.
                  </p>
                  <p className="text-[clamp(0.625rem,2vw,0.688rem)] text-white/40 italic">
                    Coming soon – subscription activation is still under development.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="mt-8">
            <h2 className="text-[clamp(1.125rem,4.5vw,1.5rem)] font-bold text-white text-center mb-2">
              Mi ez neked?
            </h2>
            <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/60 text-center mb-6 italic">
              What's in it for you?
            </p>

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
                    {benefit.huTitle}
                  </h3>
                  <p className="text-[clamp(0.75rem,2.5vw,0.813rem)] text-white/70 mb-3 text-center md:text-left leading-relaxed">
                    {benefit.huText}
                  </p>
                  <h4 className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-medium text-white/80 mb-1 text-center md:text-left">
                    {benefit.enTitle}
                  </h4>
                  <p className="text-[clamp(0.688rem,2vw,0.75rem)] text-white/50 text-center md:text-left leading-relaxed italic">
                    {benefit.enText}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="mt-10">
            <h2 className="text-[clamp(1.125rem,4.5vw,1.5rem)] font-bold text-white text-center mb-2">
              Hogyan működik?
            </h2>
            <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/60 text-center mb-6 italic">
              How does it work?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
                >
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 left-1/2 md:left-5 transform -translate-x-1/2 md:translate-x-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">{step.step}</span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-[clamp(0.875rem,3vw,1rem)] font-semibold text-white mb-2 text-center md:text-left">
                      {step.huTitle}
                    </h3>
                    <p className="text-[clamp(0.75rem,2.5vw,0.813rem)] text-white/70 mb-3 text-center md:text-left leading-relaxed">
                      {step.huText}
                    </p>
                    <h4 className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-medium text-white/80 mb-1 text-center md:text-left">
                      {step.enTitle}
                    </h4>
                    <p className="text-[clamp(0.688rem,2vw,0.75rem)] text-white/50 text-center md:text-left leading-relaxed italic">
                      {step.enText}
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
              <p className="text-[clamp(0.875rem,3vw,1rem)] text-white leading-relaxed mb-3">
                Ha tartalmat gyártasz, itt az idő, hogy valódi, témára éhes nézők elé kerülj – nem csak a véletlenre bízva az algoritmust.
              </p>
              <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-white/60 leading-relaxed italic mb-6">
                If you create content, it's time to show up in front of people who actually care about the topic – not just random scroll-by traffic.
              </p>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <p className="text-[clamp(0.75rem,2.5vw,0.813rem)] text-yellow-400/80">
                  🚀 A „Válj népszerűvé!" előfizetés hamarosan indul. Jelenleg előregisztrációs szakaszban vagyunk – a gomb ezért még inaktív.
                </p>
                <p className="text-[clamp(0.688rem,2vw,0.75rem)] text-white/40 italic">
                  The „Become popular" subscription is launching soon. We are in pre-registration mode – that's why the button above is still inactive.
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
