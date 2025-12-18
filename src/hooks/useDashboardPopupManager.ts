import { useState, useEffect } from 'react';
import { useDailyGift } from './useDailyGift';
import { useWelcomeBonus } from './useWelcomeBonus';

/**
 * SIMPLIFIED Dashboard popup manager
 * Priority: Age Gate → Welcome Bonus → Daily Gift
 * 
 * NOTE: Daily Winners and Personal Winners have been REMOVED
 */

export interface PopupState {
  showAgeGate: boolean;
  showWelcomeBonus: boolean;
  showDailyGift: boolean;
  ageGateCompleted: boolean;
  welcomeBonusCompleted: boolean;
  dailyGiftCompleted: boolean;
}

interface PopupManagerParams {
  canMountModals: boolean;
  needsAgeVerification: boolean;
  userId: string | undefined;
  username: string | undefined;
  profileLoading: boolean;
}

export const useDashboardPopupManager = (params: PopupManagerParams) => {
  const { canMountModals, needsAgeVerification, userId, profileLoading } = params;

  // Integrate popup hooks
  const dailyGift = useDailyGift(userId, false);
  const welcomeBonus = useWelcomeBonus(userId);

  const [popupState, setPopupState] = useState<PopupState>({
    showAgeGate: false,
    showWelcomeBonus: false,
    showDailyGift: false,
    ageGateCompleted: false,
    welcomeBonusCompleted: false,
    dailyGiftCompleted: false,
  });

  // Priority 1: Age Gate
  useEffect(() => {
    if (profileLoading || !userId) return;
    
    if (!popupState.ageGateCompleted) {
      setPopupState(prev => ({
        ...prev,
        showAgeGate: needsAgeVerification,
        ageGateCompleted: !needsAgeVerification,
      }));
    }
  }, [userId, needsAgeVerification, profileLoading]);

  // Priority 2: Welcome Bonus (instant - no delay)
  useEffect(() => {
    if (!canMountModals || !userId || profileLoading) return;
    if (!popupState.ageGateCompleted || popupState.showAgeGate) return;
    
    if (welcomeBonus.canClaim && !popupState.showWelcomeBonus) {
      setPopupState(prev => ({ ...prev, showWelcomeBonus: true }));
    }
  }, [canMountModals, userId, profileLoading, popupState.ageGateCompleted, popupState.showAgeGate, welcomeBonus.canClaim, popupState.showWelcomeBonus]);

  // Priority 3: Daily Gift (instant - no delay)
  useEffect(() => {
    if (!canMountModals || !userId || profileLoading) return;
    if (!popupState.ageGateCompleted || popupState.showAgeGate || popupState.showWelcomeBonus) return;
    if (welcomeBonus.canClaim && !popupState.welcomeBonusCompleted) return;
    if (popupState.dailyGiftCompleted) return;
    
    if (dailyGift.canClaim && !popupState.showDailyGift) {
      setPopupState(prev => ({ ...prev, showDailyGift: true }));
    }
  }, [canMountModals, userId, profileLoading, popupState.ageGateCompleted, popupState.showAgeGate, popupState.showWelcomeBonus, welcomeBonus.canClaim, popupState.welcomeBonusCompleted, dailyGift.canClaim, popupState.showDailyGift, popupState.dailyGiftCompleted]);

  // Handlers
  const closeAgeGate = () => {
    setPopupState(prev => ({ ...prev, showAgeGate: false, ageGateCompleted: true }));
  };

  const closeWelcomeBonus = () => {
    setPopupState(prev => ({ ...prev, showWelcomeBonus: false, welcomeBonusCompleted: true }));
  };

  const closeDailyGift = () => {
    setPopupState(prev => ({ ...prev, showDailyGift: false, dailyGiftCompleted: true }));
  };

  return {
    popupState,
    closeAgeGate,
    closeWelcomeBonus,
    closeDailyGift,
    dailyGift: {
      canClaim: dailyGift.canClaim,
      isInitialized: dailyGift.isInitialized,
      weeklyEntryCount: dailyGift.weeklyEntryCount,
      nextReward: dailyGift.nextReward,
      claiming: dailyGift.claiming,
      claimDailyGift: dailyGift.claimDailyGift,
      checkDailyGift: dailyGift.checkDailyGift,
      handleLater: dailyGift.handleLater,
    },
    welcomeBonus: {
      claiming: welcomeBonus.claiming,
      claimWelcomeBonus: welcomeBonus.claimWelcomeBonus,
      handleLater: welcomeBonus.handleLater,
    },
  };
};
