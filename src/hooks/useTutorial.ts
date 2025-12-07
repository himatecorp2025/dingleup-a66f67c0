import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TutorialRoute = 
  | 'dashboard' 
  | 'profile' 
  | 'play' 
  | 'landing'
  | 'coin-shop';

interface TutorialState {
  [key: string]: boolean;
}

const TUTORIAL_STORAGE_KEY = 'dingleup_tutorial_seen';
const TUTORIAL_SYNC_FLAG = 'dingleup_tutorial_synced';

export const useTutorial = (route: TutorialRoute) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkTutorialStatus();
  }, [route]);

  // Fetch tutorial progress from backend and sync with localStorage
  const syncTutorialProgressFromBackend = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[TUTORIAL] No user logged in, using localStorage only');
        return;
      }

      // Check if we already synced recently (within the last 5 minutes)
      const lastSyncTime = localStorage.getItem(TUTORIAL_SYNC_FLAG);
      const now = Date.now();
      if (lastSyncTime && (now - parseInt(lastSyncTime)) < 5 * 60 * 1000) {
        console.log('[TUTORIAL] Recently synced, skipping backend fetch');
        return;
      }

      console.log('[TUTORIAL] Syncing tutorial progress from backend...');
      const { data, error } = await supabase.functions.invoke('get-tutorial-progress');

      if (error) {
        console.error('[TUTORIAL] Failed to fetch from backend:', error);
        return;
      }

      if (data?.progress) {
        // Merge backend data with localStorage (backend is source of truth)
        const backendProgress = data.progress;
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(backendProgress));
        localStorage.setItem(TUTORIAL_SYNC_FLAG, now.toString());
        console.log('[TUTORIAL] ✓ Synced from backend:', backendProgress);
      }
    } catch (error) {
      console.error('[TUTORIAL] Error syncing from backend:', error);
    }
  };

  const checkTutorialStatus = async () => {
    // First, sync from backend (if user is logged in)
    await syncTutorialProgressFromBackend();

    // Then check localStorage
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    const tutorialState: TutorialState = stored ? JSON.parse(stored) : {};
    
    if (!tutorialState[route]) {
      // Add a small delay to ensure the page has fully rendered
      setTimeout(() => {
        setIsVisible(true);
      }, 500);
    }
  };

  const nextStep = (totalSteps: number) => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeTutorial = () => {
    // CRITICAL: Immediately mark as seen BEFORE hiding to prevent re-appearance
    markTutorialAsSeen();
    setIsVisible(false);
    setCurrentStep(0);
  };

  const markTutorialAsSeen = async () => {
    try {
      // STEP 1: Save to localStorage immediately (optimistic update)
      const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      const tutorialState: TutorialState = stored ? JSON.parse(stored) : {};
      tutorialState[route] = true;
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialState));
      
      // CRITICAL: Double-check that it was actually saved
      const verification = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!verification || !JSON.parse(verification)[route]) {
        console.error('[TUTORIAL] Failed to save tutorial state, retrying...');
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialState));
      }

      // STEP 2: Save to backend (async, don't block UI)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log(`[TUTORIAL] Saving tutorial '${route}' to backend for user ${user.id}`);
        const { error } = await supabase.functions.invoke('mark-tutorial-completed', {
          body: { route }
        });

        if (error) {
          console.error('[TUTORIAL] Failed to save to backend:', error);
          // Don't throw - localStorage is already saved, backend is just for sync
        } else {
          console.log(`[TUTORIAL] ✓ Tutorial '${route}' saved to backend`);
          // Invalidate sync flag so next page load will fetch fresh data
          localStorage.removeItem(TUTORIAL_SYNC_FLAG);
        }
      }
    } catch (error) {
      console.error('[TUTORIAL] Error saving tutorial state:', error);
    }
  };

  const resetTutorial = () => {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    const tutorialState: TutorialState = stored ? JSON.parse(stored) : {};
    tutorialState[route] = false;
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialState));
    setCurrentStep(0);
    setIsVisible(true);
  };

  return {
    isVisible,
    currentStep,
    nextStep,
    prevStep,
    closeTutorial,
    resetTutorial,
    setCurrentStep
  };
};
