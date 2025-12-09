import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollBehaviorManager } from "@/components/ScrollBehaviorManager";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useWebVitals } from "@/hooks/useWebVitals";
import { useErrorTracking } from "@/hooks/useErrorTracking";
import { usePWAInstallTracking } from "@/hooks/usePWAInstallTracking";
import { lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { OfflineDetector } from "@/components/OfflineDetector";
import { UpdatePrompt } from "@/components/UpdatePrompt";

import { useBackButton } from "@/hooks/useBackButton";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { AppRouteGuard } from "@/components/AppRouteGuard";
import { AudioPolicyManager } from "@/components/AudioPolicyManager";
import { useI18n } from "@/i18n";
import { useTimezoneDetection } from "@/hooks/useTimezoneDetection";
import loadingLogo from '@/assets/dingleup-loading-logo.png';

// Eager load only landing page for instant initial render
import Index from "./pages/Index";

// Lazy load all other pages for optimal bundle splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RegisterNew = lazy(() => import("./pages/RegisterNew"));
const LoginNew = lazy(() => import("./pages/LoginNew"));
const ForgotPin = lazy(() => import("./pages/ForgotPin"));
const Game = lazy(() => import("./pages/Game"));
const GameRules = lazy(() => import("./pages/GameRules"));
const Profile = lazy(() => import("./pages/Profile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const RegistrationSuccess = lazy(() => import("./pages/RegistrationSuccess"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const Invitation = lazy(() => import("./pages/Invitation"));
const About = lazy(() => import("./pages/About"));


// Lazy load admin pages
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAgeStatistics = lazy(() => import("./pages/AdminAgeStatistics"));
const AdminTranslations = lazy(() => import("./pages/AdminTranslations"));
const AdminLegalDocuments = lazy(() => import("./pages/AdminLegalDocuments"));
const ASZF = lazy(() => import("./pages/ASZF"));
const Adatkezeles = lazy(() => import("./pages/Adatkezeles"));

const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const RetentionDashboard = lazy(() => import("./pages/RetentionDashboard"));
const MonetizationDashboard = lazy(() => import("./pages/MonetizationDashboard"));
const PerformanceDashboard = lazy(() => import("./pages/PerformanceDashboard"));
const EngagementDashboard = lazy(() => import("./pages/EngagementDashboard"));
const UserJourneyDashboard = lazy(() => import("./pages/UserJourneyDashboard"));
const PopularContent = lazy(() => import("./pages/PopularContent"));
const AdminPopularContent = lazy(() => import("./pages/AdminPopularContent"));
const ProfileGame = lazy(() => import("./pages/ProfileGame"));
const AdminGameProfiles = lazy(() => import("./pages/AdminGameProfiles"));
const AdminGameProfileDetail = lazy(() => import("./pages/AdminGameProfileDetail"));
const AdminAdInterests = lazy(() => import("./pages/AdminAdInterests"));
const AdminBoosterTypes = lazy(() => import("./pages/AdminBoosterTypes"));
const AdminBoosterPurchases = lazy(() => import("./pages/AdminBoosterPurchases"));
const AdminQuestionPools = lazy(() => import("./pages/AdminQuestionPools"));
const AdminManualCredit = lazy(() => import("./pages/AdminManualCredit"));
const AdminPlayerBehaviors = lazy(() => import("./pages/AdminPlayerBehaviors"));

const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component - uses fixed positioning to not affect layout
const PageLoader = () => (
  <div className="fixed inset-0 bg-black z-50">
    {/* Silent loading - no visible text or spinner for seamless transition */}
  </div>
);

// Optimized QueryClient with aggressive caching for mobile performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep cached data in memory
      retry: 1, // Reduce retries for faster failures on mobile
      refetchOnWindowFocus: false, // Disable refetch on focus for mobile
      refetchOnReconnect: true, // Refetch when connection restored
      refetchOnMount: false, // Use cached data on mount when available
    },
  },
});

// Analytics, Error Tracking, and PWA Install tracking wrapper component
const AppWithAnalytics = () => {
  useAnalytics();
  useWebVitals(); // Track Core Web Vitals performance
  useErrorTracking(); // Track and log errors
  usePWAInstallTracking(); // Track PWA install events
  return null;
};

