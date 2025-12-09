interface HeartIcon3DProps {
  className?: string;
  size?: number;
}

export const HeartIcon3D = ({ className = "", size = 32 }: HeartIcon3DProps) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="heartGradientRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <radialGradient id="heartShineRed" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#fecaca" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#fca5a5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="heartShadowRed">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer glow */}
      <path
        d="M32 54 C18 44, 8 34, 8 22 C8 12, 16 8, 22 10 C26 11, 29 14, 32 18 C35 14, 38 11, 42 10 C48 8, 56 12, 56 22 C56 34, 46 44, 32 54 Z"
        fill="#ef4444"
        opacity="0.3"
        filter="blur(4px)"
      />
      
      {/* Main heart */}
      <path
        d="M32 52 C20 43, 10 34, 10 23 C10 14, 17 10, 23 12 C27 13, 30 16, 32 20 C34 16, 37 13, 41 12 C47 10, 54 14, 54 23 C54 34, 44 43, 32 52 Z"
        fill="url(#heartGradientRed)"
        filter="url(#heartShadowRed)"
      />
      
      {/* Inner shine */}
      <ellipse
        cx="22"
        cy="18"
        rx="8"
        ry="10"
        fill="url(#heartShineRed)"
        opacity="0.8"
      />
      
      {/* Highlight spot */}
      <ellipse
        cx="26"
        cy="16"
        rx="4"
        ry="5"
        fill="#fecaca"
        opacity="0.7"
      />
    </svg>
  );
};
