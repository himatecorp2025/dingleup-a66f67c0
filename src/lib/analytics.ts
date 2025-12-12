// Analytics tracking utilities for comprehensive user behavior
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Legacy analytics events for Google Analytics
export type AnalyticsEvent = 
  | 'tips_open'              // Tips & Tricks section opened
  | 'tips_play'              // Video playback started
  | 'tips_complete';         // Video playback completed

// =====================================================
// SESSION MANAGEMENT
// =====================================================

let sessionId: string | null = null;
let sessionStartTime: number | null = null;

export const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStartTime = Date.now();
    
    sessionStorage.setItem('analytics_session_id', sessionId);
    sessionStorage.setItem('analytics_session_start', sessionStartTime.toString());
  }
  return sessionId;
};

export const clearSession = () => {
  sessionId = null;
  sessionStartTime = null;
  sessionStorage.removeItem('analytics_session_id');
  sessionStorage.removeItem('analytics_session_start');
};

// Restore session on page load
const storedSessionId = sessionStorage.getItem('analytics_session_id');
const storedSessionStart = sessionStorage.getItem('analytics_session_start');
if (storedSessionId && storedSessionStart) {
  const elapsed = Date.now() - parseInt(storedSessionStart);
  if (elapsed < 30 * 60 * 1000) {
    sessionId = storedSessionId;
    sessionStartTime = parseInt(storedSessionStart);
  }
}

// =====================================================
// DEVICE INFO
// =====================================================

export const getDeviceInfo = () => ({
  screen_width: window.innerWidth,
  screen_height: window.innerHeight,
  user_agent: navigator.userAgent,
  platform: navigator.platform,
  is_mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  is_ios: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  is_android: /Android/i.test(navigator.userAgent),
  language: navigator.language,
});

// =====================================================
// NAVIGATION TRACKING
// =====================================================

export const trackPageView = async (
  userId: string,
  route: string,
  previousRoute?: string,
  metadata?: Record<string, any>
) => {
  // Analytics tracking disabled - RLS policies prevent direct inserts
  // Admin analytics are handled server-side via edge functions
  return;
};

export const trackPageExit = async (
  userId: string,
  route: string,
  timeOnPage: number,
  metadata?: Record<string, any>
) => {
  // Analytics tracking disabled - RLS policies prevent direct inserts
  // Admin analytics are handled server-side via edge functions
  return;
};

// =====================================================
// SUBSCRIPTION PROMO TRACKING
// =====================================================

