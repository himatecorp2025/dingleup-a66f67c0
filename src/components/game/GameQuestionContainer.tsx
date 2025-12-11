import { memo, ReactNode, useMemo } from 'react';

interface GameQuestionContainerProps {
  isAnimating: boolean;
  translateY: number;
  questionVisible: boolean;
  children: ReactNode;
}

export const GameQuestionContainer = memo(({
  isAnimating,
  translateY,
  questionVisible,
  children
}: GameQuestionContainerProps) => {
  // Memoize styles to prevent unnecessary recalculations
  const containerStyle = useMemo(() => ({
    transform: isAnimating 
      ? 'translate3d(0, -100%, 0)' // GPU-accelerated slide up
      : `translate3d(0, ${translateY}px, 0)`, // GPU-accelerated drag follow
    transition: isAnimating 
      ? 'transform 350ms cubic-bezier(0.4, 0.0, 0.2, 1)' // Material Design standard easing
      : 'none', // No transition during drag for instant response
    willChange: isAnimating ? 'transform' : 'auto',
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    perspective: 1000,
    WebkitPerspective: 1000,
  }), [isAnimating, translateY]);

  const contentStyle = useMemo(() => ({
    opacity: questionVisible ? 1 : 0,
    transition: questionVisible ? 'opacity 150ms ease-out' : 'opacity 100ms ease-in',
  }), [questionVisible]);

  return (
    <div 
      className="absolute inset-0 w-full h-full"
      style={containerStyle}
    >
      <div 
        className="w-full h-full"
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );
});

GameQuestionContainer.displayName = 'GameQuestionContainer';
