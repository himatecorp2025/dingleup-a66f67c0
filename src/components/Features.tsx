import { Brain, Trophy, Users, Gift, Zap, Target } from "lucide-react";
import featureTrophy from "@/assets/feature-trophy.jpg";
import featureCategories from "@/assets/feature-categories.jpg";
import featureLeaderboard from "@/assets/feature-leaderboard.jpg";
import { useI18n } from "@/i18n";

const Features = () => {
  const { t } = useI18n();
  
  const features = [
    {
      icon: Brain,
      title: t('landing.features.topics_title'),
      description: t('landing.features.topics_description'),
      image: featureCategories,
    },
    {
      icon: Trophy,
      title: t('landing.features.rewards_title'),
      description: t('landing.features.rewards_description'),
      image: featureTrophy,
    },
    {
      icon: Users,
      title: t('landing.features.leaderboard_title'),
      description: t('landing.features.leaderboard_description'),
      image: featureLeaderboard,
    }
  ];

  const additionalFeatures = [
    {
      icon: Zap,
      title: t('landing.features.lifelines_title'),
      description: t('landing.features.lifelines_description'),
    },
    {
      icon: Gift,
      title: t('landing.features.daily_gift_title'),
      description: t('landing.features.daily_gift_description'),
    },
    {
      icon: Target,
      title: t('landing.features.challenge_title'),
      description: t('landing.features.challenge_description'),
    }
  ];
  return (
    <section id="features" className="py-24 px-4 relative bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033]">
      {/* Animated glowing orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-full px-4 xs:px-6 py-2 xs:py-3 mb-6 backdrop-blur-sm">
            <Zap className="w-4 h-4 xs:w-5 xs:h-5 text-pink-400 animate-pulse flex-shrink-0" />
            <span className="text-xs xs:text-sm sm:text-base font-bold text-pink-300 truncate">{t('landing.features.section_badge')}</span>
          </div>
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] break-words hyphens-auto px-4">
            {t('landing.features.section_title_part1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">{t('landing.features.section_title_part2')}</span>
          </h2>
          <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto drop-shadow-lg break-words px-4">
            {t('landing.features.section_subtitle')}
          </p>
        </div>

        {/* Main Features with Images */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-3xl border-2 border-white/10 overflow-hidden hover:border-yellow-400/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 to-transparent"></div>
                </div>
                
                {/* Content */}
                <div className="relative p-4 xs:p-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-md">
                  <div className="flex items-center gap-2 xs:gap-3 mb-3 xs:mb-4">
                    <div className="w-10 h-10 xs:w-12 xs:h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/50 flex-shrink-0">
                      <feature.icon className="w-5 h-5 xs:w-6 xs:h-6 text-white" />
                    </div>
                    <h3 className="text-base xs:text-lg sm:text-xl font-black text-white drop-shadow-lg break-words hyphens-auto line-clamp-2">{feature.title}</h3>
                  </div>
                  <p className="text-xs xs:text-sm sm:text-base text-white/90 leading-relaxed drop-shadow break-words line-clamp-4">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {additionalFeatures.map((feature, index) => (
            <div 
              key={index}
              className="relative group animate-fade-in"
              style={{ animationDelay: `${(index + 3) * 0.1}s` }}
            >
              <div className="relative p-5 xs:p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm border-2 border-white/10 hover:border-pink-400/50 transition-all duration-300 transform hover:scale-105 shadow-xl">
                <div className="w-12 h-12 xs:w-14 xs:h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4 xs:mb-5 shadow-lg shadow-pink-500/50 group-hover:shadow-pink-500/80 transition-all flex-shrink-0">
                  <feature.icon className="w-6 h-6 xs:w-7 xs:h-7 text-white" />
                </div>
                <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white mb-2 xs:mb-3 drop-shadow-lg break-words hyphens-auto line-clamp-2">{feature.title}</h3>
                <p className="text-xs xs:text-sm sm:text-base text-white/80 leading-relaxed drop-shadow break-words line-clamp-3">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
