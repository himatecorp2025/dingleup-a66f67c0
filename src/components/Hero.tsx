import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles, Trophy, Zap } from "lucide-react";
import { useI18n } from "@/i18n";
import { LanguageSelector } from "./LanguageSelector";

const Hero = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePlayNowClick = () => {
    const isMobileOrTablet = window.innerWidth <= 1024;
    if (isMobileOrTablet) {
      navigate('/auth/login');
    } else {
      navigate('/install');
    }
  };

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden py-12 sm:py-20">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      {/* Deep Purple/Blue Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033]"></div>
      
      {/* Animated glowing orbs - pink and purple */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '0.7s' }}></div>
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              opacity: 0.6
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          {/* Logo Section with glow */}
          <div className="flex justify-center mb-8 sm:mb-12 animate-fade-in">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 rounded-full blur-3xl group-hover:blur-[60px] transition-all duration-700 animate-pulse"></div>
              <svg 
                xmlns="http://www.w3.org/2000/svg"
                width="200"
                height="200"
                viewBox="0 0 1024 1024"
                className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500"
              >
                <image
                  href="/logo.png"
                  x="0"
                  y="0"
                  width="1024"
                  height="1024"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-12 sm:mb-16 space-y-4 sm:space-y-6 animate-fade-in px-4" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-10 sm:mb-12 leading-tight sm:leading-snug md:leading-relaxed max-w-6xl mx-auto break-words hyphens-auto">
              <span className="text-white/90 drop-shadow-lg block">
                {t('landing.hero.title_line1')}
              </span>
              <span className="text-white/90 drop-shadow-lg block">
                {t('landing.hero.title_line2')}
              </span>
            </h1>
            
            <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/90 max-w-3xl mx-auto leading-relaxed font-light px-2 drop-shadow-lg break-words">
              {t('landing.hero.subtitle_line1')}
            </p>
          </div>

          {/* Mobile Screenshots Showcase */}
          <div className="relative mb-12 sm:mb-16 animate-fade-in hidden sm:block" style={{ animationDelay: '0.4s' }}>
            <div className="flex justify-center items-center gap-4 perspective-1000">
              {/* Game screenshot mockups */}
              <div className="relative w-64 h-[350px] bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-3xl border-4 border-white/20 shadow-2xl backdrop-blur-sm transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-lg animate-pulse" />
                </div>
              </div>
              <div className="relative w-64 h-[350px] bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl border-4 border-white/20 shadow-2xl backdrop-blur-sm transform scale-110 hover:scale-115 transition-transform duration-500 z-10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-20 h-20 text-pink-400 drop-shadow-lg animate-pulse" />
                </div>
              </div>
              <div className="relative w-64 h-[350px] bg-gradient-to-br from-pink-600/20 to-purple-600/20 rounded-3xl border-4 border-white/20 shadow-2xl backdrop-blur-sm transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-20 h-20 text-blue-400 drop-shadow-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-8 sm:mb-12 animate-fade-in px-4" style={{ animationDelay: '0.6s' }}>
            <Button
              onClick={handlePlayNowClick}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800 text-white font-black text-base xs:text-lg sm:text-xl md:text-2xl px-6 xs:px-8 sm:px-12 py-5 xs:py-6 sm:py-7 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:shadow-[0_0_50px_rgba(34,197,94,0.8)] border-2 border-green-400 transform hover:scale-105 transition-all duration-300 truncate"
            >
              <Play className="mr-2 h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 flex-shrink-0" />
              <span className="truncate">{t('landing.hero.cta_start_game')}</span>
            </Button>
            
            <Button
              onClick={() => navigate('/auth/login')}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-bold text-sm xs:text-base sm:text-lg md:text-xl px-5 xs:px-6 sm:px-10 py-4 xs:py-5 sm:py-6 rounded-full border-2 border-white/30 hover:border-white/60 backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-300 truncate"
            >
              <span className="truncate">{t('landing.hero.cta_learn_more')}</span>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-2 xs:gap-3 sm:gap-4 animate-fade-in px-4" style={{ animationDelay: '0.8s' }}>
            <div className="flex items-center gap-1.5 xs:gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-3">
              <Trophy className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-yellow-400 flex-shrink-0" />
              <span className="text-white font-semibold text-xs xs:text-sm sm:text-base truncate">{t('landing.hero.feature_daily_ranking')}</span>
            </div>
            <div className="flex items-center gap-1.5 xs:gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-3">
              <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-pink-400 flex-shrink-0" />
              <span className="text-white font-semibold text-xs xs:text-sm sm:text-base truncate">{t('landing.hero.feature_topics')}</span>
            </div>
            <div className="flex items-center gap-1.5 xs:gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-3">
              <Zap className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0" />
              <span className="text-white font-semibold text-xs xs:text-sm sm:text-base truncate">{t('landing.hero.feature_questions')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
