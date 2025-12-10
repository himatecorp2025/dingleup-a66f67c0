import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Eye, Users, Target, Zap, Package, Link, Play, BarChart3 } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import { useAudioStore } from '@/stores/audioStore';

const CreatorHowItWorks = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  // Disable music on this page
  const { musicEnabled, setMusicEnabled } = useAudioStore();
  const [previousMusicState, setPreviousMusicState] = useState<boolean | null>(null);

  useEffect(() => {
    // Save current music state and disable
    if (previousMusicState === null && musicEnabled) {
      setPreviousMusicState(musicEnabled);
      setMusicEnabled(false);
    }
    
    // Restore music state on unmount
    return () => {
      if (previousMusicState !== null) {
        setMusicEnabled(previousMusicState);
      }
    };
  }, [musicEnabled, previousMusicState, setMusicEnabled]);

  const benefits = [
    {
      icon: Eye,
      title: lang === 'hu' ? 'Garantált figyelem' : 'Guaranteed attention',
      text: lang === 'hu' 
        ? 'Minden játékos 15 másodpercig garantáltan látja a videódat – nem ugorható át.' 
        : 'Every player sees your video for 15 seconds guaranteed – it can\'t be skipped.',
    },
    {
      icon: Target,
      title: lang === 'hu' ? 'Releváns közönség' : 'Relevant audience',
      text: lang === 'hu' 
        ? 'A videód a témádhoz illő játékosoknak jelenik meg, így releváns nézőket érsz el.' 
        : 'Your video appears to players interested in your topic, so you reach relevant viewers.',
    },
    {
      icon: Users,
      title: lang === 'hu' ? 'Rajongóépítés' : 'Build your fanbase',
      text: lang === 'hu' 
        ? 'A játékosok könnyen követhetnek a közösségi médiában, így növelheted a követőtáborod.' 
        : 'Players can easily follow you on social media, helping you grow your audience.',
    },
    {
      icon: Zap,
      title: lang === 'hu' ? 'Gyors indulás' : 'Quick start',
      text: lang === 'hu' 
        ? '30 napos ingyenes próbaidőszak – nincs kockázat, csak lehetőség.' 
        : '30-day free trial – no risk, just opportunity.',
    },
  ];

  const steps = [
    {
      icon: Package,
      step: '1',
      title: lang === 'hu' ? 'Válassz csomagot' : 'Choose a package',
      text: lang === 'hu' 
        ? 'Aktiváld a Creator fiókod és válassz az elérhető csomagok közül. Az első 30 nap ingyenes!' 
        : 'Activate your Creator account and choose from available packages. First 30 days free!',
    },
    {
      icon: Link,
      step: '2',
      title: lang === 'hu' ? 'Add meg a videód linkjét' : 'Add your video link',
      text: lang === 'hu' 
        ? 'Illeszd be a TikTok videód linkjét – hamarosan YouTube, Instagram és Facebook is támogatott lesz.' 
        : 'Paste your TikTok video link – YouTube, Instagram and Facebook support coming soon.',
    },
    {
      icon: Play,
      step: '3',
      title: lang === 'hu' ? 'A játékosok látják' : 'Players see your video',
      text: lang === 'hu' 
        ? 'A játékosok a kérdések között 15 másodpercig garantáltan látják a videódat.' 
        : 'Players see your video for 15 seconds guaranteed between questions.',
    },
    {
      icon: BarChart3,
      step: '4',
      title: lang === 'hu' ? 'Kövesd az eredményed' : 'Track your results',
      text: lang === 'hu' 
        ? 'Nézd meg, hányan látták a videódat és hogyan alakulnak a számaid.' 
        : 'See how many people viewed your video and track your statistics.',
    },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]">
      {/* Content */}
      <div 
        className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden"
        style={{ 
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 24px)' 
        }}
      >
        <div className="w-[90vw] max-w-[800px] mx-auto">
          
          {/* Header with red back button */}
          <header className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/creators')}
              className="relative rounded-full hover:scale-110 transition-all"
              style={{
                padding: 'clamp(8px, 2vw, 12px)',
                minWidth: 'clamp(40px, 10vw, 56px)',
                minHeight: 'clamp(40px, 10vw, 56px)'
              }}
            >
              <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} aria-hidden />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-700 via-red-600 to-red-900 border-2 border-red-400/50 shadow-lg" aria-hidden />
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-red-600 via-red-500 to-red-800" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }} aria-hidden />
              <div className="absolute inset-[5px] rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-700" style={{ boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.3)' }} aria-hidden />
              <div className="absolute inset-[5px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)' }} aria-hidden />
              <LogOut 
                className="text-white relative z-10 -scale-x-100" 
                style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
              />
            </button>
            
            <h1 className="text-white font-bold text-xl md:text-2xl">
              {lang === 'hu' ? 'Hogyan működik a Creator rendszer?' : 'How does the Creator system work?'}
            </h1>
          </header>

          {/* Hero Box */}
          <section className="mb-8 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 p-6 md:p-8 text-white">
            <h1 
              className="text-[clamp(1.25rem,5vw,2rem)] leading-tight mb-3"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}
            >
              {t('creators.hero_h1_part1')} <span className="text-[#dc2626]">{t('creators.hero_h1_highlight')}</span> {t('creators.hero_h1_part2')}
            </h1>
            <p className="text-white/80 text-[clamp(0.875rem,3vw,1rem)] mb-2">
              {t('creators.hero_h2')}
            </p>
            <p className="text-white/60 text-[clamp(0.75rem,2.5vw,0.875rem)]">
              {t('creators.hero_h3')}
            </p>
          </section>

          {/* Benefits Section */}
          <section className="mb-10">
            <h2 
              className="text-white font-bold text-lg md:text-xl mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {lang === 'hu' ? 'Miért jó neked?' : 'Why is it good for you?'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 hover:border-purple-500/30 transition-all"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                  >
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-white font-semibold text-base mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {benefit.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Steps Section */}
          <section className="mb-10">
            <h2 
              className="text-white font-bold text-lg md:text-xl mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {lang === 'hu' ? 'Hogyan működik?' : 'How does it work?'}
            </h2>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 flex gap-4 items-start hover:border-purple-500/30 transition-all"
                >
                  {/* Step Number */}
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                      boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <span className="text-white font-bold text-lg">{step.step}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <step.icon className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-semibold text-base">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 text-center">
            <h3 className="text-white font-bold text-lg mb-3">
              {lang === 'hu' ? 'Készen állsz?' : 'Ready to start?'}
            </h3>
            <p className="text-white/70 text-sm mb-4">
              {lang === 'hu' 
                ? 'Térj vissza a dashboardra és add hozzá az első videódat!' 
                : 'Go back to the dashboard and add your first video!'}
            </p>
            <button
              onClick={() => navigate('/creators')}
              className="px-6 py-3 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
              }}
            >
              {lang === 'hu' ? 'Vissza a Dashboardra' : 'Back to Dashboard'}
            </button>
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CreatorHowItWorks;
