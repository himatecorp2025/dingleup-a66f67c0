import { Users, CircleSlash, CheckCheck } from "lucide-react";
import { useI18n } from "@/i18n";
import { trackFeatureUsage } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

interface GameLifelinesProps {
  help5050UsageCount: number;
  help2xAnswerUsageCount: number;
  helpAudienceUsageCount: number;
  isHelp5050ActiveThisQuestion: boolean;
  isDoubleAnswerActiveThisQuestion: boolean;
  isAudienceActiveThisQuestion: boolean;
  coins: number;
  onUseHelp5050: () => void;
  onUseHelp2xAnswer: () => void;
  onUseHelpAudience: () => void;
}

const Lifeline3DButton = ({ 
  onClick, 
  disabled, 
  isActive, 
  icon: Icon, 
  label, 
  cost,
  colorScheme = 'purple'
}: { 
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  icon: React.ElementType;
  label?: string;
  cost?: number;
  colorScheme?: 'orange' | 'green' | 'blue' | 'red' | 'purple';
}) => {
  const getColorsByScheme = () => {
    if (disabled) {
      return {
        color: "hsl(var(--muted-foreground))",
        glow: "rgba(100, 100, 100, 0.3)",
        gradient: "linear-gradient(135deg, #505050 0%, #3a3a3a 50%, #2a2a2a 100%)",
        innerGradient: "radial-gradient(circle at 30% 30%, rgba(80, 80, 90, 1) 0%, rgba(50, 50, 60, 1) 40%, rgba(30, 30, 40, 1) 100%)"
      };
    }
    
    const schemes = {
      orange: {
        color: isActive ? "#FF8C00" : "#FFA500",
        glow: isActive ? "rgba(255, 140, 0, 0.9)" : "rgba(255, 165, 0, 0.6)",
        gradient: isActive ? "linear-gradient(135deg, #FF8C00 0%, #FF6B00 50%, #FF4500 100%)" : "linear-gradient(135deg, #FFB84D 0%, #FF8C00 50%, #FF6B00 100%)",
        innerGradient: isActive ? "radial-gradient(circle at 30% 30%, rgba(255, 140, 0, 1) 0%, rgba(255, 107, 0, 1) 40%, rgba(255, 69, 0, 1) 100%)" : "radial-gradient(circle at 30% 30%, rgba(255, 184, 77, 1) 0%, rgba(255, 140, 0, 1) 40%, rgba(255, 107, 0, 1) 100%)"
      },
      green: {
        color: isActive ? "#10B981" : "#34D399",
        glow: isActive ? "rgba(16, 185, 129, 0.9)" : "rgba(52, 211, 153, 0.6)",
        gradient: isActive ? "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)" : "linear-gradient(135deg, #6EE7B7 0%, #10B981 50%, #059669 100%)",
        innerGradient: isActive ? "radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 40%, rgba(4, 120, 87, 1) 100%)" : "radial-gradient(circle at 30% 30%, rgba(110, 231, 183, 1) 0%, rgba(16, 185, 129, 1) 40%, rgba(5, 150, 105, 1) 100%)"
      },
      blue: {
        color: isActive ? "#3B82F6" : "#60A5FA",
        glow: isActive ? "rgba(59, 130, 246, 0.9)" : "rgba(96, 165, 250, 0.6)",
        gradient: isActive ? "linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)" : "linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #2563EB 100%)",
        innerGradient: isActive ? "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 1) 0%, rgba(37, 99, 235, 1) 40%, rgba(29, 78, 216, 1) 100%)" : "radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 1) 0%, rgba(59, 130, 246, 1) 40%, rgba(37, 99, 235, 1) 100%)"
      },
      red: {
        color: isActive ? "#EF4444" : "#F87171",
        glow: isActive ? "rgba(239, 68, 68, 0.9)" : "rgba(248, 113, 113, 0.6)",
        gradient: isActive ? "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)" : "linear-gradient(135deg, #FCA5A5 0%, #EF4444 50%, #DC2626 100%)",
        innerGradient: isActive ? "radial-gradient(circle at 30% 30%, rgba(239, 68, 68, 1) 0%, rgba(220, 38, 38, 1) 40%, rgba(185, 28, 28, 1) 100%)" : "radial-gradient(circle at 30% 30%, rgba(252, 165, 165, 1) 0%, rgba(239, 68, 68, 1) 40%, rgba(220, 38, 38, 1) 100%)"
      },
      purple: {
        color: isActive ? "#9C27F3" : "#B85AFF",
        glow: isActive ? "rgba(156, 39, 243, 0.9)" : "rgba(184, 90, 255, 0.6)",
        gradient: isActive ? "linear-gradient(135deg, #9C27F3 0%, #7B1ED6 50%, #6A0BB8 100%)" : "linear-gradient(135deg, #B85AFF 0%, #9C27F3 50%, #7B1ED6 100%)",
        innerGradient: isActive ? "radial-gradient(circle at 30% 30%, rgba(156, 39, 243, 1) 0%, rgba(123, 30, 214, 1) 40%, rgba(106, 11, 184, 1) 100%)" : "radial-gradient(circle at 30% 30%, rgba(184, 90, 255, 1) 0%, rgba(156, 39, 243, 1) 40%, rgba(123, 30, 214, 1) 100%)"
      }
    };
    
    return schemes[colorScheme];
  };

  const { color, glow: glowColor, gradient, innerGradient } = getColorsByScheme();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'} transition-transform duration-200`}
      style={{ 
        width: 'clamp(3rem, 8vw, 4.5rem)',
        height: 'clamp(3rem, 8vw, 4.5rem)',
        perspective: '1000px', 
        transformStyle: 'preserve-3d' 
      }}
    >
      {/* DEEP BASE SHADOW */}
      <div 
        className="absolute inset-0 rounded-lg" 
        style={{ 
          transform: 'translate(4px, 4px) translateZ(-15px)', 
          filter: 'blur(8px)',
          background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)'
        }} 
        aria-hidden 
      />
      
      {/* OUTER METALLIC FRAME */}
      <div 
        className="absolute inset-0 rounded-lg border-2"
        style={{ 
          transform: 'translateZ(3px)',
          background: gradient,
          borderColor: 'rgba(255,255,255,0.3)',
          boxShadow: `0 0 20px ${glowColor}, 0 8px 24px rgba(0,0,0,0.7), inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.5)`
        }} 
        aria-hidden 
      />
      
      {/* MIDDLE DEPTH RING */}
      <div 
        className="absolute inset-[3px] rounded-lg" 
        style={{ 
          transform: 'translateZ(12px)',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,30,30,0.9) 50%, rgba(0,0,0,0.8) 100%)',
          boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.3), inset 0 -2px 8px rgba(0,0,0,0.8)'
        }} 
        aria-hidden 
      />
      
      {/* INNER CRYSTAL LAYER */}
      <div 
        className="absolute inset-[5px] rounded-lg" 
        style={{ 
          transform: 'translateZ(20px)',
          background: innerGradient,
          boxShadow: `inset 0 10px 20px rgba(255,255,255,0.12), 
                      inset 0 -10px 20px rgba(0,0,0,0.8),
                      0 0 15px ${glowColor}`
        }} 
        aria-hidden 
      />
      
      {/* SPECULAR HIGHLIGHT */}
      <div 
        className="absolute inset-[5px] rounded-lg pointer-events-none" 
        style={{ 
          transform: 'translateZ(28px)',
          background: 'radial-gradient(ellipse 120% 80% at 35% 15%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 25%, transparent 60%)',
        }} 
        aria-hidden 
      />
      
      {/* ICON AND LABEL */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center" 
        style={{ 
          gap: 'clamp(0.125rem, 0.5vw, 0.25rem)',
          transform: 'translateZ(32px)' 
        }}
      >
        <Icon 
          className="transition-all duration-300" 
          style={{ 
            width: 'clamp(1rem, 3vw, 1.25rem)',
            height: 'clamp(1rem, 3vw, 1.25rem)',
            color: disabled ? "hsl(var(--muted-foreground))" : "#FFFFFF",
            filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
            opacity: disabled ? 0.5 : 1
          }} 
        />
        <span 
          className="font-bold transition-all duration-300 max-w-full truncate"
          style={{ 
            fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)',
            paddingLeft: 'clamp(0.125rem, 0.5vw, 0.25rem)',
            paddingRight: 'clamp(0.125rem, 0.5vw, 0.25rem)',
            color: disabled ? "hsl(var(--muted-foreground))" : "#FFFFFF",
            textShadow: `0 0 10px ${glowColor}, 0 2px 4px rgba(0,0,0,0.8)`,
            opacity: disabled ? 0.5 : 1
          }}
        >
          {cost !== undefined ? (
            <div className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="url(#goldGradient)" stroke="#FFD700" strokeWidth="1"/>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="24">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#FFA500"/>
                    <stop offset="100%" stopColor="#FF8C00"/>
                  </linearGradient>
                </defs>
              </svg>
              <span>{cost}</span>
            </div>
          ) : (label || '')}
        </span>
      </div>
    </button>
  );
};

const OneThirdIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontSize="11"
      fontWeight="700"
      fill="currentColor"
    >
      1/3
    </text>
  </svg>
);

export const GameLifelines = ({
  help5050UsageCount,
  help2xAnswerUsageCount,
  helpAudienceUsageCount,
  isHelp5050ActiveThisQuestion,
  isDoubleAnswerActiveThisQuestion,
  isAudienceActiveThisQuestion,
  coins,
  onUseHelp5050,
  onUseHelp2xAnswer,
  onUseHelpAudience
}: GameLifelinesProps) => {
  const { t } = useI18n();
  
  const trackLifelineUsage = async (lifelineName: string, cost?: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await trackFeatureUsage(session.user.id, 'lifeline_usage', 'lifeline', lifelineName, {
        cost: cost || 0
      });
    }
  };
  
  return (
    <div 
      className="flex justify-center items-center"
      style={{
        gap: 'clamp(0.5rem, 2vw, 1rem)',
        marginBottom: 'clamp(0.5rem, 1vw, 1rem)'
      }}
    >
      <Lifeline3DButton
        onClick={async () => {
          await trackLifelineUsage('50_50', help5050UsageCount === 1 ? 15 : 0);
          onUseHelp5050();
        }}
        disabled={help5050UsageCount >= 2}
        isActive={isHelp5050ActiveThisQuestion}
        icon={OneThirdIcon}
        label={undefined}
        cost={help5050UsageCount === 1 ? 15 : undefined}
        colorScheme="orange"
      />
      <Lifeline3DButton
        onClick={async () => {
          await trackLifelineUsage('double_answer', help2xAnswerUsageCount === 1 ? 20 : 0);
          onUseHelp2xAnswer();
        }}
        disabled={help2xAnswerUsageCount >= 2}
        isActive={isDoubleAnswerActiveThisQuestion}
        icon={CheckCheck}
        label={undefined}
        cost={help2xAnswerUsageCount === 1 ? 20 : undefined}
        colorScheme="green"
      />
      <Lifeline3DButton
        onClick={async () => {
          await trackLifelineUsage('audience', helpAudienceUsageCount === 1 ? 25 : 0);
          onUseHelpAudience();
        }}
        disabled={helpAudienceUsageCount >= 2}
        isActive={isAudienceActiveThisQuestion}
        icon={Users}
        label={undefined}
        cost={helpAudienceUsageCount === 1 ? 25 : undefined}
        colorScheme="blue"
      />
    </div>
  );
};
