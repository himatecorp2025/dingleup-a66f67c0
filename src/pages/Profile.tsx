import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useWallet } from '@/hooks/useWallet';
import { useI18n, LangCode } from '@/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useNativeFullscreen } from '@/hooks/useNativeFullscreen';
import defaultProfileImage from '@/assets/default-profile.png';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, LogOut, Camera, Heart, Coins, Trophy, Calendar, Zap, Crown, Settings, Globe, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import BottomNav from '@/components/BottomNav';
import { TutorialManager } from '@/components/tutorial/TutorialManager';
import { BackgroundMusicControl } from '@/components/BackgroundMusicControl';

const Profile = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { profile, loading, updateProfile, refreshProfile } = useProfileQuery(userId);
  const { walletData, refetchWallet } = useWallet(userId);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [weeklyCorrectAnswers, setWeeklyCorrectAnswers] = useState<number>(0);
  
  // FULLSCREEN MODE: Hide status bar on mobile devices (Web)
  useFullscreen({
    enabled: true,
    autoReenter: true,
  });

  // NATIVE FULLSCREEN: Hide status bar on iOS/Android Capacitor apps
  useNativeFullscreen();
  
  // PIN fields
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Platform detection for conditional padding
  const [isStandalone, setIsStandalone] = useState(false);
  
  useEffect(() => {
    const checkStandalone = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
      setIsStandalone(isPWA);
    };
    checkStandalone();
  }, []);
  
  // Auto logout on inactivity
  useAutoLogout();

  // Disable horizontal scrolling while on the profile page
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const prevRootOverflowX = root.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;

    root.style.overflowX = 'hidden';
    body.style.overflowX = 'hidden';

    return () => {
      root.style.overflowX = prevRootOverflowX;
      body.style.overflowX = prevBodyOverflowX;
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate('/auth/login');
      }
    });
  }, [navigate]);

  // Fetch daily correct answers
  const fetchDailyCorrectAnswers = async () => {
    if (!userId) return;

    // Calculate current day (YYYY-MM-DD UTC)
    const now = new Date();
    const currentDay = now.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_rankings')
      .select('total_correct_answers')
      .eq('user_id', userId)
      .eq('day_date', currentDay)
      .eq('category', 'mixed')
      .maybeSingle();

    if (error) {
      console.error('Error fetching daily correct answers:', error);
      setWeeklyCorrectAnswers(0);
      return;
    }

    setWeeklyCorrectAnswers(data?.total_correct_answers || 0);
  };

  useEffect(() => {
    if (userId) {
      fetchDailyCorrectAnswers();

      // Real-time subscription for daily_rankings updates
      const channel = supabase
        .channel('profile-daily-rankings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_rankings',
            filter: `user_id=eq.${userId}`
          },
          () => {
            fetchDailyCorrectAnswers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file size (max 10MB)
      const maxSizeBytes = 10 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error(t('profile.error.file_too_large'));
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.error.image_only'));
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: data.publicUrl });
      toast.success(t('profile.avatar_uploaded'));
    } catch (error: any) {
      toast.error(`${t('profile.error.upload_failed')}: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };


  const validatePin = (pin: string): string | null => {
    if (!/^\d{6}$/.test(pin)) {
      return t('profile.error.pin_6_digits');
    }
    return null;
  };

  const handlePinSave = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error(t('profile.error.all_fields_required'));
      return;
    }

    if (newPin !== confirmPin) {
      toast.error(t('profile.error.pins_not_match'));
      return;
    }

    const validationError = validatePin(newPin);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('errors.not_logged_in'));
        return;
      }

      const response = await supabase.functions.invoke('update-pin', {
        body: { currentPin, newPin },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || t('profile.error.invalid_current_pin'));
      }

      const responseData = response.data;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      toast.success(t('profile.pin_updated'));
    } catch (error: any) {
      toast.error(error.message || t('errors.general'));
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Skeleton loading state
  if (loading || !profile) {
    return (
      <div className="profile-container min-h-dvh min-h-svh w-screen fixed inset-0 overflow-y-auto overflow-x-hidden" style={{
        background: 'linear-gradient(135deg, #0a0a2e 0%, #16213e 50%, #0f0f3d 100%)',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div className="max-w-2xl mx-auto p-6 space-y-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}>
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          
          <Skeleton className="h-32 w-full rounded-lg" />
          
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // SVG Icons
  const HeartIcon = () => (
    <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 drop-shadow-[0_2px_8px_hsl(var(--destructive)/0.8)]" viewBox="0 0 24 24" fill="hsl(var(--foreground))" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
    </svg>
  );

  const CoinsIcon = () => (
    <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 drop-shadow-[0_2px_8px_hsl(var(--accent)/0.8)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="hsl(var(--foreground))" stroke="hsl(var(--accent))" strokeWidth="2.5"/>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" opacity="0.6"/>
    </svg>
  );

  const TrophyIcon = () => (
    <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 drop-shadow-[0_2px_8px_hsl(var(--success)/0.8)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9c0 3.866 2.686 7 6 7s6-3.134 6-7V4H6v5z" fill="hsl(var(--foreground))" stroke="hsl(var(--success))" strokeWidth="2.5"/>
      <path d="M6 9H4.5C3.67157 9 3 8.32843 3 7.5V6C3 5.17157 3.67157 4.5 4.5 4.5H6" stroke="hsl(var(--success))" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 9h1.5c.8284 0 1.5-.67157 1.5-1.5V6c0-.82843-.6716-1.5-1.5-1.5H18" stroke="hsl(var(--success))" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="9" y="16" width="6" height="4.5" rx="1" fill="hsl(var(--foreground))" stroke="hsl(var(--success))" strokeWidth="2.5"/>
      <line x1="7" y1="21" x2="17" y2="21" stroke="hsl(var(--success))" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 drop-shadow-[0_2px_8px_hsl(var(--primary)/0.8)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="16" rx="2" fill="hsl(var(--foreground))" stroke="hsl(var(--primary))" strokeWidth="2.5"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="hsl(var(--primary))" strokeWidth="2.5"/>
      <line x1="7" y1="3" x2="7" y2="8" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="17" y1="3" x2="17" y2="8" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="7" y="13" width="3" height="3" fill="hsl(var(--primary))" rx="1"/>
      <rect x="11" y="13" width="3" height="3" fill="hsl(var(--primary))" rx="1"/>
      <rect x="15" y="13" width="3" height="3" fill="hsl(var(--primary))" rx="1"/>
      <rect x="7" y="17" width="3" height="3" fill="hsl(var(--primary))" rx="1"/>
      <rect x="11" y="17" width="3" height="3" fill="hsl(var(--primary))" rx="1"/>
    </svg>
  );

  const ShareIcon = () => (
    <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 drop-shadow-[0_2px_8px_hsl(var(--primary-glow)/0.8)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="5" r="3" fill="hsl(var(--foreground))" stroke="hsl(var(--primary-glow))" strokeWidth="2.5"/>
      <circle cx="6" cy="12" r="3" fill="hsl(var(--foreground))" stroke="hsl(var(--primary-glow))" strokeWidth="2.5"/>
      <circle cx="18" cy="19" r="3" fill="hsl(var(--foreground))" stroke="hsl(var(--primary-glow))" strokeWidth="2.5"/>
      <line x1="8.5" y1="10.5" x2="15.5" y2="6.5" stroke="hsl(var(--primary-glow))" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8.5" y1="13.5" x2="15.5" y2="17.5" stroke="hsl(var(--primary-glow))" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  const ZapIcon = () => (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_8px_hsl(var(--accent)/0.8)]" viewBox="0 0 24 24" fill="hsl(var(--accent))" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="hsl(var(--accent)/0.8)" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );

  if (!profile) return null; // Don't render anything until profile loads

  return (
    <div className="profile-container h-dvh w-screen fixed inset-0 overflow-y-auto overflow-x-hidden flex flex-col" style={{
      paddingTop: 'max(calc(env(safe-area-inset-top) + 2%), env(safe-area-inset-top) + 8px)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      width: '100vw',
      maxWidth: '100vw',
      maxHeight: '100vh',
      touchAction: 'pan-y',
      overscrollBehaviorX: 'none'
    }}>
      {/* Full-screen background that covers status bar */}
      <div 
        className="fixed bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]"
        style={{
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none'
        }}
      />
      
      {/* Casino lights removed per user requirement */}
      
      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden" style={{ 
        width: '100%',
        maxWidth: '100%',
        paddingTop: 'clamp(8px, 2vh, 16px)',
        paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 120px)' 
      }}>
        <div style={{ 
          width: '90vw',
          maxWidth: '90vw',
          margin: '0 auto'
        }}>
        {/* Header - Back button and Avatar in same line - HIGHER UP */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="relative rounded-full hover:scale-110 transition-all"
            style={{
              padding: 'clamp(8px, 2vw, 12px)',
              minWidth: 'clamp(40px, 10vw, 56px)',
              minHeight: 'clamp(40px, 10vw, 56px)'
            }}
            title={t('profile.back_to_dashboard')}
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

          {/* Avatar on the same line as back button */}
          <div className="relative" data-tutorial="profile-pic">
            {/* Outer glow */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse"
              style={{ background: 'rgba(34, 211, 238, 0.4)', width: '64px', height: '64px' }}
            />

            {/* 3D Hexagon Container */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
              {/* BASE SHADOW (3D depth) */}
              <div
                className="absolute clip-hexagon"
                style={{
                  top: '3px',
                  left: '3px',
                  right: '-3px',
                  bottom: '-3px',
                  background: 'rgba(0,0,0,0.35)',
                  filter: 'blur(3px)',
                }}
                aria-hidden
              />

              {/* OUTER FRAME - gradient with border */}
              <div
                className="absolute inset-0 clip-hexagon bg-gradient-to-br from-cyan-900 via-cyan-600 to-cyan-800 border-2 sm:border-4 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6),0_8px_25px_rgba(0,0,0,0.5)]"
                aria-hidden
              />

              {/* MIDDLE FRAME (bright inner highlight) */}
              <div
                className="absolute inset-[3px] clip-hexagon bg-gradient-to-b from-cyan-600 via-cyan-400 to-cyan-700"
                style={{ boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.15)' }}
                aria-hidden
              />

              {/* INNER CRYSTAL/COLOR LAYER */}
              <div
                className="absolute clip-hexagon bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-700"
                style={{
                  top: '5px',
                  left: '5px',
                  right: '5px',
                  bottom: '5px',
                  boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.1), inset 0 -4px 8px rgba(0,0,0,0.15)',
                }}
                aria-hidden
              />

              {/* SPECULAR HIGHLIGHT (top-left) */}
              <div
                className="absolute clip-hexagon pointer-events-none"
                style={{
                  top: '5px',
                  left: '5px',
                  right: '5px',
                  bottom: '5px',
                  background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)',
                }}
                aria-hidden
              />

              {/* INNER GLOW (bottom shadow for 3D depth) */}
              <div
                className="absolute clip-hexagon pointer-events-none"
                style={{
                  top: '5px',
                  left: '5px',
                  right: '5px',
                  bottom: '5px',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.125)',
                }}
                aria-hidden
              />

              {/* Avatar Image */}
              <div className="absolute inset-[5px] flex items-center justify-center z-[5]">
                <img 
                  src={profile.avatar_url || defaultProfileImage} 
                  alt={profile.username}
                  className="w-full h-full object-cover clip-hexagon"
                />
              </div>
            </div>

            {/* Camera Upload Button with 3D effect */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full transition-all transform-gpu hover:scale-110 z-20"
              style={{ 
                background: 'linear-gradient(135deg, rgb(8 145 178) 0%, rgb(34 211 238) 50%, rgb(21 94 117) 100%)',
                border: '2px solid rgb(34 211 238)',
                boxShadow: '0 0 20px rgba(34,211,238,0.6), 0 8px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.3)'
              }}
            >
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 100%)' }}
              />
              <div 
                className="absolute inset-[1px] rounded-full pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 100%)' }}
              />
              <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white drop-shadow relative z-10" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* User Info */}
        <div className="text-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent via-foreground to-accent mb-1 flex items-center justify-center gap-2">
            {profile.username}
          </h1>
        </div>

        {/* Stats Grid - 2x3 unified layout */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6" data-tutorial="stats">
          {/* Lives - Deep 3D */}
          <div className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform-gpu" style={{ perspective: '1000px' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl" style={{ transform: 'translate(6px, 6px)', filter: 'blur(8px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-700 via-red-600 to-red-900 opacity-90 border-3 border-red-500/60 shadow-xl" style={{ transform: 'translateZ(0px)' }} aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[4px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-transparent to-black/70" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.5)', transform: 'translateZ(10px)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-red-500 via-red-600 to-red-700" style={{ boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -12px 24px rgba(0,0,0,0.3)', transform: 'translateZ(20px)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 40% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)', transform: 'translateZ(30px)' }} aria-hidden />
            
            {/* Content */}
            <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
              <HeartIcon />
              <p className="text-xs sm:text-sm text-foreground/90 mb-1 font-semibold drop-shadow-lg">{t('profile.lives')}</p>
              <p className="text-xl sm:text-2xl font-black text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{profile.lives}/{profile.max_lives}</p>
            </div>
          </div>

          {/* Coins - Deep 3D */}
          <div className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform-gpu" style={{ perspective: '1000px' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl" style={{ transform: 'translate(6px, 6px)', filter: 'blur(8px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-700 via-orange-600 to-orange-900 opacity-90 border-3 border-orange-500/60 shadow-xl" style={{ transform: 'translateZ(0px)' }} aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[4px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-transparent to-black/70" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.5)', transform: 'translateZ(10px)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700" style={{ boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -12px 24px rgba(0,0,0,0.3)', transform: 'translateZ(20px)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 40% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)', transform: 'translateZ(30px)' }} aria-hidden />
            
            {/* Content */}
            <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
              <CoinsIcon />
              <p className="text-xs sm:text-sm text-white/90 mb-1 font-semibold drop-shadow-lg">{t('profile.gold_coins')}</p>
              <p className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{profile.coins}</p>
            </div>
          </div>

          {/* Total Correct Answers - Deep 3D */}
          <div className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform-gpu" style={{ perspective: '1000px' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl" style={{ transform: 'translate(6px, 6px)', filter: 'blur(8px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-700 via-green-600 to-green-900 opacity-90 border-3 border-green-500/60 shadow-xl" style={{ transform: 'translateZ(0px)' }} aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[4px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-transparent to-black/70" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.5)', transform: 'translateZ(10px)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-green-500 via-green-600 to-green-700" style={{ boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -12px 24px rgba(0,0,0,0.3)', transform: 'translateZ(20px)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 40% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)', transform: 'translateZ(30px)' }} aria-hidden />
            
            {/* Content */}
            <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
              <TrophyIcon />
              <p className="text-xs sm:text-sm text-white/90 mb-1 font-semibold drop-shadow-lg">{t('profile.daily_correct_answers')}</p>
              <p className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{weeklyCorrectAnswers}</p>
            </div>
          </div>

          {/* Daily Streak - Deep 3D */}
          <div className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform-gpu" style={{ perspective: '1000px' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl" style={{ transform: 'translate(6px, 6px)', filter: 'blur(8px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-900 opacity-90 border-3 border-blue-500/60 shadow-xl" style={{ transform: 'translateZ(0px)' }} aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[4px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-transparent to-black/70" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.5)', transform: 'translateZ(10px)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700" style={{ boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -12px 24px rgba(0,0,0,0.3)', transform: 'translateZ(20px)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 40% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)', transform: 'translateZ(30px)' }} aria-hidden />
            
            {/* Content */}
            <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
              <CalendarIcon />
              <p className="text-xs sm:text-sm text-white/90 mb-1 font-semibold drop-shadow-lg">{t('profile.daily_streak')}</p>
              <p className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{profile.daily_gift_streak} {t('profile.days')}</p>
            </div>
          </div>

          {/* Invitation Code Card - Deep 3D */}
          <div 
            onClick={() => {
              navigator.clipboard.writeText(profile.invitation_code || '');
              toast.success(t('profile.invitation_code_copied'));
            }}
            className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center cursor-pointer transition-transform active:scale-95 transform-gpu hover:scale-105 hover:-translate-y-0.5"
            style={{ perspective: '1000px' }}
          >
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl" style={{ transform: 'translate(6px, 6px)', filter: 'blur(8px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 opacity-90 border-3 border-purple-500/60 shadow-xl" style={{ transform: 'translateZ(0px)' }} aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[4px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-transparent to-black/70" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.5)', transform: 'translateZ(10px)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-purple-500 via-purple-600 to-purple-700" style={{ boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -12px 24px rgba(0,0,0,0.3)', transform: 'translateZ(20px)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 40% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)', transform: 'translateZ(30px)' }} aria-hidden />
            
            {/* Content */}
            <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
              <ShareIcon />
              <p className="text-xs sm:text-sm text-white/90 mb-1 font-semibold drop-shadow-lg">{t('profile.invitation_code_tap')}</p>
              <p className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{profile.invitation_code}</p>
            </div>
          </div>

          {/* Free Booster Card - Deep 3D */}
          <div 
            className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform-gpu"
            style={{ perspective: '1000px' }}
          >
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl" style={{ transform: 'translate(6px, 6px)', filter: 'blur(8px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-700 via-yellow-600 to-yellow-900 opacity-90 border-3 border-yellow-500/60 shadow-xl" style={{ transform: 'translateZ(0px)' }} aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[4px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-transparent to-black/70" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.5)', transform: 'translateZ(10px)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-700" style={{ boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -12px 24px rgba(0,0,0,0.3)', transform: 'translateZ(20px)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[6px] rounded-xl sm:rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 40% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)', transform: 'translateZ(30px)' }} aria-hidden />
            
            {/* Content */}
            <div className="relative z-10 space-y-2" style={{ transform: 'translateZ(40px)' }}>
              <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 drop-shadow-[0_2px_8px_rgba(234,179,8,0.8)]" viewBox="0 0 24 24" fill="hsl(var(--foreground))" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="hsl(47, 96%, 53%)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <p className="text-xs sm:text-sm text-white/90 mb-1 font-semibold drop-shadow-lg">{t('profile.free_booster')}</p>
              <p className="text-[10px] sm:text-xs text-white/70 leading-tight" dangerouslySetInnerHTML={{ __html: t('profile.free_booster_rewards') }} />
              {boosterState.pendingSpeedTokensCount > 0 ? (
                <button
                  onClick={async () => {
                    try {
                      toast.loading(t('profile.speed_activating'), { id: 'speed-activate' });
                      const { data, error } = await supabase.functions.invoke('activate-speed-token');
                      if (error) throw error;
                      if (data?.success) {
                        toast.success(t('profile.speed_activated').replace('{minutes}', data.activeSpeedToken?.durationMinutes), { id: 'speed-activate' });
                        refetchWallet();
                        refreshProfile();
                      }
                    } catch (e) {
                      toast.error(t('profile.purchase_error'), { id: 'speed-activate' });
                    }
                  }}
                  className="w-full mt-2 px-2 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all shadow-lg"
                >
                  {t('profile.activate_speed')} ({boosterState.pendingSpeedTokensCount} {t('profile.speed_tokens')})
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if ((walletData?.coinsCurrent || 0) < 900) {
                      toast.error(t('profile.not_enough_gold'));
                      return;
                    }
                    try {
                      toast.loading(t('profile.purchasing'), { id: 'free-booster' });
                      const { data, error } = await supabase.functions.invoke('purchase-booster', {
                        body: { boosterCode: 'FREE' }
                      });
                      if (error) throw error;
                      if (data?.success) {
                        toast.success(t('profile.purchase_success').replace('{gold}', data.grantedRewards?.gold).replace('{lives}', data.grantedRewards?.lives), { id: 'free-booster' });
                        refetchWallet();
                        refreshProfile();
                      }
                    } catch (e) {
                      toast.error(t('profile.purchase_error'), { id: 'free-booster' });
                    }
                  }}
                  disabled={(walletData?.coinsCurrent || 0) < 900}
                  className="w-full mt-2 px-2 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {(walletData?.coinsCurrent || 0) < 900 ? t('profile.not_enough_gold') : t('profile.free_booster_price')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 backdrop-blur-sm transform-gpu">
          {/* Base shadow (3D depth) */}
          <div className="absolute rounded-xl sm:rounded-2xl bg-black/35 blur-md" style={{ top: '3px', left: '3px', right: '-3px', bottom: '-3px' }} aria-hidden />
          
          {/* Outer frame */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-700/40 via-purple-600/30 to-purple-900/40 border-2 border-purple-500/30
            shadow-[0_0_20px_rgba(168,85,247,0.4),0_8px_25px_rgba(0,0,0,0.5)]" aria-hidden />
          
          {/* Middle frame (bright highlight) */}
          <div className="absolute inset-[3px] rounded-xl sm:rounded-2xl bg-gradient-to-b from-purple-600/30 via-purple-500/20 to-purple-800/30"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }} aria-hidden />
          
          {/* Inner crystal layer */}
          <div className="absolute rounded-xl sm:rounded-2xl bg-gradient-to-b from-black/50 via-black/60 to-black/70"
            style={{ top: '5px', left: '5px', right: '5px', bottom: '5px', boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.1), inset 0 -8px 16px rgba(0,0,0,0.4)' }} aria-hidden />
          
          {/* Content */}
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-black text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 drop-shadow-[0_2px_8px_rgba(168,85,247,0.8)]" />
              {t('profile.account_info')}
            </h2>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Username (read-only) */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.username_label')}</p>
                <p className="text-sm sm:text-base text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{profile.username}</p>
              </div>
              
              {/* Birth Date (read-only) */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.birth_date_label')}</p>
                <p className="text-sm sm:text-base text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('hu-HU') : '1991. 05. 05.'}
                </p>
              </div>

              {/* Language Selector */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t('profile.language_label')}
                </p>
                <Select value={lang} onValueChange={(newLang: LangCode) => setLang(newLang, true)}>
                  <SelectTrigger className="bg-black/30 border-purple-500/30 text-white hover:border-purple-400/50 focus:border-purple-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-purple-500/30 z-50">
                    <SelectItem value="hu" className="text-foreground hover:bg-accent focus:bg-accent">
                      🇭🇺 Magyar
                    </SelectItem>
                    <SelectItem value="en" className="text-foreground hover:bg-accent focus:bg-accent">
                      🇬🇧 English
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/40 mt-1">
                  {t('profile.language_notice')}
                </p>
              </div>

              {/* Current PIN */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.pin.currentPinLabel')}</p>
                <div className="relative">
                  <Input
                    type={showCurrentPin ? 'text' : 'password'}
                    value={currentPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCurrentPin(value);
                    }}
                    placeholder={t('profile.pin.currentPinPlaceholder')}
                    className="bg-black/30 border-purple-500/30 text-white pr-10"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="\d{6}"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New PIN */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.pin.newPinLabel')}</p>
                <div className="relative">
                  <Input
                    type={showNewPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setNewPin(value);
                    }}
                    placeholder={t('profile.pin.newPinPlaceholder')}
                    className="bg-black/30 border-purple-500/30 text-white pr-10"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="\d{6}"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm PIN */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.pin.confirmPinLabel')}</p>
                <div className="relative">
                  <Input
                    type={showConfirmPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setConfirmPin(value);
                    }}
                    placeholder={t('profile.pin.confirmPinPlaceholder')}
                    className="bg-black/30 border-purple-500/30 text-white pr-10"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="\d{6}"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Life Regeneration */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.life_regeneration_label')}</p>
                <p className="text-sm sm:text-base text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {t('profile.life_regeneration_value').replace('{rate}', profile.lives_regeneration_rate.toString())}
                </p>
              </div>
              
              {/* Registration Date */}
              <div className="border-b border-purple-500/20 pb-2 sm:pb-3">
                <p className="text-xs sm:text-sm text-white/50 mb-1">{t('profile.registration_date_label')}</p>
                <p className="text-sm sm:text-base text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {new Date(profile.created_at).toLocaleDateString('hu-HU')}
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  onClick={handlePinSave}
                  disabled={isSaving}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 px-6 rounded-lg
                    shadow-[0_4px_12px_hsl(var(--accent)/0.6),0_0_24px_hsl(var(--accent)/0.4)]
                    hover:shadow-[0_6px_16px_hsl(var(--accent)/0.7),0_0_32px_hsl(var(--accent)/0.5)]
                    transition-all transform-gpu hover:scale-[1.02]"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('profile.pin.saving')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {t('profile.pin.changeButton')}
                    </span>
                   )}
                 </Button>
              </div>

              {/* About Us Button */}
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/about')}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 21H21M3 10H21M5 6L12 3L19 6M4 10V21M20 10V21M8 14V17M12 14V17M16 14V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('nav.about')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Background Music Control - Moved below Account Info */}
        <div style={{ marginTop: '5vh' }}>
          <BackgroundMusicControl />
        </div>
        </div>
      </div>

      <BottomNav />
      <TutorialManager route="profile" />
    </div>
  );
};

export default Profile;
