import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  errorType: 'runtime' | 'promise' | 'component';
  severity: 'low' | 'medium' | 'high' | 'critical';
  page: string;
  userAgent: string;
  userId?: string;
}

export const useErrorTracking = () => {
  useEffect(() => {
    // Track runtime errors
    const handleError = async (event: ErrorEvent) => {
      const errorDetails: ErrorDetails = {
        message: event.message,
        stack: event.error?.stack,
        errorType: 'runtime',
        severity: determineSeverity(event.error),
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      };

      await logError(errorDetails);
    };

    // Track unhandled promise rejections
    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const errorDetails: ErrorDetails = {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        errorType: 'promise',
        severity: 'high',
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      };

      await logError(errorDetails);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
};

const determineSeverity = (error: Error): ErrorDetails['severity'] => {
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('chunk') || message.includes('failed to fetch')) {
    return 'low'; // Network/loading errors
  }
  if (message.includes('null') || message.includes('undefined')) {
    return 'medium'; // Common runtime errors
  }
  if (message.includes('security') || message.includes('permission')) {
    return 'critical'; // Security issues
  }
  
  return 'medium'; // Default
};

const logError = async (errorDetails: ErrorDetails) => {
  try {
    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      errorDetails.userId = user.id;
    }

    // Generate unique session ID for grouping errors
    const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', sessionId);
    }

    // Log to error_logs table
    await supabase.from('error_logs').insert({
      error_message: errorDetails.message,
      error_stack: errorDetails.stack,
      error_type: errorDetails.errorType,
      severity: errorDetails.severity,
      page_route: errorDetails.page,
      session_id: sessionId,
      user_id: errorDetails.userId,
      browser: getBrowser(),
      device_type: getDeviceType(),
      metadata: {
        userAgent: errorDetails.userAgent,
        timestamp: new Date().toISOString(),
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    });

    // Console log for development
    logger.error('[ErrorTracking]', errorDetails);
  } catch (err) {
    // Fail silently to avoid recursive errors
    logger.error('[ErrorTracking] Failed to log error:', err);
  }
};

const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
};

const getDeviceType = (): string => {
  const width = window.innerWidth;
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
};