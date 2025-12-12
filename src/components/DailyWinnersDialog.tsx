import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import HexShieldFrame from './frames/HexShieldFrame';
import HexAcceptButton from './ui/HexAcceptButton';
import { useI18n } from '@/i18n/useI18n';
import { toast } from 'sonner';
import laurelWreathGold from '@/assets/laurel_wreath_gold.svg';
import { useDailyRankReward } from '@/hooks/useDailyRankReward';
import { logger } from '@/lib/logger';
interface DailyWinnersDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TopPlayer {
  user_id: string;
  rank: number;
  username: string;
  avatar_url: string | null;
  total_correct_answers: number;
}

interface TotalRewards {
  totalGold: number;
  totalLives: number;
}

// Generate unique IDs for SVG gradients to prevent conflicts
const generateUniqueId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export const DailyWinnersDialog = ({ open, onClose }: DailyWinnersDialogProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [contentVisible, setContentVisible] = useState(false);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [totalRewards, setTotalRewards] = useState<TotalRewards>({ totalGold: 150000, totalLives: 20000 });
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const badgeRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  
  // Fixed 3D canvas dimensions
  const BASE_WIDTH = 414;
  const BASE_HEIGHT = 736;
  
  // Fetch current user for pendingReward check
  const [userId, setUserId] = useState<string | undefined>();
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    fetchUser();
  }, []);
  
  // Integrate useDailyRankReward hook for dynamic button
  const { pendingReward, claimReward, isClaiming } = useDailyRankReward(userId);
  
  // Generate unique IDs once per component instance
  const svgIds = useMemo(() => ({
    coinGold: generateUniqueId('coinGold3D'),
    coinInner: generateUniqueId('coinInner'),
    coinShadow: generateUniqueId('coinShadow'),
    heartGradient: generateUniqueId('heartGradient3D'),
    heartHighlight: generateUniqueId('heartHighlight'),
    heartShadow: generateUniqueId('heartShadow'),
  }), []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate scale for responsive canvas
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = vw / BASE_WIDTH;
      const scaleY = vh / BASE_HEIGHT;
      const nextScale = Math.min(scaleX, scaleY);
      setScale(nextScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [BASE_WIDTH, BASE_HEIGHT]);

  // Add keyframes for animations only once
  useEffect(() => {
    const styleId = 'daily-winners-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const fetchYesterdayTopPlayers = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    try {
      // Step 1: Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) {
        logger.error('[DAILY-WINNERS] No authenticated user');
        setTopPlayers([]);
        return;
      }

      // Step 2: Get user profile (country_code, user_timezone)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('country_code, user_timezone')
        .eq('id', user.id)
        .single();

      if (!isMountedRef.current) return;

      if (profileError || !profileData?.country_code) {
        logger.error('[DAILY-WINNERS] Error fetching user profile:', profileError);
        setTopPlayers([]);
        return;
      }

      const userCountry = profileData.country_code;
      const userTimezone = profileData.user_timezone || 'Europe/Budapest';

      // Step 3: Calculate yesterday's date using timezone-aware helper
      const { getYesterdayDateInUserTimezone } = await import('@/lib/dateHelpers');
      const yesterdayDate = getYesterdayDateInUserTimezone(userTimezone);

      logger.log('[DAILY-WINNERS] Fetching winners for country:', userCountry, 'timezone:', userTimezone, 'yesterday:', yesterdayDate);

      // Step 4: Fetch TOP 10 winners from daily_winner_awarded (truth source)
      const { data: players, error } = await supabase
        .from('daily_winner_awarded')
        .select('user_id, rank, username, avatar_url, total_correct_answers')
        .eq('country_code', userCountry)
        .eq('day_date', yesterdayDate)
        .order('rank', { ascending: true })
        .limit(10);

      if (!isMountedRef.current) return;

      if (error) {
        logger.error('[DAILY-WINNERS] Error fetching winners:', error);
        setTopPlayers([]);
        return;
      }

      // Step 5: If no data, trigger on-demand processing
      if (!players || players.length === 0) {
        logger.log('[DAILY-WINNERS] No data found - triggering process-daily-winners');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          logger.error('[DAILY-WINNERS] No session for processing');
          setTopPlayers([]);
          setTotalRewards({ totalGold: 0, totalLives: 0 });
          return;
        }
        
        try {
          // Invoke process-daily-winners with targetDate parameter
          const { error: processError } = await supabase.functions.invoke('process-daily-winners', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { targetDate: yesterdayDate }
          });
          
          if (processError) {
            logger.error('[DAILY-WINNERS] Processing error:', processError);
            setTopPlayers([]);
            setTotalRewards({ totalGold: 0, totalLives: 0 });
            return;
          }
          
          // FAST poll - 3 times with 200ms intervals (600ms total max)
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (!isMountedRef.current) return;
            
            const { data: refetchedPlayers, error: refetchError } = await supabase
              .from('daily_winner_awarded')
              .select('user_id, rank, username, avatar_url, total_correct_answers')
              .eq('country_code', userCountry)
              .eq('day_date', yesterdayDate)
              .order('rank', { ascending: true })
              .limit(10);
            
            if (!refetchError && refetchedPlayers && refetchedPlayers.length > 0) {
              logger.log(`[DAILY-WINNERS] Data appeared after poll ${i + 1}`);
              setTopPlayers(refetchedPlayers as TopPlayer[]);
              
              // Calculate total rewards with country_code filter
              const { data: rewards } = await supabase
                .from('daily_winner_awarded')
                .select('gold_awarded, lives_awarded')
                .eq('country_code', userCountry)
                .eq('day_date', yesterdayDate)
                .lte('rank', 10);
              
              if (rewards && isMountedRef.current) {
                const totalGold = rewards.reduce((sum, r) => sum + r.gold_awarded, 0);
                const totalLives = rewards.reduce((sum, r) => sum + r.lives_awarded, 0);
                setTotalRewards({ totalGold, totalLives });
              }
              return;
            }
          }
          
          // After 3 fast polls, no data - gracefully handle
          logger.log('[DAILY-WINNERS] No data after 3 fast polls');
          if (isMountedRef.current) {
            setTopPlayers([]);
            setTotalRewards({ totalGold: 0, totalLives: 0 });
          }
          
        } catch (processError) {
          logger.error('[DAILY-WINNERS] Processing exception:', processError);
          if (isMountedRef.current) {
            setTopPlayers([]);
            setTotalRewards({ totalGold: 0, totalLives: 0 });
          }
        }
        return;
      }

      // Step 6: Data exists - set players and calculate rewards
      setTopPlayers(players as TopPlayer[]);
      
      // Calculate total rewards with country_code filter (CRITICAL)
      const { data: rewards } = await supabase
        .from('daily_winner_awarded')
        .select('gold_awarded, lives_awarded')
        .eq('country_code', userCountry)
        .eq('day_date', yesterdayDate)
        .lte('rank', 10);
      
      if (rewards && isMountedRef.current) {
        const totalGold = rewards.reduce((sum, r) => sum + r.gold_awarded, 0);
        const totalLives = rewards.reduce((sum, r) => sum + r.lives_awarded, 0);
        setTotalRewards({ totalGold, totalLives });
      }
      
    } catch (error) {
      if (isMountedRef.current) {
        logger.error('[DAILY-WINNERS] Exception:', error);
        setTopPlayers([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      // INSTANT visibility - no delay
      setContentVisible(true);
      fetchYesterdayTopPlayers();
      return () => {
        setContentVisible(false);
      };
    } else {
      setContentVisible(false);
    }
  }, [open, fetchYesterdayTopPlayers]);

  const handlePlayNow = useCallback(() => {
    onClose();
    navigate('/game');
  }, [onClose, navigate]);

  const handleAccept = useCallback(async () => {
    if (!userId) return;

    try {
      if (pendingReward) {
        await claimReward();
        toast.success(t('dailyWinners.claimSuccess') || 'Reward claimed successfully!');
      }
      onClose();
    } catch (error) {
      logger.error('[DAILY-WINNERS] Accept error:', error);
      toast.error(t('dailyWinners.claimError') || 'Failed to claim reward');
      onClose();
    }
  }, [userId, pendingReward, claimReward, onClose, t]);

  const rankFourToTen = useMemo(() => topPlayers.slice(3, 10), [topPlayers]);

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          overlayClassName="bg-black/25"
          className="overflow-visible p-0 border-0 bg-transparent w-screen h-screen max-w-none rounded-none [&>button[data-dialog-close]]:hidden z-[99999]"
          style={{ 
            margin: 0,
            maxHeight: '100dvh',
            minHeight: '100dvh',
            borderRadius: 0,
            zIndex: 99999
          }}
        >
          <DialogTitle className="sr-only">{t('dailyWinners.dialog_title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('dailyWinners.dialog_description')}</DialogDescription>

          <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ minHeight: '100dvh' }}>
            <div
              className="daily-winners-canvas"
              style={{
                width: BASE_WIDTH,
                height: BASE_HEIGHT,
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: contentVisible ? `scale(${scale})` : 'scale(0)',
                  opacity: contentVisible ? 1 : 0,
                  transition: 'transform 150ms ease-out, opacity 100ms ease-out',
                  transformOrigin: 'center center',
                  willChange: contentVisible ? 'transform, opacity' : 'auto'
                }}
              >
              {/* Close X button - Only when no data */}
              {topPlayers.length === 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className={`absolute text-white/70 hover:text-white font-bold z-[100] flex items-center justify-center bg-black/50 hover:bg-black/70 active:bg-black/80 rounded-full transition-all touch-manipulation ${contentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                  style={{ 
                    top: '60px',
                    right: '16px',
                    width: '56px',
                    height: '56px',
                    fontSize: '2.5rem',
                    minWidth: '56px',
                    minHeight: '56px',
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}

              {/* CARD WRAPPER */}
              <div 
                className="daily-winners-card relative"
                style={{ 
                  width: '100%',
                  height: '100%'
                }}
              >
              <HexShieldFrame showShine={true}>
                {/* RED BANNER - GENIUSES / JACKPOT */}
                <div 
                  ref={badgeRef}
                  className="relative z-20 mx-auto" 
                  style={{ 
                    width: '80%', 
                    maxWidth: '400px', 
                    transform: 'translateY(-75%)' 
                  }}
                >
                  <div className="absolute inset-0 translate-y-1 translate-x-1"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                         background: 'rgba(0,0,0,0.4)',
                         filter: 'blur(4px)',
                         zIndex: -1
                       }} />
                  
                  <div className="absolute inset-0"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                         background: 'linear-gradient(135deg, hsl(var(--dup-gold-700)), hsl(var(--dup-gold-600)) 50%, hsl(var(--dup-gold-800)))',
                         boxShadow: 'inset 0 0 0 2px hsl(var(--dup-gold-900)), 0 3px 8px rgba(0,0,0,0.175)'
                       }} />
                  
                  <div className="absolute inset-[3px]"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                         background: 'linear-gradient(180deg, hsl(var(--dup-gold-400)), hsl(var(--dup-gold-500)) 40%, hsl(var(--dup-gold-700)))',
                         boxShadow: 'inset 0 1px 0 hsl(var(--dup-gold-300))'
                       }} />
                  
                  <div className="relative px-[5vw] py-[1.2vh]"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                       }}>
                    <div className="absolute inset-[6px]"
                         style={{
                           clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                           background: 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(0 95% 75%) 0%, hsl(0 90% 65%) 30%, hsl(0 85% 55%) 60%, hsl(0 78% 48%) 100%)',
                           boxShadow: 'inset 0 6px 12px rgba(255,255,255,0.125), inset 0 -6px 12px rgba(0,0,0,0.2)'
                         }} />
                    
                    <div className="absolute inset-[6px] pointer-events-none"
                         style={{
                           clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                           background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 12px, transparent 12px, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 24px)',
                           opacity: 0.7
                         }} />
                    
                    <div className="absolute inset-[6px] pointer-events-none" style={{
                      clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                      background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5), transparent 60%)'
                    }} />
                    
                    <h1 className="relative z-10 font-black text-white text-center uppercase px-2"
                        style={{ 
                          fontSize: 'clamp(1.125rem, 4.5vw, 1.875rem)', 
                          letterSpacing: '0.05em',
                          fontWeight: 'bold',
                          WebkitTextStroke: '1.5px rgba(0,0,0,0.8)',
                          lineHeight: '1.2'
                        }}>
                      {t('dailyWinners.geniuses')}
                    </h1>
                    
                    {/* Jackpot info row */}
                    <div className="relative z-10 mt-2 flex items-center justify-center gap-1 text-white px-2"
                         style={{
                           fontSize: 'clamp(0.8rem, 3.3vw, 1.1rem)',
                           fontWeight: 700,
                           flexWrap: 'wrap'
                         }}>
                      <span style={{
                        color: '#ffd700',
                        WebkitTextStroke: '0.8px rgba(0,0,0,0.8)',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold'
                      }}>{t('dailyWinners.jackpot')}</span>
                      
                      {/* Gold coin */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span style={{
                          color: '#ffd700',
                          fontWeight: 'bold',
                          WebkitTextStroke: '0.6px rgba(0,0,0,0.9)',
                          fontSize: 'clamp(0.9rem, 3.7vw, 1.25rem)'
                        }}>
                          {totalRewards.totalGold.toLocaleString()}
                        </span>
                        
                        <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <radialGradient id={svgIds.coinGold} cx="35%" cy="35%">
                              <stop offset="0%" stopColor="#FFD700" />
                              <stop offset="40%" stopColor="#FFA500" />
                              <stop offset="70%" stopColor="#FF8C00" />
                              <stop offset="100%" stopColor="#DAA520" />
                            </radialGradient>
                            <radialGradient id={svgIds.coinInner} cx="40%" cy="40%">
                              <stop offset="0%" stopColor="#FFFACD" />
                              <stop offset="50%" stopColor="#FFD700" />
                              <stop offset="100%" stopColor="#B8860B" />
                            </radialGradient>
                            <filter id={svgIds.coinShadow}>
                              <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.6"/>
                            </filter>
                          </defs>
                          <circle cx="50" cy="50" r="48" fill={`url(#${svgIds.coinGold})`} filter={`url(#${svgIds.coinShadow})`} />
                          <circle cx="50" cy="50" r="40" fill={`url(#${svgIds.coinInner})`} />
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#DAA520" strokeWidth="2" opacity="0.6" />
                          <ellipse cx="38" cy="38" rx="15" ry="12" fill="#FFFACD" opacity="0.4" />
                        </svg>
                      </div>
                      
                      {/* Heart icon */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span style={{
                          color: '#ff6b6b',
                          fontWeight: 'bold',
                          WebkitTextStroke: '0.6px rgba(0,0,0,0.9)',
                          fontSize: 'clamp(0.9rem, 3.7vw, 1.25rem)'
                        }}>
                          {totalRewards.totalLives.toLocaleString()}
                        </span>
                        
                        <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <radialGradient id={svgIds.heartGradient} cx="35%" cy="35%">
                              <stop offset="0%" stopColor="#ff6b6b" />
                              <stop offset="40%" stopColor="#ee5a5a" />
                              <stop offset="70%" stopColor="#dc4848" />
                              <stop offset="100%" stopColor="#c92a2a" />
                            </radialGradient>
                            <radialGradient id={svgIds.heartHighlight} cx="30%" cy="30%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                            <filter id={svgIds.heartShadow}>
                              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.5"/>
                            </filter>
                          </defs>
                          <path d="M50 85 L20 55 C10 45 10 28 20 18 C30 8 45 8 50 18 C55 8 70 8 80 18 C90 28 90 45 80 55 Z" 
                                fill={`url(#${svgIds.heartGradient})`} stroke="#b71c1c" strokeWidth="2" filter={`url(#${svgIds.heartShadow})`} />
                          <ellipse cx="35" cy="30" rx="12" ry="10" fill={`url(#${svgIds.heartHighlight})`} opacity="0.7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTENT GRID AREA - Fixed layout hogy mindent precízen tartson */}
                <div 
                  className="relative z-10 flex flex-col items-center justify-between px-[4%] pb-[8%]" 
                  style={{ 
                    height: '100%',
                    paddingTop: '0%',
                    transform: 'translateY(-10%)'
                  }}
                >
                  {topPlayers.length === 0 ? (
                    /* EMPTY STATE */
                    <div className="flex flex-col items-center justify-center h-full">
                      <svg width="100" height="100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <radialGradient id="faceGradient" cx="35%" cy="35%">
                            <stop offset="0%" stopColor="#FFD54F" />
                            <stop offset="40%" stopColor="#FFB300" />
                            <stop offset="70%" stopColor="#FF8F00" />
                            <stop offset="100%" stopColor="#E65100" />
                          </radialGradient>
                          <radialGradient id="shadowGradient" cx="50%" cy="50%">
                            <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="eyeGradient" cx="30%" cy="30%">
                            <stop offset="0%" stopColor="#4A4A4A" />
                            <stop offset="100%" stopColor="#1A1A1A" />
                          </radialGradient>
                          <linearGradient id="mouthShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#8B4513" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#8B4513" stopOpacity="0" />
                          </linearGradient>
                          <radialGradient id="highlight" cx="30%" cy="30%">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <ellipse cx="60" cy="105" rx="35" ry="8" fill="url(#shadowGradient)" />
                        <circle cx="60" cy="60" r="48" fill="url(#faceGradient)" />
                        <circle cx="60" cy="60" r="48" fill="none" stroke="#E65100" strokeWidth="1.5" opacity="0.6" />
                        <ellipse cx="45" cy="40" rx="18" ry="14" fill="url(#highlight)" opacity="0.5" />
                        <ellipse cx="42" cy="50" rx="7" ry="8" fill="url(#eyeGradient)" />
                        <ellipse cx="44" cy="48" rx="2" ry="2.5" fill="#FFFFFF" opacity="0.6" />
                        <ellipse cx="78" cy="50" rx="7" ry="8" fill="url(#eyeGradient)" />
                        <ellipse cx="80" cy="48" rx="2" ry="2.5" fill="#FFFFFF" opacity="0.6" />
                        <path d="M 35 78 Q 60 68 85 78" stroke="#6D4C41" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.9" />
                        <path d="M 38 77 Q 60 69 82 77" stroke="url(#mouthShadow)" strokeWidth="3" strokeLinecap="round" fill="none" />
                        <ellipse cx="60" cy="90" rx="40" ry="12" fill="#E65100" opacity="0.2" />
                      </svg>
                      
                      <div className="space-y-2 mt-4 mb-6">
                        <p className="font-bold text-white text-center" style={{
                          fontSize: 'clamp(1.25rem, 5vw, 1.5625rem)',
                          WebkitTextStroke: '0.5px rgba(0,0,0,0.8)'
                        }}>
                          {t('dailyWinners.noWinnersFirstLine')}
                        </p>
                        <p className="font-bold text-white text-center" style={{
                          fontSize: 'clamp(1.25rem, 5vw, 1.5625rem)',
                          WebkitTextStroke: '0.5px rgba(0,0,0,0.8)'
                        }}>
                          {t('dailyWinners.noWinnersSecondLine')}
                        </p>
                      </div>

                      <div 
                        className="absolute bottom-0 left-0 right-0 flex justify-center pb-10"
                        style={{ zIndex: 30 }}
                      >
                        <HexAcceptButton 
                          onClick={handlePlayNow}
                          className="w-full max-w-[280px]"
                        >
                          {t('dailyWinners.playNowButton')}
                        </HexAcceptButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* TOP 3 WINNERS ROW - Silver(2nd) Gold(1st) Bronze(3rd) */}
                      <div 
                        className="flex justify-center items-end w-full px-2" 
                        style={{ 
                          gap: 'clamp(6px, 2vw, 12px)',
                          marginTop: 'clamp(8px, 2vh, 16px)'
                        }}
                      >
                        {/* 2ND PLACE - BRONZE - LEFT (was SILVER) */}
                        {topPlayers[2] && (
                          <div 
                            className="flex flex-col items-center" 
                            style={{ 
                              width: 'clamp(55px, 22vw, 90px)',
                              minWidth: 'clamp(50px, 20vw, 81px)',
                              minHeight: 'clamp(99px, 31.5vw, 144px)'
                            }}
                          >
                            <div
                              className="w-full flex flex-col items-center"
                              style={{
                                transform: 'scale(0.9)',
                                transformOrigin: 'center bottom'
                              }}
                            >
                              <div className="w-full">
                                <div className="relative w-full" style={{ aspectRatio: '744.09/1052.36' }}>
                                  <div 
                                    className="absolute inset-0"
                                    style={{
                                      backgroundImage: `url(${laurelWreathGold})`,
                                      backgroundSize: 'contain',
                                      backgroundPosition: 'center',
                                      backgroundRepeat: 'no-repeat',
                                      filter: 'grayscale(20%) brightness(0.95) contrast(1.15) hue-rotate(15deg) saturate(1.3)'
                                    }}
                                  />
                                  <div className="absolute" style={{ left: '19.5%', top: '18%', width: '63%', height: '45%' }}>
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'linear-gradient(135deg, #cd7f32 0%, #c87533 25%, #b87333 50%, #a0522d 75%, #8b4513 100%)',
                                        boxShadow: '0 6px 12px rgba(205,127,50,0.5), inset 0 2px 4px rgba(255,200,150,0.6), inset 0 -2px 4px rgba(0,0,0,0.4)'
                                      }} />
                                      <div className="absolute inset-[6px] rounded-full overflow-hidden">
                                        {topPlayers[2].avatar_url ? (
                                          <img 
                                            src={topPlayers[2].avatar_url} 
                                            alt={topPlayers[2].username}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-orange-700 font-bold bg-gray-800"
                                               style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                                            {topPlayers[2].username.substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute" style={{ left: '38%', bottom: '10%', width: '24%' }}>
                                    <div className="aspect-square rounded-full relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'radial-gradient(circle at 30% 30%, #cd7f32 0%, #c87533 30%, #b87333 60%, #a0522d 100%)',
                                        boxShadow: '0 4px 8px rgba(205,127,50,0.5)'
                                      }} />
                                      <div className="absolute inset-[3px] rounded-full" style={{
                                        background: 'linear-gradient(135deg, #d2a679 0%, #cd7f32 50%, #b87333 100%)',
                                        boxShadow: 'inset 0 2px 6px rgba(255,200,150,0.7), inset 0 -2px 6px rgba(0,0,0,0.4)'
                                      }} />
                                      <div className="absolute inset-[6px] rounded-full flex items-center justify-center" style={{
                                        background: 'radial-gradient(circle at 35% 35%, #daa06d 0%, #cd7f32 40%, #a0522d 100%)'
                                      }}>
                                        <span className="font-black" style={{ 
                                          fontSize: 'clamp(0.75rem, 3.5vw, 1.125rem)',
                                          background: 'linear-gradient(180deg, #fffacd 0%, #daa520 100%)',
                                          WebkitBackgroundClip: 'text',
                                          WebkitTextFillColor: 'transparent'
                                        }}>{topPlayers[2].rank}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-white font-bold text-center truncate w-full px-1 mt-1" style={{
                              fontSize: 'clamp(0.6rem, 2.8vw, 0.75rem)',
                              WebkitTextStroke: '0.5px rgba(0,0,0,0.8)'
                            }}>
                              {topPlayers[2].username}
                            </p>
                          </div>
                        )}

                        {/* 1ST PLACE - GOLD - MIDDLE (BIGGEST) */}
                        {topPlayers[0] && (
                          <div 
                            className="flex flex-col items-center" 
                            style={{ 
                              width: 'clamp(55px, 22vw, 90px)',
                              minWidth: 'clamp(55px, 22vw, 90px)',
                              minHeight: 'clamp(110px, 35vw, 160px)'
                            }}
                          >
                            <div
                              className="w-full flex flex-col items-center"
                              style={{
                                transform: 'scale(1.2) translateY(-20%)',
                                transformOrigin: 'center bottom'
                              }}
                            >
                              <div
                                className="w-full"
                                style={{ animation: 'pulse-scale 2.4s ease-in-out infinite' }}
                              >
                                <div className="relative w-full" style={{ aspectRatio: '744.09/1052.36' }}>
                                  <div 
                                    className="absolute inset-0"
                                    style={{
                                      backgroundImage: `url(${laurelWreathGold})`,
                                      backgroundSize: 'contain',
                                      backgroundPosition: 'center',
                                      backgroundRepeat: 'no-repeat'
                                    }}
                                  />
                                  <div className="absolute" style={{ left: '19.5%', top: '18%', width: '63%', height: '45%' }}>
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 25%, #ffb700 50%, #ff9500 75%, #ffd700 100%)',
                                        boxShadow: '0 8px 16px rgba(218,165,32,0.6), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(139,69,0,0.5)'
                                      }} />
                                      <div className="absolute inset-[6px] rounded-full overflow-hidden">
                                        {topPlayers[0].avatar_url ? (
                                          <img 
                                            src={topPlayers[0].avatar_url} 
                                            alt={topPlayers[0].username}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-yellow-400 font-bold bg-gray-800"
                                               style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
                                            {topPlayers[0].username.substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute" style={{ left: '38%', bottom: '10%', width: '24%' }}>
                                    <div className="aspect-square rounded-full relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'radial-gradient(circle at 30% 30%, #fffacd 0%, #ffd700 30%, #ffb700 60%, #d4af37 100%)',
                                        boxShadow: '0 6px 12px rgba(218,165,32,0.6)'
                                      }} />
                                      <div className="absolute inset-[3px] rounded-full" style={{
                                        background: 'linear-gradient(135deg, #fff9c4 0%, #ffd700 50%, #d4af37 100%)',
                                        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.9), inset 0 -2px 6px rgba(139,69,0,0.5)'
                                      }} />
                                      <div className="absolute inset-[6px] rounded-full flex items-center justify-center" style={{
                                        background: 'radial-gradient(circle at 35% 35%, #ffffe0 0%, #ffd700 40%, #daa520 100%)'
                                      }}>
                                        <span className="font-black" style={{ 
                                          fontSize: 'clamp(0.875rem, 4vw, 1.25rem)',
                                          background: 'linear-gradient(180deg, #8b4513 0%, #4a2511 100%)',
                                          WebkitBackgroundClip: 'text',
                                          WebkitTextFillColor: 'transparent'
                                        }}>{topPlayers[0].rank}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <p className="text-white font-bold text-center truncate w-full px-1 mt-1" style={{
                                fontSize: 'clamp(0.65rem, 3vw, 0.8rem)',
                                WebkitTextStroke: '0.5px rgba(0,0,0,0.8)'
                              }}>
                                {topPlayers[0].username}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 3RD PLACE - SILVER - RIGHT (was BRONZE) */}
                        {topPlayers[1] && (
                          <div 
                            className="flex flex-col items-center" 
                            style={{ 
                              width: 'clamp(55px, 22vw, 90px)',
                              minWidth: 'clamp(50px, 20vw, 81px)',
                              minHeight: 'clamp(99px, 31.5vw, 144px)'
                            }}
                          >
                            <div
                              className="w-full flex flex-col items-center"
                              style={{
                                transform: 'scale(0.9)',
                                transformOrigin: 'center bottom'
                              }}
                            >
                              <div className="w-full">
                                <div className="relative w-full" style={{ aspectRatio: '744.09/1052.36' }}>
                                  <div 
                                    className="absolute inset-0"
                                    style={{
                                      backgroundImage: `url(${laurelWreathGold})`,
                                      backgroundSize: 'contain',
                                      backgroundPosition: 'center',
                                      backgroundRepeat: 'no-repeat',
                                      filter: 'grayscale(100%) brightness(1.1) contrast(1.1) saturate(0)'
                                    }}
                                  />
                                  <div className="absolute" style={{ left: '19.5%', top: '18%', width: '63%', height: '45%' }}>
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 25%, #909090 50%, #808080 75%, #707070 100%)',
                                        boxShadow: '0 6px 12px rgba(192,192,192,0.5), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.4)'
                                      }} />
                                      <div className="absolute inset-[6px] rounded-full overflow-hidden">
                                        {topPlayers[1].avatar_url ? (
                                          <img 
                                            src={topPlayers[1].avatar_url} 
                                            alt={topPlayers[1].username}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-800"
                                               style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                                            {topPlayers[1].username.substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute" style={{ left: '38%', bottom: '10%', width: '24%' }}>
                                    <div className="aspect-square rounded-full relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'radial-gradient(circle at 30% 30%, #c0c0c0 0%, #a8a8a8 30%, #909090 60%, #808080 100%)',
                                        boxShadow: '0 4px 8px rgba(192,192,192,0.5)'
                                      }} />
                                      <div className="absolute inset-[3px] rounded-full" style={{
                                        background: 'linear-gradient(135deg, #d8d8d8 0%, #c0c0c0 50%, #909090 100%)',
                                        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.7), inset 0 -2px 6px rgba(0,0,0,0.4)'
                                      }} />
                                      <div className="absolute inset-[6px] rounded-full flex items-center justify-center" style={{
                                        background: 'radial-gradient(circle at 35% 35%, #d8d8d8 0%, #c0c0c0 40%, #808080 100%)'
                                      }}>
                                        <span className="font-black" style={{ 
                                          fontSize: 'clamp(0.75rem, 3.5vw, 1.125rem)',
                                          background: 'linear-gradient(180deg, #333333 0%, #000000 100%)',
                                          WebkitBackgroundClip: 'text',
                                          WebkitTextFillColor: 'transparent'
                                        }}>{topPlayers[1].rank}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-white font-bold text-center truncate w-full px-1 mt-1" style={{
                              fontSize: 'clamp(0.6rem, 2.8vw, 0.75rem)',
                              WebkitTextStroke: '0.5px rgba(0,0,0,0.8)'
                            }}>
                              {topPlayers[1].username}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* RANKS 4-10 - TWO ROWS */}
                      <div className="w-full px-2" style={{ marginTop: 'clamp(12px, 3vh, 20px)' }}>
                        {/* FIRST ROW: 4-7 (4 circles) */}
                        <div 
                          className="grid grid-cols-4 w-full" 
                          style={{ 
                            gap: 'clamp(6px, 2vw, 14px)',
                            marginBottom: 'clamp(8px, 2vh, 14px)'
                          }}
                        >
                          {rankFourToTen.slice(0, 4).map((player) => (
                            <div key={player.user_id} className="flex flex-col items-center w-full">
                              <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                  <div className="absolute inset-0 rounded-full" style={{
                                    background: 'linear-gradient(135deg, hsl(225, 73%, 70%) 0%, hsl(220, 80%, 70%) 25%, hsl(225, 73%, 57%) 50%, hsl(225, 73%, 47%) 75%, hsl(225, 73%, 70%) 100%)',
                                    boxShadow: '0 4px 8px rgba(65, 105, 225, 0.5), inset 0 1px 2px rgba(135, 206, 250, 0.6)'
                                  }} />
                                  <div className="absolute rounded-full overflow-hidden" style={{ inset: '6%' }}>
                                    {player.avatar_url ? (
                                      <img 
                                        src={player.avatar_url} 
                                        alt={player.username}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div 
                                        className="w-full h-full flex items-center justify-center font-bold bg-gray-800"
                                        style={{ 
                                          color: 'hsl(225, 73%, 70%)',
                                          fontSize: 'clamp(0.75rem, 3.5vw, 1rem)'
                                        }}
                                      >
                                        {player.username.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Rank badge */}
                                <div className="absolute" style={{ left: '35%', bottom: '5%', width: '30%' }}>
                                  <div className="aspect-square rounded-full relative">
                                    <div className="absolute inset-0 rounded-full" style={{
                                      background: 'radial-gradient(circle at 30% 30%, #b3d1ff 0%, #4169e1 30%, #2e5cb8 60%, #1e3a8a 100%)',
                                      boxShadow: '0 3px 6px rgba(65,105,225,0.5)'
                                    }} />
                                    <div className="absolute inset-[2px] rounded-full flex items-center justify-center" style={{
                                      background: 'radial-gradient(circle at 35% 35%, #dae8ff 0%, #4169e1 40%, #2e5cb8 100%)'
                                    }}>
                                      <span className="font-black" style={{ 
                                        fontSize: 'clamp(0.625rem, 2.8vw, 0.875rem)',
                                        color: '#f0f9ff'
                                      }}>
                                        {player.rank}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-white font-bold text-center truncate w-full px-0.5 mt-1" style={{
                                fontSize: 'clamp(0.55rem, 2.5vw, 0.7rem)',
                                WebkitTextStroke: '0.3px rgba(0,0,0,0.8)'
                              }}>
                                {player.username}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* SECOND ROW: 8-10 (3 circles CENTERED) - same size as first row */}
                        {rankFourToTen.slice(4, 7).length > 0 && (
                          <div 
                            className="flex justify-center w-full" 
                            style={{ 
                              gap: 'clamp(6px, 2vw, 14px)'
                            }}
                          >
                            {rankFourToTen.slice(4, 7).map((player) => (
                              <div 
                                key={player.user_id} 
                                className="flex flex-col items-center"
                                style={{ 
                                  width: 'calc((100% - 3 * clamp(6px, 2vw, 14px)) / 4)' // Same width as first row items
                                }}
                              >
                                <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                    <div className="absolute inset-0 rounded-full" style={{
                                      background: 'linear-gradient(135deg, hsl(225, 73%, 70%) 0%, hsl(220, 80%, 70%) 25%, hsl(225, 73%, 57%) 50%, hsl(225, 73%, 47%) 75%, hsl(225, 73%, 70%) 100%)',
                                      boxShadow: '0 4px 8px rgba(65, 105, 225, 0.5), inset 0 1px 2px rgba(135, 206, 250, 0.6)'
                                    }} />
                                    <div className="absolute rounded-full overflow-hidden bg-gray-800" style={{ inset: '6%' }}>
                                      {player.avatar_url ? (
                                        <img 
                                          src={player.avatar_url} 
                                          alt={player.username}
                                          className="w-full h-full object-cover"
                                          style={{ transform: 'scale(1.15)' }}
                                        />
                                      ) : (
                                        <div 
                                          className="w-full h-full flex items-center justify-center font-bold bg-gray-800"
                                          style={{ 
                                            color: 'hsl(225, 73%, 70%)',
                                            fontSize: 'clamp(0.75rem, 3.5vw, 1rem)'
                                          }}
                                        >
                                          {player.username.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Rank badge */}
                                  <div className="absolute" style={{ left: '35%', bottom: '5%', width: '30%' }}>
                                    <div className="aspect-square rounded-full relative">
                                      <div className="absolute inset-0 rounded-full" style={{
                                        background: 'radial-gradient(circle at 30% 30%, #b3d1ff 0%, #4169e1 30%, #2e5cb8 60%, #1e3a8a 100%)',
                                        boxShadow: '0 3px 6px rgba(65,105,225,0.5)'
                                      }} />
                                      <div className="absolute inset-[2px] rounded-full flex items-center justify-center" style={{
                                        background: 'radial-gradient(circle at 35% 35%, #dae8ff 0%, #4169e1 40%, #2e5cb8 100%)'
                                      }}>
                                        <span className="font-black" style={{ 
                                          fontSize: 'clamp(0.625rem, 2.8vw, 0.875rem)',
                                          color: '#f0f9ff'
                                        }}>
                                          {player.rank}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-white font-bold text-center truncate w-full px-0.5 mt-1" style={{
                                  fontSize: 'clamp(0.55rem, 2.5vw, 0.7rem)',
                                  WebkitTextStroke: '0.3px rgba(0,0,0,0.8)'
                                }}>
                                  {player.username}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </>
                  )}
                </div>
              </HexShieldFrame>
              
              {/* CONGRATULATIONS BUTTON - Fixed at shield bottom, OUTSIDE HexShieldFrame */}
              <div 
                className="absolute left-1/2 flex justify-center"
                style={{ 
                  bottom: '8%', // Position at shield's bottom area
                  transform: 'translateX(-50%)',
                  zIndex: 50,
                  width: '80%',
                  maxWidth: '280px'
                }}
              >
                <HexAcceptButton 
                  onClick={handleAccept}
                  className="w-full"
                  disabled={isClaiming}
                >
                  <span className="font-bold leading-tight flex items-center justify-center w-full" style={{ fontSize: 'clamp(0.875rem, 3.5vw, 1.125rem)' }}>
                    {pendingReward 
                      ? t('dailyWinners.claimReward')
                      : t('dailyWinners.congratulate')
                    }
                  </span>
                </HexAcceptButton>
              </div>
              </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailyWinnersDialog;
