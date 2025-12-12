import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UseDynamicVerticalCenterReturn {
  svgRef: React.RefObject<SVGSVGElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  transformStyle: React.CSSProperties;
}

/**
 * Dynamically centers content vertically within an overlay container
 * using pixel-perfect measurements with ResizeObserver
 */
export const useDynamicVerticalCenter = (): UseDynamicVerticalCenterReturn => {
  const svgRef = useRef<SVGSVGElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState<number>(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const lastContentHeightRef = useRef<number>(0);
  const calculateCenter = useCallback(() => {
    if (!svgRef.current || !contentRef.current) {
      // DOM not ready - retry after 100ms
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = window.setTimeout(calculateCenter, 100);
      return;
    }

    try {
      // Find the BLACK overlay element: <use href="#HEX_Q" fill="black" fillOpacity="0.5" />
      const blackOverlay = svgRef.current.querySelector('use[href="#HEX_Q"][fill="black"]') as SVGUseElement;
      
      if (!blackOverlay) {
        logger.error('[useDynamicVerticalCenter] Black overlay not found');
        return;
      }

      // Get the REAL bounding box of the BLACK overlay path (after scale transform)
      const bbox = blackOverlay.getBBox();
      const ctm = blackOverlay.getCTM();
      
      if (!ctm) {
        logger.error('[useDynamicVerticalCenter] CTM not available');
        return;
      }

      // Convert SVG coordinates to pixel coordinates using the transformation matrix
      const blackTop = ctm.f + bbox.y * ctm.d;
      const blackBottom = ctm.f + (bbox.y + bbox.height) * ctm.d;
      const blackHeight = blackBottom - blackTop;
      const blackCenter = blackTop + blackHeight / 2;

      // Measure text content center
      const contentRect = contentRef.current.getBoundingClientRect();
      const textCenter = contentRect.top + contentRect.height / 2;

      if (contentRect.height === 0) {
        // Content not yet rendered - retry
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = window.setTimeout(calculateCenter, 100);
        return;
      }

      // Calculate offset: align text center to BLACK overlay center
      const offsetY = blackCenter - textCenter;
      
      // Set translateY in pixels
      setTranslateY(offsetY);
      lastContentHeightRef.current = contentRect.height;
      
      if (import.meta.env.DEV) {
        logger.log('[useDynamicVerticalCenter] BLACK overlay centering:', {
          blackTop,
          blackBottom,
          blackHeight,
          blackCenter,
          textCenter,
          contentHeight: contentRect.height,
          offsetY,
        });
      }
    } catch (error) {
      logger.error('[useDynamicVerticalCenter] Error:', error);
    }
  }, []);

  useEffect(() => {
    // Initial calculation
    calculateCenter();

    // Setup ResizeObserver for automatic recalculation on size changes
    const resizeObserver = new ResizeObserver(() => {
      calculateCenter();
    });

    if (overlayRef.current) {
      resizeObserver.observe(overlayRef.current);
    }
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    // Recalculate on viewport changes
    const handleResize = () => {
      calculateCenter();
    };
    window.addEventListener('resize', handleResize);

    // Recalculate on orientation change (mobile)
    const handleOrientationChange = () => {
      setTimeout(calculateCenter, 100);
    };
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [calculateCenter]);

  // MutationObserver for DOM content changes (e.g., text changes)
  useEffect(() => {
    if (!contentRef.current) return;

    const mutationObserver = new MutationObserver(() => {
      // Content changed - recalculate after a brief delay to allow layout
      setTimeout(calculateCenter, 50);
    });

    mutationObserver.observe(contentRef.current, {
      childList: true,
      characterData: true,
      subtree: true
    });

    return () => {
      mutationObserver.disconnect();
    };
  }, [calculateCenter]);

  return {
    svgRef,
    overlayRef,
    contentRef,
    transformStyle: {
      transform: `translateY(${translateY}px)`,
      position: 'relative' as const
    }
  };
};
