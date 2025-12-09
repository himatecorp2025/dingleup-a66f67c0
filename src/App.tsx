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

// Eager load all pages for instant navigation
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Invitation from "./pages/Invitation";
import CoinShop from "./pages/CoinShop";
import Creators from "./pages/Creators";
import LoginNew from "./pages/LoginNew";
import RegisterNew from "./pages/RegisterNew";
import ForgotPin from "./pages/ForgotPin";
import Game from "./pages/Game";
import GameRules from "./pages/GameRules";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import InstallApp from "./pages/InstallApp";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAgeStatistics from "./pages/AdminAgeStatistics";
import AdminTranslations from "./pages/AdminTranslations";
import AdminLegalDocuments from "./pages/AdminLegalDocuments";
import ASZF from "./pages/ASZF";
import Adatkezeles from "./pages/Adatkezeles";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import RetentionDashboard from "./pages/RetentionDashboard";
import MonetizationDashboard from "./pages/MonetizationDashboard";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import EngagementDashboard from "./pages/EngagementDashboard";
import UserJourneyDashboard from "./pages/UserJourneyDashboard";
import PopularContent from "./pages/PopularContent";
import AdminPopularContent from "./pages/AdminPopularContent";
import ProfileGame from "./pages/ProfileGame";
import AdminGameProfiles from "./pages/AdminGameProfiles";
import AdminGameProfileDetail from "./pages/AdminGameProfileDetail";
import AdminAdInterests from "./pages/AdminAdInterests";
import AdminBoosterTypes from "./pages/AdminBoosterTypes";
import AdminBoosterPurchases from "./pages/AdminBoosterPurchases";
import AdminQuestionPools from "./pages/AdminQuestionPools";
import AdminManualCredit from "./pages/AdminManualCredit";
import AdminPlayerBehaviors from "./pages/AdminPlayerBehaviors";
import AdminProfile from "./pages/AdminProfile";
import NotFound from "./pages/NotFound";

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
              <Route path="/creators" element={<ErrorBoundary><Creators /></ErrorBoundary>} />
              <Route path="/coin-shop" element={<ErrorBoundary><CoinShop /></ErrorBoundary>} />
              
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