// Main App component with lifecycle management
const AppCore = () => {
  // Automatic timezone detection for authenticated users
  useTimezoneDetection();

  // App lifecycle management
  useAppLifecycle({
    onForeground: () => {
      // Reserved for future use
    },
    onBackground: () => {
      // Reserved for future use
    },
  });

  return (
    <>
      <Toaster />
      <Sonner />
      <OfflineDetector />
      <UpdatePrompt />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        
        <BackButtonHandler />
        <SessionMonitorWrapper />
        <AppWithAnalytics />
        <ScrollBehaviorManager />
        <AudioPolicyManager />
        <Suspense fallback={<PageLoader />}>
            <AppRouteGuard>
            <Routes>
              {/* Public routes - no ErrorBoundary needed */}
              <Route path="/" element={<Index />} />
              <Route path="/desktop" element={<Index />} />
              
              {/* New simplified auth routes - choice removed, direct login */}
              <Route path="/auth/login" element={<LoginNew />} />
              <Route path="/auth/register" element={<RegisterNew />} />
              <Route path="/auth/forgot-pin" element={<ForgotPin />} />
              
              {/* Protected routes wrapped in ErrorBoundary */}
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
              <Route path="/leaderboard" element={<ErrorBoundary><Leaderboard /></ErrorBoundary>} />
              <Route path="/game" element={<GameErrorBoundary><Game /></GameErrorBoundary>} />
              <Route path="/game-rules" element={<ErrorBoundary><GameRules /></ErrorBoundary>} />
              <Route path="/registration-success" element={<ErrorBoundary><RegistrationSuccess /></ErrorBoundary>} />
              <Route path="/install" element={<ErrorBoundary><InstallApp /></ErrorBoundary>} />
              <Route path="/invitation" element={<ErrorBoundary><Invitation /></ErrorBoundary>} />
              <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
              
              <Route path="/popular-content" element={<ErrorBoundary><PopularContent /></ErrorBoundary>} />
              <Route path="/profile/game" element={<ErrorBoundary><ProfileGame /></ErrorBoundary>} />
              
              {/* Admin routes wrapped in ErrorBoundary */}
            <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
              <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
              <Route path="/admin/translations" element={<ErrorBoundary><AdminTranslations /></ErrorBoundary>} />
              <Route path="/admin/advanced-analytics" element={<ErrorBoundary><AdvancedAnalytics /></ErrorBoundary>} />
              <Route path="/admin/retention" element={<ErrorBoundary><RetentionDashboard /></ErrorBoundary>} />
              <Route path="/admin/monetization" element={<ErrorBoundary><MonetizationDashboard /></ErrorBoundary>} />
              <Route path="/admin/performance" element={<ErrorBoundary><PerformanceDashboard /></ErrorBoundary>} />
              <Route path="/admin/engagement" element={<ErrorBoundary><EngagementDashboard /></ErrorBoundary>} />
              <Route path="/admin/user-journey" element={<ErrorBoundary><UserJourneyDashboard /></ErrorBoundary>} />
              <Route path="/admin/popular-content" element={<ErrorBoundary><AdminPopularContent /></ErrorBoundary>} />
              <Route path="/admin/game-profiles" element={<ErrorBoundary><AdminGameProfiles /></ErrorBoundary>} />
              <Route path="/admin/game-profiles/:userId" element={<ErrorBoundary><AdminGameProfileDetail /></ErrorBoundary>} />
              <Route path="/admin/ad-interests" element={<ErrorBoundary><AdminAdInterests /></ErrorBoundary>} />
              <Route path="/admin/booster-types" element={<ErrorBoundary><AdminBoosterTypes /></ErrorBoundary>} />
              <Route path="/admin/booster-purchases" element={<ErrorBoundary><AdminBoosterPurchases /></ErrorBoundary>} />
              <Route path="/admin/question-pools" element={<ErrorBoundary><AdminQuestionPools /></ErrorBoundary>} />
              <Route path="/admin/manual-credit" element={<ErrorBoundary><AdminManualCredit /></ErrorBoundary>} />
              <Route path="/admin/player-behaviors" element={<ErrorBoundary><AdminPlayerBehaviors /></ErrorBoundary>} />
              <Route path="/admin/age-statistics" element={<ErrorBoundary><AdminAgeStatistics /></ErrorBoundary>} />
              <Route path="/admin/legal-documents" element={<ErrorBoundary><AdminLegalDocuments /></ErrorBoundary>} />
              <Route path="/admin/profile" element={<ErrorBoundary><AdminProfile /></ErrorBoundary>} />
              
              {/* Legal pages */}
              <Route path="/aszf" element={<ASZF />} />
              <Route path="/adatkezeles" element={<Adatkezeles />} />
              
              {/* 404 fallback */}
              <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
            </Routes>
          </AppRouteGuard>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

// Wrapper components for hooks requiring Router context
const BackButtonHandler = () => {
  useBackButton();
  return null;
};

const SessionMonitorWrapper = () => {
  useSessionMonitor();
  return null;
};

// Splash screen while translations load - optimized for perfect centering
const SplashScreen = () => (
  <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] flex items-center justify-center overflow-hidden">
    <img 
      src={loadingLogo} 
      alt="DingleUP!" 
      className="w-32 h-32 object-contain animate-pulse"
      loading="eager"
      fetchPriority="high"
    />
  </div>
);

// Content wrapper that checks i18n loading state
const AppContent = () => {
  const { isLoading } = useI18n();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppCore />
    </QueryClientProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
