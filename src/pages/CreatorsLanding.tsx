import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Play, Eye, Users, MousePointerClick, Hash, Zap, Trophy, Target, Bell, Sparkles, TrendingUp, Video } from "lucide-react";
import { useI18n } from "@/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Footer from "@/components/Footer";

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

const CreatorsLanding = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoinClick = () => {
    navigate('/auth/login');
  };

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      toast.error(lang === 'hu' ? 'Adj meg egy érvényes email címet!' : 'Please enter a valid email address!');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({ email: email.trim().toLowerCase() });

      if (error) {
        if (error.code === '23505') {
          toast.error(lang === 'hu' ? 'Ez az email már feliratkozott!' : 'This email is already subscribed!');
        } else {
          throw error;
        }
      } else {
        toast.success(lang === 'hu' ? 'Sikeresen feliratkoztál!' : 'Successfully subscribed!');
        setEmail("");
      }
    } catch (error) {
      toast.error(lang === 'hu' ? 'Hiba történt, próbáld újra!' : 'An error occurred, please try again!');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { 
      icon: Eye, 
      title: lang === 'hu' ? 'Garantált figyelem!' : 'Guaranteed Attention!',
      description: lang === 'hu' 
        ? '15 másodperc, amikor CSAK rád figyelnek. Nem scrolloznak tovább - itt végre téged néznek!' 
        : '15 seconds when they ONLY focus on you. No scrolling away - here they actually watch YOU!'
    },
    { 
      icon: Hash, 
      title: lang === 'hu' ? 'Felejtsd el a hashtag-harcot!' : 'Forget the Hashtag Battle!',
      description: lang === 'hu' 
        ? 'Témakör alapú célzás, nem hashtag-spam. A megfelelő közönség talál rád automatikusan.' 
        : 'Topic-based targeting, not hashtag spam. The right audience finds you automatically.'
    },
    { 
      icon: Users, 
      title: lang === 'hu' ? 'Valódi közönség!' : 'Real Audience!',
      description: lang === 'hu' 
        ? 'Nem random nézők - olyan emberek, akik TÉNYLEG érdeklődnek a témáid iránt.' 
        : "Not random viewers - people who ACTUALLY care about your topics."
    },
    { 
      icon: MousePointerClick, 
      title: lang === 'hu' ? 'Rajongókat építhetsz!' : 'Build Real Fans!',
      description: lang === 'hu' 
        ? 'Egy kattintás és a profilodon vannak. Egyszerűbb követőszerzés, mint valaha.' 
        : "One click and they're on your profile. Easier follower growth than ever."
    },
  ];

  const steps = [
    { 
      step: '1', 
      title: lang === 'hu' ? '30 napig kötetlenül!' : '30 Days Free Trial!',
      description: lang === 'hu' ? 'Próbáld ki kockázat nélkül' : 'Try it risk-free'
    },
    { 
      step: '2', 
      title: lang === 'hu' ? 'Kiválasztod a videód linkjét!' : 'Pick Your Video Link!',
      description: lang === 'hu' ? 'TikTok, YouTube, Instagram, Facebook' : 'TikTok, YouTube, Instagram, Facebook'
    },
    { 
      step: '3', 
      title: lang === 'hu' ? 'A többit mi intézzük!' : 'We Handle the Rest!',
      description: lang === 'hu' ? 'Automatikus megjelenítés' : 'Automatic distribution'
    },
    { 
      step: '4', 
      title: lang === 'hu' ? 'Kövesd az eredményed!' : 'Track Your Results!',
      description: lang === 'hu' ? 'Részletes analitika' : 'Detailed analytics'
    },
  ];

  const stats = [
    { value: '15s', label: lang === 'hu' ? 'Garantált figyelés' : 'Guaranteed Watch Time' },
    { value: '100%', label: lang === 'hu' ? 'Valódi nézők' : 'Real Viewers' },
    { value: '30', label: lang === 'hu' ? 'Témakör' : 'Topics' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-12 sm:py-20 px-4">
        {/* Animated glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '0.7s' }}></div>

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

        <div className="container mx-auto relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30 rounded-full px-4 py-2 mb-8 backdrop-blur-sm animate-fade-in">
              <Video className="w-5 h-5 text-pink-400" />
              <span className="text-sm font-bold text-pink-300">
                {lang === 'hu' ? 'Tartalomgyártóknak' : 'For Content Creators'}
              </span>
            </div>

            {/* Platform Icons */}
            <div className="flex justify-center gap-6 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                <TikTokIcon className="w-7 h-7 text-pink-400" />
              </div>
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                <YouTubeIcon className="w-7 h-7 text-red-500" />
              </div>
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                <InstagramIcon className="w-7 h-7 text-purple-400" />
              </div>
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                <FacebookIcon className="w-7 h-7 text-blue-500" />
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 leading-[1.8] animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <span className="text-white block pb-2">
                {lang === 'hu' ? 'Érd el, hogy' : 'Make'}
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 block py-2">
                {lang === 'hu' ? 'MINDENKI megnézze' : 'EVERYONE watch'}
              </span>
              <span className="text-white block pt-2">
                {lang === 'hu' ? 'a videóidat!' : 'your videos!'}
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm xs:text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {lang === 'hu' 
                ? 'Garantált figyelmet adunk — itt nem scrolloznak tovább!' 
                : "We give you guaranteed attention — here they don't scroll away!"}
            </p>

            <p className="text-xs xs:text-sm sm:text-base text-pink-300 font-semibold mb-10 animate-fade-in" style={{ animationDelay: '0.35s' }}>
              {lang === 'hu' 
                ? 'Felejtsd el az algoritmust! Itt végre téged néznek!' 
                : 'Forget the algorithm! Here they finally watch YOU!'}
            </p>

            {/* CTA Button */}
            <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button
                onClick={handleJoinClick}
                size="lg"
                className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 hover:from-pink-600 hover:via-orange-600 hover:to-yellow-600 text-white font-black text-base sm:text-xl px-8 sm:px-14 py-6 sm:py-8 rounded-full shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:shadow-[0_0_60px_rgba(236,72,153,0.8)] border-2 border-pink-400/50 transform hover:scale-105 transition-all duration-300"
              >
                <Play className="mr-2 h-5 w-5 sm:h-7 sm:w-7" />
                {lang === 'hu' ? 'Érdekel, csatlakozom!' : "I'm Interested, Join Now!"}
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-12 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              {stats.map((stat, index) => (
                <div key={index} className="flex flex-col items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4">
                  <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">{stat.value}</span>
                  <span className="text-xs sm:text-sm text-white/70">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="text-sm font-bold text-purple-300">
                {lang === 'hu' ? 'Miért válassz minket?' : 'Why Choose Us?'}
              </span>
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 text-white">
              {lang === 'hu' ? 'Garantált' : 'Guaranteed'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                {lang === 'hu' ? 'előnyök' : 'benefits'}
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="group relative animate-fade-in h-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-2 border-white/10 hover:border-pink-400/50 transition-all duration-300 transform hover:scale-105 shadow-xl h-full min-h-[200px] flex flex-col">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/50 group-hover:shadow-pink-500/80 transition-all flex-shrink-0">
                    <benefit.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm sm:text-base text-white/70 leading-relaxed flex-grow">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-orange-300">
                {lang === 'hu' ? 'Hogyan működik?' : 'How Does It Work?'}
              </span>
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 text-white">
              {lang === 'hu' ? '4 egyszerű' : '4 simple'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                {lang === 'hu' ? 'lépés' : 'steps'}
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative animate-fade-in h-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-orange-600/20 to-yellow-600/20 backdrop-blur-sm border-2 border-white/10 hover:border-orange-400/50 transition-all duration-300 transform hover:scale-105 text-center h-full min-h-[180px] flex flex-col">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/50 flex-shrink-0">
                    <span className="text-xl font-black text-white">{step.step}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/60 flex-grow">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="relative p-10 sm:p-12 overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600/30 to-orange-600/30 backdrop-blur-md border-2 border-white/20 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/30 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-6 drop-shadow-lg" />
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 text-white">
                  {lang === 'hu' ? 'Készen állsz a sikerre?' : 'Ready for Success?'}
                </h2>
                <p className="text-base sm:text-lg text-white/80 mb-8">
                  {lang === 'hu' 
                    ? 'Csatlakozz most és szerezz új követőket minden nap!' 
                    : 'Join now and get new followers every day!'}
                </p>
                <Button
                  onClick={handleJoinClick}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 hover:from-pink-600 hover:via-orange-600 hover:to-yellow-600 text-white font-black text-base sm:text-xl px-10 sm:px-16 py-6 sm:py-8 rounded-full shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:shadow-[0_0_60px_rgba(236,72,153,0.8)] border-2 border-pink-400/50 transform hover:scale-105 transition-all duration-300"
                >
                  <Zap className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  {lang === 'hu' ? 'Érdekel, csatlakozom!' : "I'm Interested, Join Now!"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <div className="relative p-10 sm:p-12 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 backdrop-blur-md border-2 border-white/20 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/50">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-black mb-4 text-white">
                  {lang === 'hu' ? 'Maradj naprakész!' : 'Stay Updated!'}
                </h2>
                <p className="text-sm sm:text-base text-white/80 mb-8">
                  {lang === 'hu' 
                    ? 'Iratkozz fel és értesülj elsőként az újdonságokról és exkluzív tippekről!' 
                    : 'Subscribe and be the first to know about updates and exclusive tips!'}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder={lang === 'hu' ? 'Email címed' : 'Your email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                    className="flex-1 bg-white/10 border-white/30 focus:border-purple-400 text-white placeholder:text-white/60 backdrop-blur-sm"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 px-8 font-bold whitespace-nowrap shadow-lg shadow-purple-500/50 hover:shadow-purple-500/80 transition-all"
                  >
                    {loading 
                      ? (lang === 'hu' ? 'Küldés...' : 'Sending...') 
                      : (lang === 'hu' ? 'Feliratkozás' : 'Subscribe')}
                  </Button>
                </div>

                <p className="text-xs text-white/50 mt-4">
                  {lang === 'hu' ? 'Nem spammelünk, ígérjük! 🤙' : "We don't spam, promise! 🤙"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Home Link */}
      <div className="text-center pb-12">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-white transition-colors text-sm underline"
        >
          {lang === 'hu' ? '← Vissza a főoldalra' : '← Back to Home'}
        </button>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CreatorsLanding;
