import { ReactNode, useEffect, useRef, useState, useId } from 'react';

interface MillionaireAnswerProps {
  children: ReactNode;
  letter: 'A' | 'B' | 'C';
  onClick: () => void;
  isSelected?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  disabled?: boolean;
  isRemoved?: boolean;
  isDoubleChoiceActive?: boolean;
  showCorrectPulse?: boolean;
}

export const MillionaireAnswer = ({ 
  children, 
  letter, 
  onClick, 
  isSelected,
  isCorrect,
  isWrong,
  disabled,
  isRemoved,
  isDoubleChoiceActive,
  showCorrectPulse
}: MillionaireAnswerProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isMultiLine, setIsMultiLine] = useState(false);
  
  // CRITICAL: Generate unique ID per component instance to avoid SVG gradient conflicts
  const uniqueId = useId().replace(/:/g, '_');

  useEffect(() => {
    if (!textRef.current) return;
    
    const styles = window.getComputedStyle(textRef.current);
    const lineHeight = parseFloat(styles.lineHeight);
    const height = textRef.current.offsetHeight;
    const lines = Math.round(height / lineHeight);
    
    setIsMultiLine(lines >= 2);
  }, [children]);

  // Determine gradient suffix based on state - ORDER MATTERS
  // Priority: showCorrectPulse/isCorrect > isWrong > isDoubleChoiceActive > default
  let gradientSuffix = 'default';
  if (showCorrectPulse || isCorrect) {
    gradientSuffix = 'correct';
  } else if (isWrong) {
    gradientSuffix = 'wrong';
  } else if (isDoubleChoiceActive) {
    gradientSuffix = 'orange';
  }

  // UNIQUE gradient IDs per instance to prevent SVG ID collisions
  const band20Id = `band20_${uniqueId}_${gradientSuffix}`;
  const band5Id = `band5_${uniqueId}_${gradientSuffix}`;
  const hexPathId = `HEX_ANS_${uniqueId}`;
  const bgGradId = `bg_ans_${uniqueId}`;
  const chromeGradId = `chromeGrad_ans_${uniqueId}`;
  const filterId = `pro3d_ans_${uniqueId}`;
  const maskId = `maskOuterOnly_ans_${uniqueId}`;

  return (
    <div className={`w-full flex justify-center mb-1 ${isRemoved ? 'opacity-40' : ''}`}>
      <button
        onClick={onClick}
        disabled={disabled || isRemoved}
        className={`w-[90%] relative ${disabled || isRemoved ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'} transition-transform duration-300`}
        style={{ minHeight: '72px' }}
      >
        {/* SVG Background with fast pulse animation on correct answer */}
        <svg 
          xmlns="http://www.w3.org/2000/svg"
          viewBox="22.53058 -47.5814116 672.82399 250"
          fill="none"
          shapeRendering="geometricPrecision"
          colorInterpolationFilters="sRGB"
          className={`absolute inset-0 w-full h-auto pointer-events-none ${showCorrectPulse || isCorrect ? 'animate-pulse-fast' : ''}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <path id={hexPathId} d="M 592.82399,0 h -467.76283 c -23.80302,0 -36.4576,36.10205 -62.53058,36.10196 26.07298,-9e-5 38.72756,36.10196 62.53058,36.10196 h 467.76283 c 23.80302,0 36.4576,-36.10205 62.53058,-36.10196 -26.07298,9e-5 -38.72756,-36.10196 -62.53058,-36.10196 z"/>

            <linearGradient id={bgGradId} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#191534"/>
              <stop offset="100%" stopColor="#0e0b1c"/>
            </linearGradient>

            <linearGradient id={chromeGradId} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f8fbff"/>
              <stop offset="10%" stopColor="#c6ccd3"/>
              <stop offset="22%" stopColor="#ffffff"/>
              <stop offset="40%" stopColor="#9ea6b0"/>
              <stop offset="58%" stopColor="#e7ebf0"/>
              <stop offset="78%" stopColor="#bfc6cf"/>
              <stop offset="100%" stopColor="#ffffff"/>
            </linearGradient>

            {/* Color gradients based on state */}
            {gradientSuffix === 'default' && (
              <>
                <linearGradient id={band20Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E0BFFF"/>
                  <stop offset="35%" stopColor="#9C27F3"/>
                  <stop offset="100%" stopColor="#6A0BB8"/>
                </linearGradient>
                <linearGradient id={band5Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F2E6FF"/>
                  <stop offset="50%" stopColor="#B85AFF"/>
                  <stop offset="100%" stopColor="#7B1ED6"/>
                </linearGradient>
              </>
            )}
            {gradientSuffix === 'correct' && (
              <>
                <linearGradient id={band20Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#BFFFBF"/>
                  <stop offset="35%" stopColor="#27F327"/>
                  <stop offset="100%" stopColor="#0BB80B"/>
                </linearGradient>
                <linearGradient id={band5Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E6FFE6"/>
                  <stop offset="50%" stopColor="#5AFF5A"/>
                  <stop offset="100%" stopColor="#1ED61E"/>
                </linearGradient>
              </>
            )}
            {gradientSuffix === 'wrong' && (
              <>
                <linearGradient id={band20Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFBFBF"/>
                  <stop offset="35%" stopColor="#F32727"/>
                  <stop offset="100%" stopColor="#B80B0B"/>
                </linearGradient>
                <linearGradient id={band5Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFE6E6"/>
                  <stop offset="50%" stopColor="#FF5A5A"/>
                  <stop offset="100%" stopColor="#D61E1E"/>
                </linearGradient>
              </>
            )}
            {gradientSuffix === 'orange' && (
              <>
                <linearGradient id={band20Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFDBBF"/>
                  <stop offset="35%" stopColor="#F39C27"/>
                  <stop offset="100%" stopColor="#B8660B"/>
                </linearGradient>
                <linearGradient id={band5Id} x1="0" y1="-47.58" x2="0" y2="119.78" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFEDE6"/>
                  <stop offset="50%" stopColor="#FFB85A"/>
                  <stop offset="100%" stopColor="#D6851E"/>
                </linearGradient>
              </>
            )}

            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="rgba(0,0,0,0.35)"/>
              <feDropShadow dx="0" dy="-0.6" stdDeviation="0.7" floodColor="rgba(255,255,255,0.35)"/>
            </filter>

            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect x="-9999" y="-9999" width="20000" height="20000" fill="black"/>
              <use href={`#${hexPathId}`} stroke="white" strokeWidth="2" fill="none"/>
              <use href={`#${hexPathId}`} stroke="black" strokeWidth="25" fill="none"/>
            </mask>
          </defs>

          <rect x="-10000" y="-10000" width="30000" height="30000" fill="none" />

          <g transform="scale(1,1.44)">
            <use href={`#${hexPathId}`} fill="black" fillOpacity="0.5"/>

            <use href={`#${hexPathId}`} fill="none" stroke={`url(#${band20Id})`} strokeWidth="20"
                 strokeLinejoin="miter" strokeMiterlimit="200" strokeLinecap="butt" filter={`url(#${filterId})`}
                 vectorEffect="non-scaling-stroke"/>

            <use href={`#${hexPathId}`} fill="none" stroke={`url(#${band5Id})`} strokeWidth="5"
                 strokeLinejoin="miter" strokeMiterlimit="200" strokeLinecap="butt" filter={`url(#${filterId})`}
                 vectorEffect="non-scaling-stroke"/>

            <g mask={`url(#${maskId})`}>
              <use href={`#${hexPathId}`} fill="none" stroke={`url(#${chromeGradId})`} strokeWidth="2"
                   strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
            </g>
          </g>
        </svg>
        
        {/* Content wrapper - flexbox centered like PlayNowButton */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ padding: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
          <div className="flex items-center justify-center w-full translate-y-[19px]" style={{ gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}>
          <div 
            className="relative flex-shrink-0 flex items-center justify-center"
            style={{ 
              width: 'clamp(3rem, 7vw, 4rem)',
              height: 'clamp(2rem, 5vw, 2.5rem)',
              clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)'
            }}
          >
              {/* Letter hexagon with same 3D effect as question number */}
              <div
                className="absolute"
                style={{
                  top: '2px',
                  left: '2px',
                  right: '-2px',
                  bottom: '-2px',
                  background: 'rgba(0,0,0,0.35)',
                  filter: 'blur(3px)',
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)'
                }}
                aria-hidden
              />

              <div
                className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-darker border-2 border-primary"
                style={{ 
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                  boxShadow: '0 0 20px hsl(var(--primary)/0.6), 0 8px 25px rgba(0,0,0,0.5)'
                }}
                aria-hidden
              />

              <div
                className="absolute bg-gradient-to-b from-primary via-primary-glow to-primary-dark"
                style={{ 
                  top: '2px',
                  left: '2px',
                  right: '2px',
                  bottom: '2px',
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                  boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.15)' 
                }}
                aria-hidden
              />

              <div
                className="absolute bg-gradient-to-b from-primary-glow via-primary to-primary-dark"
                style={{
                  top: '3px',
                  left: '3px',
                  right: '3px',
                  bottom: '3px',
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                  boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.1), inset 0 -4px 8px rgba(0,0,0,0.15)',
                }}
                aria-hidden
              />

              <div
                className="absolute pointer-events-none"
                style={{
                  top: '3px',
                  left: '3px',
                  right: '3px',
                  bottom: '3px',
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                  background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)',
                }}
                aria-hidden
              />

              <div
                className="absolute pointer-events-none"
                style={{
                  top: '3px',
                  left: '3px',
                  right: '3px',
                  bottom: '3px',
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.125)',
                }}
                aria-hidden
              />

              <span 
                className="relative z-10 text-primary-foreground font-bold leading-none drop-shadow-lg font-poppins" 
                style={{ 
                  fontSize: 'clamp(0.9375rem, 3vw, 1.125rem)',
                  textShadow: '1px 1px 2px hsl(var(--background) / 0.8), -1px -1px 2px hsl(var(--background) / 0.8)' 
                }}
              >
                {letter}:
              </span>
            </div>
            <p 
              ref={textRef}
              className="font-bold leading-snug text-center flex-1 drop-shadow-lg font-poppins text-foreground"
              style={{ 
                fontSize: typeof children === 'string' && children.length > 35 
                  ? 'clamp(1rem, 3.5vw, 1.25rem)' 
                  : typeof children === 'string' && children.length > 25
                  ? 'clamp(1.125rem, 4vw, 1.5rem)'
                  : 'clamp(1.25rem, 4.5vw, 1.875rem)',
                textShadow: '1px 1px 2px hsl(var(--background) / 0.8), -1px -1px 2px hsl(var(--background) / 0.8)',
                transform: isMultiLine ? 'scale(0.85)' : 'scale(1)',
                transformOrigin: 'center'
              }}
            >
              {children}
            </p>
            <div className="flex-shrink-0" style={{ width: 'clamp(3rem, 7vw, 4rem)' }} aria-hidden />
          </div>
        </div>
      </button>
    </div>
  );
};
