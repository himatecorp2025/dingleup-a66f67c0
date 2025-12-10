import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Plus, Menu, X, Video, Info, Eye, Users, MousePointerClick, Hash, Film, Trophy } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import defaultProfileImage from '@/assets/default-profile.png';
import { useAudioStore } from '@/stores/audioStore';
import PackageSelectorModal from '@/components/creators/PackageSelectorModal';
import VideoLinkModal from '@/components/creators/VideoLinkModal';
import { useCreatorSubscription } from '@/hooks/useCreatorSubscription';

// Platform Icons
const TikTokIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// "All" filter icon - 2x3 horizontal lines grid
const AllFilterIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {/* Left column - 3 lines */}
    <line x1="3" y1="6" x2="10" y2="6" />
    <line x1="3" y1="12" x2="10" y2="12" />
    <line x1="3" y1="18" x2="10" y2="18" />
    {/* Right column - 3 lines */}
    <line x1="14" y1="6" x2="21" y2="6" />
    <line x1="14" y1="12" x2="21" y2="12" />
    <line x1="14" y1="18" x2="21" y2="18" />
  </svg>
);

type PlatformFilter = 'all' | 'tiktok' | 'youtube' | 'instagram' | 'facebook';

const Creators = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PlatformFilter>('all');
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null; id: string } | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showVideoLinkModal, setShowVideoLinkModal] = useState(false);
  
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

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', session.user.id)
          .single();
        if (data) {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, []);

  // Use creator subscription hook
  const { hasActiveSubscription, maxVideos, refetch: refetchSubscription } = useCreatorSubscription(profile?.id);

  // Handle checkout success from URL params
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      toast.success(
        lang === 'hu'
          ? 'Sikeres fizetés! Most már hozzáadhatod a videóidat.'
          : 'Payment successful! You can now add your videos.'
      );
      refetchSubscription();
      // Clean URL
      window.history.replaceState({}, '', '/creators');
    } else if (checkoutStatus === 'cancelled') {
      toast.info(
        lang === 'hu'
          ? 'A fizetés megszakítva.'
          : 'Payment cancelled.'
      );
      window.history.replaceState({}, '', '/creators');
    }
  }, [searchParams, lang, refetchSubscription]);

  // Listen for BottomNav "+" click event
  useEffect(() => {
    const handleCreatorAddVideo = () => {
      if (hasActiveSubscription) {
        setShowVideoLinkModal(true);
      } else {
        setShowPackageModal(true);
      }
    };

    window.addEventListener('creator-add-video-click', handleCreatorAddVideo);
    return () => window.removeEventListener('creator-add-video-click', handleCreatorAddVideo);
  }, [hasActiveSubscription]);

  // Placeholder video data (empty for now)
  const videos: any[] = [];
  const hasVideos = videos.length > 0;

  const handleAddVideo = () => {
    if (hasActiveSubscription) {
      setShowVideoLinkModal(true);
    } else {
      setShowPackageModal(true);
    }
  };

  const handlePackageSuccess = () => {
    refetchSubscription();
    setShowVideoLinkModal(true);
  };

  const handleVideoAdded = (videoUrl: string) => {
    // TODO: Refresh video list
    console.log('Video added:', videoUrl);
  };

  const filters: { id: PlatformFilter; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'all', icon: <AllFilterIcon className="w-5 h-5" /> },
    { id: 'tiktok', icon: <TikTokIcon className="w-5 h-5" /> },
    { id: 'youtube', icon: <YouTubeIcon className="w-5 h-5" />, disabled: true },
    { id: 'instagram', icon: <InstagramIcon className="w-5 h-5" />, disabled: true },
    { id: 'facebook', icon: <FacebookIcon className="w-5 h-5" />, disabled: true },
  ];

  const benefits = [
    { icon: Eye, titleKey: 'creators.benefit1_title', textKey: 'creators.benefit1_text' },
    { icon: Hash, titleKey: 'creators.benefit4_title', textKey: 'creators.benefit4_text' },
    { icon: Users, titleKey: 'creators.benefit2_title', textKey: 'creators.benefit2_text' },
    { icon: MousePointerClick, titleKey: 'creators.benefit3_title', textKey: 'creators.benefit3_text' },
  ];

  const steps = [
    { step: '1', titleKey: 'creators.step1_title', textKey: 'creators.step1_text' },
    { step: '2', titleKey: 'creators.step2_title', textKey: 'creators.step2_text' },
    { step: '3', titleKey: 'creators.step3_title', textKey: 'creators.step3_text' },
    { step: '4', titleKey: 'creators.step4_title', textKey: 'creators.step4_text' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-64 bg-[#0f0f3d] shadow-xl border-l border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              <button 
                onClick={() => { setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-lg bg-white/10 text-white font-medium"
              >
                Dashboard
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/creators/how-it-works'); }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-white/70"
              >
                {lang === 'hu' ? 'Hogyan működik' : 'How it works'}
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Header */}
      <header 
        className="px-4 py-1"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}
      >
        {/* Top row: Back button + Menu */}
        <div className="flex items-center justify-between mb-1">
          {/* Back Button - Profile page style */}
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

          {/* Desktop: How it works + Add video button - ONLY on desktop/laptop */}
          <div className="hidden lg:flex items-center gap-4">
            <button 
              onClick={() => navigate('/creators/how-it-works')}
              className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Info className="w-4 h-4" />
              {lang === 'hu' ? 'Hogyan működik' : 'How it works'}
            </button>
            <button
              onClick={handleAddVideo}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              {lang === 'hu' ? 'Videolink hozzáadása' : 'Add video link'}
            </button>
          </div>

          {/* Mobile/Tablet Menu Button - hidden on desktop */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Profile: Avatar above Username (vertical stack, centered) */}
        <div className="flex flex-col items-center gap-1">
          {/* Avatar - 25% larger (w-16 -> w-20) */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-400/50 shadow-lg">
            <img 
              src={profile?.avatar_url || defaultProfileImage} 
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Username + Dashboard text */}
          <div className="text-center">
            <h2 className="text-base font-bold text-white">
              {profile?.username || 'Creator'}
            </h2>
            <p className="text-xs text-white/60">Creator Dashboard</p>
          </div>

          {/* Stats - icon + number + label */}
          <div className="flex items-center justify-center w-full max-w-xs mx-auto mt-1">
            <div className="flex-1 flex flex-col items-center">
              <Film className="w-4 h-4 text-purple-400 mb-0.5" />
              <span className="text-base font-bold text-white">0</span>
              <span className="text-[10px] text-white/60">{lang === 'hu' ? 'Videóim' : 'Videos'}</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <Trophy className="w-4 h-4 text-yellow-400 mb-0.5" />
              <span className="text-base font-bold text-white">0</span>
              <span className="text-[10px] text-white/60">{lang === 'hu' ? 'Eléréseim' : 'Reach'}</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <Eye className="w-4 h-4 text-purple-400 mb-0.5" />
              <span className="text-base font-bold text-white">0</span>
              <span className="text-[10px] text-white/60">{lang === 'hu' ? 'Megtekintéseim' : 'Views'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 24px)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Platform Filter Icons - Always visible, equally distributed */}
          <div className="flex items-center justify-between mb-6">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => !filter.disabled && setActiveFilter(filter.id)}
                disabled={filter.disabled}
                className={`flex-1 flex items-center justify-center p-3 mx-1 rounded-xl transition-all ${
                  activeFilter === filter.id
                    ? 'bg-white/20 text-white shadow-lg'
                    : filter.disabled
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                title={filter.id === 'all' 
                  ? (lang === 'hu' ? 'Összes' : 'All')
                  : filter.id.charAt(0).toUpperCase() + filter.id.slice(1)
                }
              >
                {filter.icon}
              </button>
            ))}
          </div>

          {/* Hero Box - Only shows when no videos */}
          {!hasVideos && (
            <section className="mb-4 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 p-4 text-white text-center">
              <h1 
                className="text-[clamp(1rem,4vw,1.5rem)] leading-tight mb-2"
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}
              >
                {t('creators.hero_h1_part1')} <span className="text-[#dc2626]">{t('creators.hero_h1_highlight')}</span> {t('creators.hero_h1_part2')}
              </h1>
              <p className="text-white/80 text-[clamp(0.75rem,2.5vw,0.875rem)] mb-2">
                {t('creators.hero_h2')}
              </p>
              <p className="text-white/60 text-[clamp(0.625rem,2vw,0.75rem)] mb-4">
                {t('creators.hero_h3')}
              </p>
              
              {/* Empty state inside hero box */}
              <div className="text-center py-4 px-4 bg-white/5 rounded-lg border border-white/10">
                <div className="w-14 h-14 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
                  <Video className="w-7 h-7 text-white/40" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {lang === 'hu' ? 'Még nem osztottál meg videót' : "You haven't shared a video yet"}
                </h3>
                <p className="text-white/60 text-xs max-w-sm mx-auto">
                  {lang === 'hu' 
                    ? 'Hamarosan itt fognak megjelenni a TikTok videóid, amelyeket a játékosaink látni fognak.'
                    : 'Your TikTok videos that our players will see will appear here soon.'}
                </p>
              </div>
            </section>
          )}

          {/* Video List - Only when has videos */}
          {hasVideos && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {/* Video cards will go here */}
            </div>
          )}

          {/* "Miért jó neked?" Section - Only shows when no videos */}
          {!hasVideos && (
            <section className="mt-4 pt-4 border-t border-white/10">
              <h2 className="text-base font-bold text-white mb-3">
                {t('creators.benefits_title')}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
                  >
                    <div 
                      className="flex items-center justify-center w-8 h-8 rounded-full mb-2 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                    >
                      <benefit.icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-semibold text-white text-xs mb-0.5">
                      {t(benefit.titleKey)}
                    </h3>
                    <p className="text-[10px] text-white/60 leading-tight">
                      {t(benefit.textKey)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* "Hogyan működik?" Section - Only shows when no videos */}
          {!hasVideos && (
            <section className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white">
                  {t('creators.steps_title')}
                </h2>
                <button
                  onClick={() => navigate('/creators/how-it-works')}
                  className="text-xs text-pink-400 hover:text-pink-300 font-medium"
                >
                  {lang === 'hu' ? 'Részletek →' : 'Details →'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {steps.map((step, index) => (
                  <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-xs mb-2">
                      {step.step}
                    </div>
                    <h3 className="font-semibold text-white text-xs mb-0.5">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-[10px] text-white/60 leading-tight">
                      {t(step.textKey)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Closing Section - Only shows when no videos */}
          {!hasVideos && (
            <section className="mt-4 mb-4 text-center">
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                <p className="text-white text-xs leading-relaxed mb-3">
                  {t('creators.closing_text')}
                </p>
                <button
                  disabled
                  className="px-4 py-2 rounded-full font-semibold text-white/60 bg-white/10 cursor-not-allowed text-sm"
                >
                  {t('creators.cta_button')}
                </button>
                <p className="text-white/40 text-[10px] mt-2">
                  {lang === 'hu' ? 'Hamarosan elérhető' : 'Coming soon'}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Package Selector Modal */}
      <PackageSelectorModal
        isOpen={showPackageModal}
        onClose={() => setShowPackageModal(false)}
        onSuccess={handlePackageSuccess}
        lang={lang as 'hu' | 'en'}
      />

      {/* Video Link Modal */}
      <VideoLinkModal
        isOpen={showVideoLinkModal}
        onClose={() => setShowVideoLinkModal(false)}
        onSuccess={handleVideoAdded}
        lang={lang as 'hu' | 'en'}
        maxVideos={maxVideos}
        currentVideoCount={videos.length}
      />
    </div>
  );
};

export default Creators;
