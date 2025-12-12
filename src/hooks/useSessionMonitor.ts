import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

export const useSessionMonitor = () => {
  const [isValidating, setIsValidating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    // Public pages that don't require session monitoring
    const publicPaths = ['/', '/desktop', '/auth/register', '/auth/login', '/auth/forgot-pin', '/about', '/intro', '/admin/login'];
    const isPublicPage = publicPaths.some(path => location.pathname === path);
    
    // Skip session monitoring on public pages
    if (isPublicPage) {
      return;
    }

    // Only validate on visibility change (when user returns to app), not periodically
    const validateSession = async () => {
      if (isValidating) return;
      
      setIsValidating(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Only logout if there's a definitive auth error, not just missing session
        if (error && error.message?.includes('refresh_token')) {
          console.log('[SessionMonitor] Session expired, redirecting to login');
          toast({
            description: t('profile.logout'),
            variant: "destructive",
            duration: 4000,
          });
          
          await supabase.auth.signOut();
          navigate('/auth/login', { replace: true });
        }
      } catch (err) {
        // Don't logout on network errors - just log them
        console.error('[SessionMonitor] Error validating session:', err);
      } finally {
        setIsValidating(false);
      }
    };

    // Only validate when page becomes visible again (user returns from another tab/app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, location.pathname, isValidating, t]);
};
