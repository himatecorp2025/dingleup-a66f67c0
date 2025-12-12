import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCountryFromTimezone } from '@/lib/utils';
import { logger } from '@/lib/logger';

/**
 * Automatically detects and saves user's device timezone to profile
 * Runs once on app initialization for authenticated users
 */
export function useTimezoneDetection() {
  useEffect(() => {
    const detectAndSaveTimezone = async () => {
      try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Detect device timezone using native browser API
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (!detectedTimezone) {
          logger.warn('[TIMEZONE] Could not detect timezone, using default');
          return;
        }

        logger.log('[TIMEZONE] Detected timezone:', detectedTimezone);

        // Derive country from timezone
        const derivedCountry = getCountryFromTimezone(detectedTimezone);
        logger.log('[TIMEZONE] Derived country from timezone:', derivedCountry);

        // Get current profile timezone and country
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('user_timezone, country_code')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('[TIMEZONE] Error fetching profile:', fetchError);
          return;
        }

        // Update both timezone and country if either has changed
        const needsUpdate = 
          !profile?.user_timezone || 
          profile.user_timezone !== detectedTimezone ||
          !profile?.country_code ||
          profile.country_code !== derivedCountry;

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              user_timezone: detectedTimezone,
              country_code: derivedCountry,
              preferred_country: derivedCountry
            })
            .eq('id', user.id);

          if (updateError) {
            logger.error('[TIMEZONE] Error updating timezone/country:', updateError);
          } else {
            logger.log('[TIMEZONE] Timezone and country saved successfully:', {
              timezone: detectedTimezone,
              country: derivedCountry
            });
          }
        } else {
          logger.log('[TIMEZONE] Timezone and country already up to date');
        }
      } catch (error) {
        logger.error('[TIMEZONE] Error in timezone detection:', error);
      }
    };

    detectAndSaveTimezone();
  }, []);
}