export const trackPromoEvent = async (
  userId: string,
  eventType: 'shown' | 'accepted' | 'dismissed' | 'closed',
  promoType: string,
  promoData?: {
    trigger?: string;
    times_shown_before?: number;
    time_since_last_shown_seconds?: number;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await supabase.from('subscription_promo_events').insert({
      user_id: userId,
      event_type: eventType,
      promo_type: promoType,
      promo_trigger: promoData?.trigger,
      times_shown_before: promoData?.times_shown_before || 0,
      time_since_last_shown_seconds: promoData?.time_since_last_shown_seconds,
      session_id: getSessionId(),
      metadata: promoData?.metadata || {},
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track promo event:', error);
  }
};

// =====================================================
// BONUS TRACKING
// =====================================================

export const trackBonusEvent = async (
  userId: string,
  eventType: 'welcome_shown' | 'welcome_claimed' | 'daily_shown' | 'daily_claimed' | 'daily_missed',
  bonusType: 'welcome' | 'daily',
  bonusData?: {
    coins_amount?: number;
    lives_amount?: number;
    streak_day?: number;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await supabase.from('bonus_claim_events').insert({
      user_id: userId,
      event_type: eventType,
      bonus_type: bonusType,
      coins_amount: bonusData?.coins_amount || 0,
      lives_amount: bonusData?.lives_amount || 0,
      streak_day: bonusData?.streak_day,
      session_id: getSessionId(),
      metadata: bonusData?.metadata || {}
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track bonus event:', error);
  }
};

// =====================================================
// APP SESSION TRACKING
// =====================================================

export const trackAppSession = async (
  userId: string,
  eventType: 'app_opened' | 'app_closed' | 'app_backgrounded' | 'app_foregrounded' | 'tab_visible' | 'tab_hidden',
  sessionDuration?: number,
  metadata?: Record<string, any>
) => {
  // Analytics tracking disabled - RLS policies prevent direct inserts
  // Admin analytics are handled server-side via edge functions
  return;
};

// =====================================================
// GAME EXIT TRACKING
// =====================================================

export const trackGameExit = async (
  userId: string,
  eventType: 'game_started' | 'game_exit_button' | 'game_back_button' | 'game_completed' | 'game_timeout' | 'game_crash',
  gameData: {
    category: string;
    question_index: number;
    total_questions?: number;
    correct_answers?: number;
    time_played_seconds?: number;
    exit_reason?: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await supabase.from('game_exit_events').insert({
      user_id: userId,
      event_type: eventType,
      category: gameData.category,
      question_index: gameData.question_index,
      total_questions: gameData.total_questions || 15,
      correct_answers: gameData.correct_answers || 0,
      time_played_seconds: gameData.time_played_seconds,
      exit_reason: gameData.exit_reason,
      session_id: getSessionId(),
      metadata: gameData.metadata || {},
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track game exit:', error);
  }
};

// =====================================================
// CHAT TRACKING
// =====================================================

export const trackChatInteraction = async (
  userId: string,
  eventType: 'chat_opened' | 'thread_opened' | 'message_sent' | 'friend_request_sent' | 'friend_request_accepted',
  chatData?: {
    target_user_id?: string;
    thread_id?: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await supabase.from('chat_interaction_events').insert({
      user_id: userId,
      event_type: eventType,
      target_user_id: chatData?.target_user_id,
      thread_id: chatData?.thread_id,
      session_id: getSessionId(),
      metadata: chatData?.metadata || {},
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track chat interaction:', error);
  }
};

// =====================================================
// FEATURE USAGE TRACKING
// =====================================================

export const trackFeatureUsage = async (
  userId: string,
  eventType: string,
  featureName: string,
  action?: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase.from('feature_usage_events').insert({
      user_id: userId,
      event_type: eventType,
      feature_name: featureName,
      action: action,
      session_id: getSessionId(),
      metadata: metadata || {},
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track feature usage:', error);
  }
};

// =====================================================
// CONVERSION TRACKING (Purchase Funnel)
// =====================================================

export const trackConversionEvent = async (
  userId: string,
  eventType: 'product_view' | 'add_to_cart' | 'purchase_complete',
  productType?: string,
  productId?: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase.from('conversion_events').insert({
      user_id: userId,
      event_type: eventType,
      product_type: productType,
      product_id: productId,
      session_id: getSessionId(),
      metadata: metadata || {},
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track conversion event:', error);
  }
};

// =====================================================
// GAME MILESTONE TRACKING (Game Funnel)
// =====================================================

export const trackGameMilestone = async (
  userId: string,
  milestone: 'game_start' | 'question_5_reached' | 'question_10_reached' | 'game_complete',
  gameData: {
    category: string;
    question_index: number;
    correct_answers?: number;
    time_played_seconds?: number;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await supabase.from('game_exit_events').insert({
      user_id: userId,
      event_type: milestone,
      category: gameData.category,
      question_index: gameData.question_index,
      correct_answers: gameData.correct_answers || 0,
      time_played_seconds: gameData.time_played_seconds,
      session_id: getSessionId(),
      metadata: gameData.metadata || {},
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track game milestone:', error);
  }
};

// =====================================================
// PERFORMANCE TRACKING (Web Vitals)
// =====================================================

export const trackPerformanceMetric = async (
  userId: string | null,
  route: string,
  metrics: {
    loadTime: number;
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    tti?: number;
  }
) => {
  try {
    const deviceInfo = getDeviceInfo();
    const connectionInfo = (navigator as any).connection;
    
    await supabase.from('performance_metrics').insert({
      user_id: userId,
      session_id: getSessionId(),
      page_route: route,
      load_time_ms: Math.round(metrics.loadTime),
      ttfb_ms: metrics.ttfb ? Math.round(metrics.ttfb) : null,
      fcp_ms: metrics.fcp ? Math.round(metrics.fcp) : null,
      lcp_ms: metrics.lcp ? Math.round(metrics.lcp) : null,
      fid_ms: metrics.fid ? Math.round(metrics.fid) : null,
      cls: metrics.cls || null,
      tti_ms: metrics.tti ? Math.round(metrics.tti) : null,
      device_type: deviceInfo.is_mobile ? 'mobile' : 'desktop',
      browser: navigator.userAgent.match(/Chrome|Safari|Firefox|Edge|Opera/)?.[0] || 'Unknown',
      connection_type: connectionInfo?.effectiveType || null,
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track performance metric:', error);
  }
};

// =====================================================
// ERROR TRACKING
// =====================================================

export const trackError = async (
  userId: string | null,
  route: string,
  error: {
    type: string;
    message: string;
    stack?: string;
    component?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    isFatal?: boolean;
    userAction?: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    await supabase.from('error_logs').insert({
      user_id: userId,
      session_id: getSessionId(),
      page_route: route,
      error_type: error.type,
      error_message: error.message.substring(0, 500),
      error_stack: error.stack?.substring(0, 2000) || null,
      error_component: error.component || null,
      severity: error.severity || 'medium',
      is_fatal: error.isFatal || false,
      user_action: error.userAction || null,
      device_type: deviceInfo.is_mobile ? 'mobile' : 'desktop',
      browser: navigator.userAgent.match(/Chrome|Safari|Firefox|Edge|Opera/)?.[0] || 'Unknown',
      metadata: error.metadata || null,
    });
  } catch (err) {
    logger.error('[Analytics] Failed to track error:', err);
  }
};

interface AnalyticsData {
  userId?: string;
  route?: string;
  itemType?: string;
  basePrice?: number;
  discountedPrice?: number;
  discountPercent?: number;
  videoId?: string;
  videoTitle?: string;
  ts?: string;
}

/**
 * Track an analytics event
 */
export const trackEvent = (event: AnalyticsEvent, data?: AnalyticsData) => {
  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Log in development
  if (import.meta.env.DEV) {
    logger.log('[Analytics]', eventData);
  }

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, eventData);
  }

  // Can also integrate with other analytics platforms here
  // Example: Mixpanel, Amplitude, etc.
};

/**
 * Track tips video interaction
 */
export const trackTipsOpen = (userId: string) => {
  trackEvent('tips_open', { userId });
};

export const trackTipsPlay = (userId: string, videoId: string, videoTitle: string) => {
  trackEvent('tips_play', { userId, videoId, videoTitle });
};

export const trackTipsComplete = (userId: string, videoId: string, videoTitle: string) => {
  trackEvent('tips_complete', { userId, videoId, videoTitle });
};
