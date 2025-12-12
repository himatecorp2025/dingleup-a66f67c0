import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import HexShieldFrame from './frames/HexShieldFrame';
import HexAcceptButton from './ui/HexAcceptButton';

interface PersonalWinnerDialogProps {
  open: boolean;
  onClose: () => void;
  rank: number;
  username: string;
  goldReward: number;
  livesReward: number;
  errorMessage?: string;
  isClaiming?: boolean;
}

// Generate unique IDs for SVG gradients to prevent conflicts
const generateUniqueId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// Get shield inner SVG gradient ID based on rank
const getShieldGradientId = (rank: number): string => {
  if (rank === 1) return 'url(#crystalGold)';
  if (rank === 2) return 'url(#crystalSilver)';
  if (rank === 3) return 'url(#crystalBronze)';
  return 'url(#crystalBlue)';
};

export const PersonalWinnerDialog = ({ 
  open, 
  onClose, 
  rank, 
  username, 
  goldReward, 
  livesReward,
  errorMessage,
  isClaiming = false,
}: PersonalWinnerDialogProps) => {
  const [contentVisible, setContentVisible] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Fixed 3D canvas dimensions (same as DailyWinnersDialog)
  const BASE_WIDTH = 414;
  const BASE_HEIGHT = 736;
  
  // Generate unique IDs once per component instance
  const svgIds = useMemo(() => ({
    coinGold: generateUniqueId('coinGold3D'),
    coinInner: generateUniqueId('coinInner'),
    coinShadow: generateUniqueId('coinShadow'),
    heartGradient: generateUniqueId('heartGradient3D'),
    heartHighlight: generateUniqueId('heartHighlight'),
    heartShadow: generateUniqueId('heartShadow'),
  }), []);

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

  // Add keyframes for animations
  useEffect(() => {
    const styleId = 'personal-winner-keyframes';
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

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setContentVisible(true), 10);
      return () => {
        clearTimeout(t);
        setContentVisible(false);
      };
    } else {
      setContentVisible(false);
    }
  }, [open]);

  const shieldInnerGradient = useMemo(() => getShieldGradientId(rank), [rank]);

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          overlayClassName="bg-black/25"
          className="overflow-visible p-0 border-0 bg-transparent w-screen h-screen max-w-none rounded-none [&>button[data-dialog-close]]:hidden z-[99999]"
          style={{ 
            margin: 0,
            maxHeight: 'none',
            minHeight: '100vh',
            borderRadius: 0,
            zIndex: 99999
          }}
        >
          <DialogTitle className="sr-only">Személyes Nyertes</DialogTitle>
          <DialogDescription className="sr-only">Gratulálunk a helyezéshez és a jutalmakhoz!</DialogDescription>

          <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
            <div
              className="personal-winner-canvas"
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
                  transition: 'transform 1.125s cubic-bezier(0.34, 1.56, 0.64, 1) 0ms, opacity 1.125s ease-in-out 0ms',
                  transformOrigin: 'center center',
                  willChange: contentVisible ? 'transform, opacity' : 'auto'
                }}
              >
              {/* CARD WRAPPER */}
              <div 
                className="personal-winner-card relative"
                style={{ 
                  width: '100%',
                  height: '100%'
                }}
              >
                {errorMessage && (
                  <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-[60] max-w-[85%]">
                    <div className="relative rounded-xl bg-destructive/95 text-destructive-foreground px-4 py-3 pr-10 shadow-lg text-center font-semibold text-sm md:text-base">
                      {errorMessage}
                      <button
                        onClick={() => {
                          // Close popup when X is clicked on error message
                          onClose();
                        }}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        aria-label="Bezárás"
                      >
                        <span className="text-white text-lg font-bold leading-none">×</span>
                      </button>
                    </div>
                  </div>
                )}
                <HexShieldFrame 
                  showShine={true}
                  customInnerBackground={shieldInnerGradient}
                >
                  {/* RED BANNER - Personal Reward */}
                  <div 
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
                        YESTERDAY'S JACKPOT
                      </h1>
                      
                      {/* Personal reward info row */}
                      <div className="relative z-10 mt-2 flex items-center justify-center gap-3 text-white px-2"
                           style={{
                             fontSize: 'clamp(0.8rem, 3.3vw, 1.1rem)',
                             fontWeight: 700,
                             flexWrap: 'wrap'
                           }}>
                        
                        {/* Gold coin */}
                        <div className="flex flex-col items-center gap-0.5">
                          <span style={{
                            color: '#ffd700',
                            fontWeight: 'bold',
                            WebkitTextStroke: '0.6px rgba(0,0,0,0.9)',
                            fontSize: 'clamp(0.9rem, 3.7vw, 1.25rem)'
                          }}>
                            {goldReward.toLocaleString()}
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
                            <circle cx="50" cy="50" r="45" fill={`url(#${svgIds.coinGold})`} filter={`url(#${svgIds.coinShadow})`}/>
                            <circle cx="50" cy="50" r="35" fill={`url(#${svgIds.coinInner})`} opacity="0.9"/>
                            <circle cx="50" cy="50" r="25" fill="none" stroke="#DAA520" strokeWidth="2" opacity="0.6"/>
                            <circle cx="42" cy="42" r="8" fill="#FFFACD" opacity="0.4"/>
                          </svg>
                        </div>
                        
                        {/* 3D heart */}
                        <div className="flex flex-col items-center gap-0.5">
                          <span style={{
                            color: '#ff1a75',
                            fontWeight: 'bold',
                            WebkitTextStroke: '0.6px rgba(0,0,0,0.9)',
                            fontSize: 'clamp(0.9rem, 3.7vw, 1.25rem)'
                          }}>
                            {livesReward}
                          </span>
                          
                          <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id={svgIds.heartGradient} cx="35%" cy="35%">
                                <stop offset="0%" stopColor="#FF1A75" />
                                <stop offset="40%" stopColor="#E6004C" />
                                <stop offset="70%" stopColor="#CC0044" />
                                <stop offset="100%" stopColor="#99002E" />
                              </radialGradient>
                              <radialGradient id={svgIds.heartHighlight} cx="30%" cy="30%">
                                <stop offset="0%" stopColor="#FFF" opacity="0.6"/>
                                <stop offset="100%" stopColor="#FFF" opacity="0"/>
                              </radialGradient>
                              <filter id={svgIds.heartShadow}>
                                <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.6"/>
                              </filter>
                            </defs>
                            <path 
                              d="M50,85 C50,85 20,60 20,40 C20,25 30,15 40,15 C45,15 50,20 50,20 C50,20 55,15 60,15 C70,15 80,25 80,40 C80,60 50,85 50,85 Z" 
                              fill={`url(#${svgIds.heartGradient})`}
                              filter={`url(#${svgIds.heartShadow})`}
                            />
                            <ellipse 
                              cx="38" 
                              cy="30" 
                              rx="10" 
                              ry="15" 
                              fill={`url(#${svgIds.heartHighlight})`}
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shield content - Personal message */}
                  <div 
                    className="px-8"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="text-center space-y-4">
                      <h2 
                        className="font-black uppercase"
                        style={{
                          fontSize: 'clamp(1.75rem, 6vw, 2.5rem)',
                          color: '#f5f5f5',
                          textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                          letterSpacing: '0.05em',
                          lineHeight: '1.2',
                          fontWeight: 900
                        }}
                      >
                        Gratulálunk {username}!
                      </h2>
                      
                      <p 
                        className="font-bold"
                        style={{
                          fontSize: 'clamp(1.25rem, 4.5vw, 1.75rem)',
                          color: '#f5f5f5',
                          textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                          letterSpacing: '0.05em',
                          lineHeight: '1.4',
                          fontWeight: 900
                        }}
                      >
                        {rank}. helyezett lettél!
                      </p>
                      
                      <div 
                        className="font-black space-y-3 mt-8 p-6"
                        style={{
                          fontSize: 'clamp(1.125rem, 4vw, 1.6rem)',
                          lineHeight: '1.4'
                        }}
                      >
                        <p
                          style={{
                            color: '#f5f5f5',
                            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                            letterSpacing: '0.05em',
                            fontWeight: 900,
                            fontSize: 'clamp(1.3rem, 4.5vw, 1.8rem)',
                          }}
                        >
                          Jutalmad:
                        </p>
                        <p 
                          style={{ 
                            color: '#f5f5f5',
                            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                            letterSpacing: '0.05em',
                            fontWeight: 900,
                            fontSize: 'clamp(1.5rem, 5.5vw, 2.2rem)',
                            lineHeight: '1.3'
                          }}
                        >
                          {goldReward.toLocaleString()} arany
                        </p>
                        <p 
                          style={{ 
                            color: '#f5f5f5',
                            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                            letterSpacing: '0.05em',
                            fontWeight: 900,
                            fontSize: 'clamp(1.5rem, 5.5vw, 2.2rem)',
                            lineHeight: '1.3'
                          }}
                        >
                          {livesReward} élet!
                        </p>
                      </div>
                      
                      <p 
                        className="font-bold mt-8"
                        style={{
                          fontSize: 'clamp(1.125rem, 4vw, 1.6rem)',
                          color: '#f5f5f5',
                          textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                          letterSpacing: '0.05em',
                          fontStyle: 'italic',
                          fontWeight: 900
                        }}
                      >
                        Fogadd örömmel!
                      </p>
                    </div>
                  </div>

                </HexShieldFrame>
                
                {/* Bottom button - Fixed at shield bottom, OUTSIDE HexShieldFrame */}
                <div 
                  className="absolute left-1/2 flex justify-center"
                  style={{ 
                    bottom: '8%',
                    transform: 'translateX(-50%)',
                    zIndex: 50,
                    width: '80%',
                    maxWidth: '280px'
                  }}
                >
                  <HexAcceptButton onClick={onClose} disabled={isClaiming} className="w-full">
                    Köszönöm
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