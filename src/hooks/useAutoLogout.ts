import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes (was 10)
const WARNING_TIMEOUT = 29 * 60 * 1000; // 29 minutes (60 seconds before logout)

export const useAutoLogout = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHandheldRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  const checkIfHandheld = () => {
    // Check if device is mobile/tablet (not desktop/laptop)
    const isNarrowViewport = window.matchMedia('(max-width: 1024px)').matches;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    isHandheldRef.current = isNarrowViewport && hasCoarsePointer;
    return isHandheldRef.current;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.info(t('idle.logged_out_message'));
      navigate('/auth/login');
    }
  };

  const startCountdown = () => {
    setRemainingSeconds(60);
    setShowWarning(true);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    // Only apply auto-logout on handheld devices
    if (!checkIfHandheld()) {
      return;
    }

    // Clear all timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Hide warning if showing
    setShowWarning(false);

    // Set warning timer (9 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      startCountdown();
    }, WARNING_TIMEOUT);

    // Set logout timer (10 minutes)
    timeoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  };

  const handleStayActive = () => {
    resetTimer();
  };

  useEffect(() => {
    // Check initial device type
    checkIfHandheld();

    // Only set up listeners if on handheld device
    if (!isHandheldRef.current) {
      return;
    }

    // Activity events
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Set initial timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, true);
    });

    // Listen for device changes
    const viewportMedia = window.matchMedia('(max-width: 1024px)');
    const pointerMedia = window.matchMedia('(pointer: coarse)');
    
    const handleMediaChange = () => {
      const wasHandheld = isHandheldRef.current;
      checkIfHandheld();
      
      // If switched from handheld to desktop, clear timer
      if (wasHandheld && !isHandheldRef.current && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // If switched from desktop to handheld, start timer
      else if (!wasHandheld && isHandheldRef.current) {
        resetTimer();
      }
    };

    viewportMedia.addEventListener('change', handleMediaChange);
    pointerMedia.addEventListener('change', handleMediaChange);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer, true);
      });
      viewportMedia.removeEventListener('change', handleMediaChange);
      pointerMedia.removeEventListener('change', handleMediaChange);
    };
  }, [navigate]);

  return {
    showWarning,
    remainingSeconds,
    handleStayActive
  };
};
