import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { trackBonusEvent, trackFeatureUsage } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import HexShieldFrame from './frames/HexShieldFrame';
import { useI18n } from '@/i18n';

interface WelcomeBonusDialogProps {
  open: boolean;
  onClaim: () => Promise<boolean>;
  onLater: () => void;
  claiming: boolean;
}

export const WelcomeBonusDialog = ({ open, onClaim, onLater, claiming }: WelcomeBonusDialogProps) => {
  const { t } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [contentVisible, setContentVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const starCount = isMobile ? 60 : 160;

  useEffect(() => {
    const handleResize = () => {
      try {
        setIsMobile(window.innerWidth <= 768);
      } catch {}
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open && userId) {
      trackBonusEvent(userId, 'welcome_shown', 'welcome', {
        coins_amount: 2500,
        lives_amount: 50
      });
    }
  }, [open, userId]);

  useEffect(() => {
    if (open) {
      // INSTANT - no delay
      setContentVisible(true);
      return () => {
        setContentVisible(false);
      };
    } else {
      setContentVisible(false);
    }
  }, [open]);

  const handleClaim = async () => {
    if (!userId) return;
    
    // Track feature usage - claim attempt
    await trackFeatureUsage(userId, 'user_action', 'welcome_bonus', 'claim_attempt', {
      coins_amount: 2500,
      lives_amount: 50
    });
    
    const success = await onClaim();
    if (success && userId) {
      // Track feature usage - successful claim
      await trackFeatureUsage(userId, 'user_action', 'welcome_bonus', 'claim_success', {
        coins_amount: 2500,
        lives_amount: 50
      });
      
      trackBonusEvent(userId, 'welcome_claimed', 'welcome', {
        coins_amount: 2500,
        lives_amount: 50
      });
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        overlayClassName="bg-transparent backdrop-blur-none"
        className="overflow-hidden p-0 border-0 bg-transparent w-screen h-screen max-w-none rounded-none [&>button[data-dialog-close]]:hidden z-[99999]"
        style={{ 
          margin: 0,
          maxHeight: '100dvh',
          minHeight: '100dvh',
          borderRadius: 0,
          zIndex: 99999
        }}
      >
        <div 
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{ 
            minHeight: '100dvh', 
            minWidth: '100vw',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {/* Teljesen átlátszó háttér - NULLA sötétítés, NULLA homályosítás */}

          {/* Animated golden stars + konfetti */}
          {contentVisible && (
            <>
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(starCount)].map((_, i) => {
                  const delay = Math.random() * 3;
                  const duration = 1.5 + Math.random() * 1;
                  const startX = Math.random() * 100;
                  const startY = Math.random() * 100;
                  const moveX = (Math.random() - 0.5) * 20;
                  const moveY = (Math.random() - 0.5) * 20;
                  
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${startX}%`,
                        top: `${startY}%`,
                        animation: `starFade${i} ${duration}s ease-in-out ${delay}s infinite`,
                        zIndex: 3
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#fbbf24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <style>{`
                        @keyframes starFade${i} {
                          0%, 100% { 
                            transform: translate(0, 0) scale(0);
                            opacity: 0;
                          }
                          50% { 
                            transform: translate(${moveX}px, ${moveY}px) scale(1.5);
                            opacity: 1;
                          }
                        }
                      `}</style>
                    </div>
                  );
                })}
              </div>

            </>
          )}

          {/* BONUS MODAL WRAPPER - Fix arányú, skálázódó layout */}
          <div 
            className="relative z-10"
            style={{ 
              width: 'min(420px, 90vw)',
              aspectRatio: '9 / 16',
              transform: contentVisible ? 'scale(1)' : 'scale(0.8)',
              opacity: contentVisible ? 1 : 0,
              transition: 'transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 60ms ease-out',
              transformOrigin: 'center center',
              willChange: 'transform, opacity',
            }}
          >
            {/* BONUS MODAL CARD - Teljes belső tartalom */}
            <div 
              className="absolute inset-0"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Pulzáló arany fénysugár háttér */}
              <div 
                className="absolute -inset-12"
                style={{
                  background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(250,204,21,0.4) 0%, rgba(234,179,8,0.2) 40%, transparent 70%)',
                  filter: 'blur(40px)',
                  animation: 'welcomeShieldGlow 2s ease-in-out infinite',
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              ></div>
              <style>{`
                @keyframes welcomeShieldGlow {
                  0%, 100% { 
                    filter: blur(40px) brightness(1);
                    opacity: 0.6;
                  }
                  50% { 
                    filter: blur(50px) brightness(1.3);
                    opacity: 1;
                  }
                }
              `}</style>

              <HexShieldFrame showShine={true}>
              {/* Premium WELCOME badge - ARANY 3D */}
              <div 
                className="relative -mt-12 mb-4 mx-auto z-20" 
                style={{ width: '80%' }}
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
                       boxShadow: 'inset 0 0 0 2px hsl(var(--dup-gold-900)), 0 6px 16px rgba(0,0,0,0.35)'
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
                         background: 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(48 100% 85%) 0%, hsl(45 95% 70%) 30%, hsl(42 90% 58%) 60%, hsl(38 85% 45%) 100%)',
                         boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.25), inset 0 -12px 24px rgba(0,0,0,0.4)'
                       }} />
                  
                  <div className="absolute inset-[6px] pointer-events-none"
                       style={{
                         clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                         background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 12px, transparent 12px, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 24px)',
                         opacity: 0.7
                       }} />
                  
                  <div className="absolute inset-[6px] pointer-events-none" style={{
                    clipPath: 'path("M 12% 0 L 88% 0 L 100% 50% L 88% 100% L 12% 100% L 0 50% Z")',
                    background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.6), transparent 60%)'
                  }} />
                  
                  <h1 className="relative z-10 font-black text-white text-center drop-shadow-[0_0_18px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.9)]"
                      style={{ 
                        fontSize: 'clamp(1.25rem, 5.2cqw, 2.1rem)', 
                        letterSpacing: '0.05em',
                        textShadow: '0 0 12px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.9)'
                      }}>
                    {t('welcome.title')}
                  </h1>
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-between flex-1 px-[8%] pb-[8%] pt-[2%]">
                
                {/* MARKETING banner - 10% szélesebb, magasabb minőségű 3D crystal effect */}
                <div className="relative mb-2 flex items-center justify-center" style={{ width: '110%', maxWidth: '110%' }}>
                  {/* Árnyék réteg - mély 3D */}
                  <div className="absolute inset-0 translate-y-2 translate-x-2 rounded-full"
                       style={{
                         background: 'rgba(0,0,0,0.5)',
                         filter: 'blur(8px)',
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }} />
                  
                  {/* Külső arany keret - box-shadow módszer */}
                  <div className="absolute inset-0 rounded-full"
                       style={{ 
                         boxShadow: '0 0 0 2px #d97706, 0 0 0 4px #b45309, 0 12px 24px rgba(220,38,38,0.6)',
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }} />
                  
                  {/* Fő gradiens réteg */}
                  <div className="absolute inset-[2px] rounded-full"
                       style={{ 
                         background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #dc2626 100%)',
                         boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }} />
                  
                  {/* Belső fény réteg */}
                  <div className="absolute inset-[4px] rounded-full"
                       style={{ 
                         background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)',
                         boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.4), inset 0 -4px 12px rgba(0,0,0,0.4)',
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }} />
                  
                  {/* Kristály rácsminta */}
                  <div className="absolute inset-[4px] rounded-full pointer-events-none"
                       style={{
                         background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.12) 10px, rgba(255,255,255,0.12) 15px, transparent 15px, transparent 25px, rgba(255,255,255,0.08) 25px, rgba(255,255,255,0.08) 30px)',
                         opacity: 0.8,
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }} />
                  
                  {/* Fénysugár hatás */}
                  <div className="absolute inset-[4px] rounded-full pointer-events-none"
                       style={{
                         background: 'radial-gradient(ellipse 100% 60% at 35% 10%, rgba(255,255,255,0.7), transparent 65%)',
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }} />
                  
                  <div className="rounded-full flex items-center justify-center"
                       style={{ 
                         padding: 'clamp(0.375rem, 1.5vh, 0.5rem) clamp(1.5rem, 4vw, 2rem)',
                         gap: 'clamp(0.375rem, 1vw, 0.5rem)',
                         transform: 'perspective(600px) rotateX(4deg)',
                         animation: 'offerPulse 1.5s ease-in-out infinite'
                       }}>
                     <svg viewBox="0 0 24 24" className="flex-shrink-0" fill="#fbbf24" style={{ width: 'clamp(14px, 3vw, 16px)', height: 'clamp(14px, 3vw, 16px)' }}>
                       <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                     </svg>
                     <p className="text-white font-black text-center tracking-wider"
                        style={{ 
                          fontSize: 'clamp(0.75rem, 3.5cqw, 1.1rem)',
                          textShadow: '0 3px 8px rgba(0,0,0,0.95), 0 0 16px rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.8)',
                          whiteSpace: 'nowrap'
                        }}>
                        {t('welcome.special_offer')}
                      </p>
                     <svg viewBox="0 0 24 24" className="flex-shrink-0" fill="#fbbf24" style={{ width: 'clamp(14px, 3vw, 16px)', height: 'clamp(14px, 3vw, 16px)' }}>
                       <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                     </svg>
                   </div>
                  <style>{`
                    @keyframes offerPulse {
                      0%, 100% { 
                        transform: perspective(600px) rotateX(4deg) scale(1);
                        filter: brightness(1) drop-shadow(0 0 12px rgba(220,38,38,0.6));
                      }
                      50% { 
                        transform: perspective(600px) rotateX(4deg) scale(1.06);
                        filter: brightness(1.25) drop-shadow(0 0 20px rgba(220,38,38,0.9));
                      }
                    }
                  `}</style>
                </div>

                {/* Subtitle with reszponzív professzionális 3D gift boxes */}
                <div className="flex items-center justify-center w-full" style={{ gap: 'clamp(0.5rem, 2vw, 0.75rem)', marginBottom: 'clamp(0.75rem, 2vh, 1rem)', padding: '0 clamp(0.75rem, 3vw, 1rem)' }}>
                  {/* Left 3D Gift Box SVG - reszponzív, professzionális 3D */}
                  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" className="drop-shadow-[0_8px_16px_rgba(255,215,0,0.5)] flex-shrink-0" style={{ maxWidth: 'clamp(48px, 15vw, 80px)', maxHeight: 'clamp(48px, 15vw, 80px)' }}>
                    <defs>
                      <linearGradient id="giftBoxGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFD700" />
                        <stop offset="25%" stopColor="#FFC700" />
                        <stop offset="50%" stopColor="#FFA500" />
                        <stop offset="75%" stopColor="#FF8C00" />
                        <stop offset="100%" stopColor="#FFD700" />
                      </linearGradient>
                      <linearGradient id="giftBoxInner1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="50%" stopColor="rgba(255,215,0,0.2)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                      </linearGradient>
                      <linearGradient id="ribbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="50%" stopColor="#DC2626" />
                        <stop offset="100%" stopColor="#991B1B" />
                      </linearGradient>
                      <filter id="giftShadow1">
                        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.4"/>
                      </filter>
                    </defs>
                    {/* Ajándékdoboz test - mély 3D hatás */}
                    <rect x="15" y="40" width="70" height="50" rx="3" fill="url(#giftBoxGrad1)" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" filter="url(#giftShadow1)"/>
                    {/* Belső fény */}
                    <rect x="16" y="41" width="68" height="6" rx="2" fill="url(#giftBoxInner1)"/>
                    {/* Függőleges szalag */}
                    <rect x="47" y="40" width="6" height="50" fill="url(#ribbonGrad1)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <rect x="48" y="40" width="4" height="50" fill="rgba(255,255,255,0.2)" opacity="0.6"/>
                    {/* Vízszintes szalag */}
                    <rect x="15" y="57" width="70" height="8" fill="url(#ribbonGrad1)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <rect x="15" y="58" width="70" height="3" fill="rgba(255,255,255,0.2)" opacity="0.6"/>
                    {/* Masni - 3D */}
                    <ellipse cx="35" cy="33" rx="7" ry="6" fill="url(#ribbonGrad1)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <ellipse cx="36" cy="32" rx="3" ry="2.5" fill="rgba(255,255,255,0.4)"/>
                    <ellipse cx="65" cy="33" rx="7" ry="6" fill="url(#ribbonGrad1)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <ellipse cx="66" cy="32" rx="3" ry="2.5" fill="rgba(255,255,255,0.4)"/>
                    <circle cx="50" cy="30" r="5" fill="url(#ribbonGrad1)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <circle cx="51" cy="29" r="2" fill="rgba(255,255,255,0.5)"/>
                  </svg>
                  
                  <p className="text-center text-yellow-200 font-black shadow-[0_6px_12px_rgba(255,215,0,0.4),inset_0_2px_6px_rgba(255,255,255,0.25),inset_0_-2px_6px_rgba(0,0,0,0.25)]"
                     style={{
                       fontSize: 'clamp(1rem, 4.8cqw, 1.4rem)',
                       textShadow: '0 5px 10px rgba(0,0,0,0.85), 0 3px 6px rgba(0,0,0,0.7), 0 0 20px rgba(255,215,0,0.3)',
                       background: 'linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(255,215,0,0.28) 50%, rgba(255,215,0,0.18) 100%)',
                       transform: 'perspective(400px) rotateX(3deg)',
                       padding: '8px 14px',
                       borderRadius: '10px',
                       border: '2px solid rgba(255,215,0,0.3)',
                       borderTop: '2px solid rgba(255,255,255,0.25)',
                       borderBottom: '2px solid rgba(0,0,0,0.25)',
                       boxShadow: '0 6px 12px rgba(255,215,0,0.4), inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -2px 6px rgba(0,0,0,0.25)'
                     }}>
                    {t('welcome.gift_for_you')}
                  </p>
                  
                  {/* Right 3D Gift Box SVG - reszponzív, professzionális 3D */}
                  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" className="drop-shadow-[0_8px_16px_rgba(255,215,0,0.5)] flex-shrink-0" style={{ maxWidth: '15vw', maxHeight: '15vw' }}>
                    <defs>
                      <linearGradient id="giftBoxGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFD700" />
                        <stop offset="25%" stopColor="#FFC700" />
                        <stop offset="50%" stopColor="#FFA500" />
                        <stop offset="75%" stopColor="#FF8C00" />
                        <stop offset="100%" stopColor="#FFD700" />
                      </linearGradient>
                      <linearGradient id="giftBoxInner2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="50%" stopColor="rgba(255,215,0,0.2)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                      </linearGradient>
                      <linearGradient id="ribbonGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="50%" stopColor="#DC2626" />
                        <stop offset="100%" stopColor="#991B1B" />
                      </linearGradient>
                      <filter id="giftShadow2">
                        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.4"/>
                      </filter>
                    </defs>
                    <rect x="15" y="40" width="70" height="50" rx="3" fill="url(#giftBoxGrad2)" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" filter="url(#giftShadow2)"/>
                    <rect x="16" y="41" width="68" height="6" rx="2" fill="url(#giftBoxInner2)"/>
                    <rect x="47" y="40" width="6" height="50" fill="url(#ribbonGrad2)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <rect x="48" y="40" width="4" height="50" fill="rgba(255,255,255,0.2)" opacity="0.6"/>
                    <rect x="15" y="57" width="70" height="8" fill="url(#ribbonGrad2)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <rect x="15" y="58" width="70" height="3" fill="rgba(255,255,255,0.2)" opacity="0.6"/>
                    <ellipse cx="35" cy="33" rx="7" ry="6" fill="url(#ribbonGrad2)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <ellipse cx="36" cy="32" rx="3" ry="2.5" fill="rgba(255,255,255,0.4)"/>
                    <ellipse cx="65" cy="33" rx="7" ry="6" fill="url(#ribbonGrad2)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <ellipse cx="66" cy="32" rx="3" ry="2.5" fill="rgba(255,255,255,0.4)"/>
                    <circle cx="50" cy="30" r="5" fill="url(#ribbonGrad2)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
                    <circle cx="51" cy="29" r="2" fill="rgba(255,255,255,0.5)"/>
                  </svg>
                </div>

                {/* Rewards - Magas minőségű 3D érmék + szívek (pajzs minőség) */}
                <div className="w-full max-w-[85%] space-y-3 mb-4">
                  {/* Coins - Professzionális 3D */}
                  <div className="relative">
                    <div className="absolute inset-0 translate-y-2 translate-x-2 bg-black/50 rounded-2xl blur-md" />
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 rounded-2xl" 
                         style={{ boxShadow: 'inset 0 0 0 3px #b45309, 0 12px 24px rgba(0,0,0,0.45)' }} />
                    <div className="absolute inset-[3px] bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 rounded-2xl"
                         style={{ boxShadow: 'inset 0 2px 0 #fef3c7, inset 0 -2px 8px rgba(0,0,0,0.3)' }} />
                    
                    <div className="relative bg-gradient-to-br from-yellow-500/95 via-yellow-600/95 to-orange-600/95 rounded-2xl px-6 py-3 overflow-visible"
                         style={{ boxShadow: 'inset 0 16px 32px rgba(255,255,255,0.25), inset 0 -16px 32px rgba(0,0,0,0.35)' }}>
                      <div className="absolute inset-[6px] rounded-2xl pointer-events-none"
                           style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5), transparent 65%)' }} />
                      
                      <div className="absolute inset-[6px] rounded-2xl pointer-events-none"
                           style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.10) 10px, rgba(255,255,255,0.10) 15px)' }} />
                      
                      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
                           style={{ width: 'clamp(40px, 11cqw, 60px)', height: 'clamp(40px, 11cqw, 60px)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" style={{ animation: 'coinPulse 1.5s ease-in-out infinite' }}>
                          <defs>
                            <radialGradient id="coinGoldL" cx="35%" cy="30%">
                              <stop offset="0%" stopColor="#fff9cc" />
                              <stop offset="20%" stopColor="#ffe066" />
                              <stop offset="50%" stopColor="#ffd700" />
                              <stop offset="80%" stopColor="#d4af37" />
                              <stop offset="100%" stopColor="#a67c00" />
                            </radialGradient>
                            <radialGradient id="coinInnerL" cx="50%" cy="50%">
                              <stop offset="0%" stopColor="#ffeaa7" />
                              <stop offset="50%" stopColor="#f9ca24" />
                              <stop offset="100%" stopColor="#d4af37" />
                            </radialGradient>
                            <filter id="coinShadowL">
                              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.6"/>
                            </filter>
                          </defs>
                          <circle cx="50" cy="50" r="45" fill="url(#coinGoldL)" stroke="#8b6914" strokeWidth="3" filter="url(#coinShadowL)" />
                          <circle cx="50" cy="50" r="35" fill="url(#coinInnerL)" stroke="#d4af37" strokeWidth="2" opacity="0.9" />
                          <circle cx="50" cy="50" r="28" fill="none" stroke="#ffd700" strokeWidth="1.5" opacity="0.7" />
                          <ellipse cx="38" cy="33" rx="14" ry="10" fill="rgba(255,255,255,0.5)" opacity="0.8" />
                        </svg>
                      </div>

                      <div className="relative flex items-center justify-center">
                        <span className="font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)]" 
                              style={{ fontSize: 'clamp(1.75rem, 8.5cqw, 3rem)', lineHeight: 1, textShadow: '0 0 24px rgba(255,255,255,0.6), 0 3px 6px rgba(0,0,0,0.9)' }}>
                          +2,500
                        </span>
                      </div>

                      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2"
                           style={{ width: 'clamp(40px, 11cqw, 60px)', height: 'clamp(40px, 11cqw, 60px)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" style={{ animation: 'coinPulse 1.5s ease-in-out infinite 0.3s' }}>
                          <defs>
                            <radialGradient id="coinGoldR" cx="35%" cy="30%">
                              <stop offset="0%" stopColor="#fff9cc" />
                              <stop offset="20%" stopColor="#ffe066" />
                              <stop offset="50%" stopColor="#ffd700" />
                              <stop offset="80%" stopColor="#d4af37" />
                              <stop offset="100%" stopColor="#a67c00" />
                            </radialGradient>
                            <radialGradient id="coinInnerR" cx="50%" cy="50%">
                              <stop offset="0%" stopColor="#ffeaa7" />
                              <stop offset="50%" stopColor="#f9ca24" />
                              <stop offset="100%" stopColor="#d4af37" />
                            </radialGradient>
                            <filter id="coinShadowR">
                              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.6"/>
                            </filter>
                          </defs>
                          <circle cx="50" cy="50" r="45" fill="url(#coinGoldR)" stroke="#8b6914" strokeWidth="3" filter="url(#coinShadowR)" />
                          <circle cx="50" cy="50" r="35" fill="url(#coinInnerR)" stroke="#d4af37" strokeWidth="2" opacity="0.9" />
                          <circle cx="50" cy="50" r="28" fill="none" stroke="#ffd700" strokeWidth="1.5" opacity="0.7" />
                          <ellipse cx="38" cy="33" rx="14" ry="10" fill="rgba(255,255,255,0.5)" opacity="0.8" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Lives - Professzionális 3D szívek (pajzs minőség) */}
                  <div className="relative">
                    <div className="absolute inset-0 translate-y-2 translate-x-2 bg-black/50 rounded-2xl blur-md" />
                    <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-600 to-red-800 rounded-2xl"
                         style={{ boxShadow: 'inset 0 0 0 3px #7f1d1d, 0 12px 24px rgba(0,0,0,0.45)' }} />
                    <div className="absolute inset-[3px] bg-gradient-to-b from-red-400 via-red-500 to-red-700 rounded-2xl"
                         style={{ boxShadow: 'inset 0 2px 0 #fca5a5, inset 0 -2px 8px rgba(0,0,0,0.3)' }} />
                    
                    <div className="relative bg-gradient-to-br from-red-600/95 via-red-700/95 to-red-900/95 rounded-2xl px-6 py-3 overflow-visible"
                         style={{ boxShadow: 'inset 0 16px 32px rgba(255,255,255,0.25), inset 0 -16px 32px rgba(0,0,0,0.35)' }}>
                      <div className="absolute inset-[6px] rounded-2xl pointer-events-none"
                           style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5), transparent 65%)' }} />
                      
                      <div className="absolute inset-[6px] rounded-2xl pointer-events-none"
                           style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.10) 10px, rgba(255,255,255,0.10) 15px)' }} />
                      
                      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
                           style={{ width: 'clamp(40px, 11cqw, 60px)', height: 'clamp(40px, 11cqw, 60px)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" style={{ animation: 'heartPulse 1.5s ease-in-out infinite' }}>
                          <defs>
                            <linearGradient id="heartGrad3DL" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ff6b6b" />
                              <stop offset="30%" stopColor="#ff5252" />
                              <stop offset="60%" stopColor="#ff1744" />
                              <stop offset="100%" stopColor="#c41c00" />
                            </linearGradient>
                            <radialGradient id="heartHighL" cx="30%" cy="25%">
                              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                              <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                            <filter id="heartShadL">
                              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.6"/>
                            </filter>
                          </defs>
                          <path d="M50 85 L20 55 C10 45 10 28 20 18 C30 8 45 8 50 18 C55 8 70 8 80 18 C90 28 90 45 80 55 Z" 
                                fill="url(#heartGrad3DL)" stroke="#b71c1c" strokeWidth="2.5" filter="url(#heartShadL)" />
                          <ellipse cx="35" cy="30" rx="14" ry="12" fill="url(#heartHighL)" opacity="0.8" />
                        </svg>
                      </div>

                      <div className="relative flex items-center justify-center">
                        <span className="font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)]" 
                              style={{ fontSize: 'clamp(1.75rem, 8.5cqw, 3rem)', lineHeight: 1, textShadow: '0 0 24px rgba(255,255,255,0.6), 0 3px 6px rgba(0,0,0,0.9)' }}>
                          +50
                        </span>
                      </div>

                      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2"
                           style={{ width: 'clamp(40px, 11cqw, 60px)', height: 'clamp(40px, 11cqw, 60px)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" style={{ animation: 'heartPulse 1.5s ease-in-out infinite 0.3s' }}>
                          <defs>
                            <linearGradient id="heartGrad3DR" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ff6b6b" />
                              <stop offset="30%" stopColor="#ff5252" />
                              <stop offset="60%" stopColor="#ff1744" />
                              <stop offset="100%" stopColor="#c41c00" />
                            </linearGradient>
                            <radialGradient id="heartHighR" cx="30%" cy="25%">
                              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                              <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>
                            <filter id="heartShadR">
                              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.6"/>
                            </filter>
                          </defs>
                          <path d="M50 85 L20 55 C10 45 10 28 20 18 C30 8 45 8 50 18 C55 8 70 8 80 18 C90 28 90 45 80 55 Z" 
                                fill="url(#heartGrad3DR)" stroke="#b71c1c" strokeWidth="2.5" filter="url(#heartShadR)" />
                          <ellipse cx="35" cy="30" rx="14" ry="12" fill="url(#heartHighR)" opacity="0.8" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <style>{`
                  @keyframes coinPulse {
                    0%, 100% { 
                      transform: scale(1);
                      filter: drop-shadow(0 0 10px rgba(251,191,36,0.7)) drop-shadow(0 0 20px rgba(251,191,36,0.4));
                    }
                    50% { 
                      transform: scale(1.12);
                      filter: drop-shadow(0 0 16px rgba(251,191,36,1)) drop-shadow(0 0 32px rgba(251,191,36,0.6));
                    }
                  }
                  @keyframes heartPulse {
                    0%, 100% { 
                      transform: scale(1);
                      filter: drop-shadow(0 0 10px rgba(239,68,68,0.7)) drop-shadow(0 0 20px rgba(239,68,68,0.4));
                    }
                    50% { 
                      transform: scale(1.12);
                      filter: drop-shadow(0 0 16px rgba(239,68,68,1)) drop-shadow(0 0 32px rgba(239,68,68,0.6));
                    }
                  }
                `}</style>

                {/* Claim button */}
                <div className="flex justify-center w-full px-[4%] mt-3">
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="relative grid place-items-center select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      width: "100%",
                      height: "clamp(56px, 14vh, 80px)",
                      boxSizing: "border-box",
                      outline: "none",
                      border: 0,
                      animation: "claimPulse 1.125s ease-in-out infinite",
                      containerType: "inline-size",
                    }}
                  >
                    <style>{`
                      @keyframes claimPulse {
                        0%, 100% { 
                          transform: scale(1);
                          filter: brightness(1) drop-shadow(0 0 8px rgba(255,215,0,0.4)) drop-shadow(0 0 16px rgba(255,215,0,0.3));
                        }
                        50% { 
                          transform: scale(1.05);
                          filter: brightness(1.15) drop-shadow(0 0 20px rgba(255,215,0,0.9)) drop-shadow(0 0 40px rgba(255,215,0,0.6));
                        }
                      }
                    `}</style>
                    
                    <div className="absolute" style={{
                      top: "6px", left: "6px", right: "-6px", bottom: "-6px",
                      clipPath: 'polygon(50% 0%, 92% 22.114%, 92% 77.886%, 50% 100%, 8% 77.886%, 8% 22.114%)',
                      background: "rgba(0,0,0,0.35)", filter: "blur(4px)"
                    }} />
                    
                    <div className="absolute inset-0" style={{
                      clipPath: 'polygon(50% 0%, 92% 22.114%, 92% 77.886%, 50% 100%, 8% 77.886%, 8% 22.114%)',
                      background: 'linear-gradient(135deg, hsl(var(--dup-gold-700)), hsl(var(--dup-gold-600)) 50%, hsl(var(--dup-gold-800)))',
                      boxShadow: 'inset 0 0 0 2px hsl(var(--dup-gold-900)), 0 8px 20px rgba(0,0,0,0.35)'
                    }} />
                    
                    <div className="absolute inset-[3px]" style={{
                      clipPath: 'polygon(50% 0%, 92% 22.114%, 92% 77.886%, 50% 100%, 8% 77.886%, 8% 22.114%)',
                      background: 'linear-gradient(180deg, hsl(var(--dup-gold-400)), hsl(var(--dup-gold-500)) 40%, hsl(var(--dup-gold-700)))',
                      boxShadow: 'inset 0 1px 0 hsl(var(--dup-gold-300))'
                    }} />
                    
                    <div className="absolute" style={{
                      top: "6px", left: "6px", right: "6px", bottom: "6px",
                      clipPath: 'polygon(50% 0.6%, 92% 22.114%, 92% 77.886%, 50% 99.4%, 8% 77.886%, 8% 22.114%)',
                      background: 'radial-gradient(ellipse 100% 80% at 50% -10%, hsl(155 90% 82%) 0%, hsl(155 85% 68%) 30%, hsl(155 78% 58%) 60%, hsl(155 70% 45%) 100%)',
                      boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.25), inset 0 -12px 24px rgba(0,0,0,0.4)'
                    }} />
                    
                    <div className="absolute pointer-events-none" style={{
                      top: "6px", left: "6px", right: "6px", bottom: "6px",
                      clipPath: 'polygon(50% 0.6%, 92% 22.114%, 92% 77.886%, 50% 99.4%, 8% 77.886%, 8% 22.114%)',
                      background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.6), transparent 60%)'
                    }} />
                    
                    <div className="absolute pointer-events-none" style={{
                      top: "6px", left: "6px", right: "6px", bottom: "6px",
                      clipPath: 'polygon(50% 0.6%, 92% 22.114%, 92% 77.886%, 50% 99.4%, 8% 77.886%, 8% 22.114%)',
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 12px, transparent 12px, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 24px)',
                      opacity: 0.7
                    }} />
                    
                    <span className="relative z-10 font-black text-white tracking-[0.08em] px-4"
                          style={{
                            fontSize: "clamp(1.4rem, 7cqw, 2.9rem)",
                            textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)",
                            whiteSpace: "nowrap"
                          }}>
                      {claiming ? t('welcome.claim_button_processing') : t('welcome.claim_button_active')}
                    </span>
                  </button>
                </div>
              </div>
            </HexShieldFrame>
            </div>
          </div>

          {/* Close X button */}
          <button
            onClick={onLater}
            disabled={claiming}
            className={`absolute top-[8vh] right-[4vw] text-white/70 hover:text-white font-bold z-30 w-[12vw] h-[12vw] max-w-[60px] max-h-[60px] flex items-center justify-center bg-black/30 hover:bg-black/50 rounded-full transition-all transform duration-500 ease-out ${contentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
            style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)', transitionDelay: '0ms' }}
          >
            ×
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
