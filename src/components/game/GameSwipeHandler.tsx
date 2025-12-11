import { useEffect, useRef, ReactNode, useCallback } from 'react';

interface GameSwipeHandlerProps {
  enabled: boolean;
  isAnimating: boolean;
  showExitDialog: boolean;
  swipeThreshold: number;
  translateY: number;
  onTranslateYChange: (value: number) => void;
  onTouchStartYChange: (value: number) => void;
  onSwipeUp: () => Promise<void>;
  onSwipeDown: () => Promise<void>;
  children: ReactNode;
}

export const GameSwipeHandler = ({
  enabled,
  isAnimating,
  showExitDialog,
  swipeThreshold,
  translateY,
  onTranslateYChange,
  onTouchStartYChange,
  onSwipeUp,
  onSwipeDown,
  children
}: GameSwipeHandlerProps) => {
  const touchStartYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const swipeInProgressRef = useRef(false);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Block if disabled, animating, dialog open, or swipe already in progress
    if (!enabled || isAnimating || showExitDialog || swipeInProgressRef.current) {
      return;
    }
    
    const startY = e.touches[0].clientY;
    touchStartYRef.current = startY;
    onTouchStartYChange(startY);
    isSwipingRef.current = true;
    onTranslateYChange(0);
  }, [enabled, isAnimating, showExitDialog, onTouchStartYChange, onTranslateYChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwipingRef.current || !enabled || isAnimating || showExitDialog || swipeInProgressRef.current) {
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartYRef.current;
    
    // Cancel previous RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      // Smoother, more responsive scrolling with easing
      // Increased multiplier for better responsiveness
      const easedDelta = delta * 0.6;
      onTranslateYChange(easedDelta);
    });
  }, [enabled, isAnimating, showExitDialog, onTranslateYChange]);

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!isSwipingRef.current || !enabled || swipeInProgressRef.current) {
      isSwipingRef.current = false;
      return;
    }
    
    // Cancel any pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    const touchEndY = e.changedTouches[0].clientY;
    const delta = touchStartYRef.current - touchEndY;
    
    isSwipingRef.current = false;
    
    // Reset translate immediately if below threshold
    if (Math.abs(delta) < swipeThreshold) {
      onTranslateYChange(0);
      return;
    }

    // Mark swipe in progress to prevent double-triggers
    swipeInProgressRef.current = true;
    
    try {
      if (delta > 0) {
        // Swipe up
        await onSwipeUp();
      } else {
        // Swipe down
        await onSwipeDown();
      }
    } catch (error) {
      console.error('[GameSwipeHandler] Swipe error:', error);
    } finally {
      // Always reset state after swipe completes
      onTranslateYChange(0);
      
      // Small delay before allowing next swipe (prevents accidental double swipes)
      setTimeout(() => {
        swipeInProgressRef.current = false;
      }, 100);
    }
  }, [enabled, swipeThreshold, onSwipeUp, onSwipeDown, onTranslateYChange]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Use passive listeners for better scroll performance
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Cleanup on unmount
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return <>{children}</>;
};
