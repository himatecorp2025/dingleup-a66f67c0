import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPerformanceMetric } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Hook for tracking Core Web Vitals performance metrics
 * Sends metrics to analytics and performance_metrics table
 */
export const useWebVitals = () => {
  const location = useLocation();

  useEffect(() => {
    let pageLoadStart = Date.now();
    let metricsReported = false;
    let lcpValue = 0;
    let fidValue = 0;
    let clsValue = 0;
    let fcpValue = 0;

    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    };

    const reportWebVital = (metric: WebVitalsMetric) => {
      logger.log(`[Web Vitals] ${metric.name}:`, metric.value, `(${metric.rating})`);
      
      // Send to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', metric.name, {
          value: Math.round(metric.value),
          metric_rating: metric.rating,
          metric_delta: metric.value,
        });
      }
    };

    const sendPerformanceMetrics = async () => {
      if (metricsReported) return;
      metricsReported = true;

      const userId = await getUserId();
      const loadTime = Date.now() - pageLoadStart;

      // Get Navigation Timing API metrics
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        loadTime,
        ttfb: perfData ? Math.round(perfData.responseStart - perfData.requestStart) : undefined,
        fcp: fcpValue || undefined,
        lcp: lcpValue || undefined,
        fid: fidValue || undefined,
        cls: clsValue || undefined,
        tti: perfData ? Math.round(perfData.domInteractive - perfData.fetchStart) : undefined,
      };

      await trackPerformanceMetric(userId, location.pathname, metrics);
    };

    // Largest Contentful Paint (LCP)
    const observeLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        const value = lastEntry.renderTime || lastEntry.loadTime;
        const rating = value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
        
        lcpValue = value;
        reportWebVital({ name: 'LCP', value, rating });
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.debug('[Web Vitals] LCP not supported');
      }

      return observer;
    };

    // First Input Delay (FID)
    const observeFID = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const value = entry.processingStart - entry.startTime;
          const rating = value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
          
          fidValue = value;
          reportWebVital({ name: 'FID', value, rating });
        });
      });

      try {
        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.debug('[Web Vitals] FID not supported');
      }

      return observer;
    };

    // Cumulative Layout Shift (CLS)
    const observeCLS = () => {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Report CLS on page visibility change
        const reportCLS = () => {
          const rating = clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor';
          reportWebVital({ name: 'CLS', value: clsValue, rating });
        };

        window.addEventListener('visibilitychange', reportCLS, { once: true });
      } catch (e) {
        console.debug('[Web Vitals] CLS not supported');
      }

      return observer;
    };

    // First Contentful Paint (FCP)
    const observeFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            fcpValue = entry.startTime;
            const rating = entry.startTime <= 1800 ? 'good' : entry.startTime <= 3000 ? 'needs-improvement' : 'poor';
            reportWebVital({ name: 'FCP', value: entry.startTime, rating });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.debug('[Web Vitals] FCP not supported');
      }

      return observer;
    };

    const lcpObserver = observeLCP();
    const fidObserver = observeFID();
    const clsObserver = observeCLS();
    const fcpObserver = observeFCP();

    // Send metrics after 3 seconds to capture most Web Vitals
    const timeoutId = setTimeout(() => {
      sendPerformanceMetrics();
    }, 3000);

    // Send metrics when page is hidden (user navigates away)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendPerformanceMetrics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, [location.pathname]);
};
