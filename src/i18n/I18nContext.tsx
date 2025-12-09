import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LangCode, TranslationMap, I18nContextValue } from './types';
import { VALID_LANGUAGES, DEFAULT_LANG, SOURCE_LANG, STORAGE_KEY } from './constants';
import { ALLOWED_LANGS } from '@/lib/i18n/langMapping';
import { resolveInitialLang } from '@/lib/i18n/resolveInitialLang';

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

const CACHE_KEY_PREFIX = 'dingleup_translations_';
const CACHE_VERSION_KEY = 'dingleup_translations_version';
const CACHE_VERSION = '2.3'; // Force cache refresh - removed lootbox/like legacy keys
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedTranslations {
  translations: TranslationMap;
  timestamp: number;
  version: string;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // Use optional queryClient - may not be available if I18nProvider wraps QueryClientProvider
  let queryClient;
  try {
    queryClient = useQueryClient();
  } catch {
    // QueryClient not available yet - this is OK during initial app setup
    queryClient = null;
  }
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const getCacheKey = (targetLang: LangCode) => `${CACHE_KEY_PREFIX}${targetLang}`;

  const getCachedTranslations = (targetLang: LangCode): TranslationMap | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(targetLang));
      if (!cached) return null;

      const data: CachedTranslations = JSON.parse(cached);
      const now = Date.now();
      
      // Check version first - if version changed, invalidate cache
      if (data.version !== CACHE_VERSION) {
        localStorage.removeItem(getCacheKey(targetLang));
        return null;
      }
      
      // Check if cache is still valid (within TTL)
      if (now - data.timestamp > CACHE_TTL) {
        localStorage.removeItem(getCacheKey(targetLang));
        return null;
      }

      return data.translations;
    } catch (error) {
      console.error('[I18n] Cache read error:', error);
      return null;
    }
  };

  const setCachedTranslations = (targetLang: LangCode, translations: TranslationMap) => {
    try {
      const data: CachedTranslations = {
        translations,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(getCacheKey(targetLang), JSON.stringify(data));
    } catch (error) {
      console.error('[I18n] Cache write error:', error);
    }
  };

  const fetchTranslations = async (targetLang: LangCode): Promise<TranslationMap> => {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        console.error('[I18n] VITE_SUPABASE_URL not configured');
        return {};
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-translations?lang=${targetLang}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(anonKey ? { 'Authorization': `Bearer ${anonKey}` } : {})
          }
        }
      );

      if (!response.ok) {
        console.error('[I18n] Fetch failed:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const fetchedTranslations = data?.translations || {};
      
      console.log('[I18n] Fetched', Object.keys(fetchedTranslations).length, 'translations for', targetLang);
      
      // Cache the fetched translations
      setCachedTranslations(targetLang, fetchedTranslations);
      
      return fetchedTranslations;
    } catch (error) {
      console.error('[I18n] Failed to fetch translations:', error);
      return {};
    }
  };


  const initializeLanguage = async () => {
    try {
      // Clear old cache versions immediately
      const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      if (storedVersion !== CACHE_VERSION) {
        // Clear all translation caches
        VALID_LANGUAGES.forEach(lang => {
          localStorage.removeItem(getCacheKey(lang));
        });
        localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      }

      // OPTIMIZATION: Check localStorage FIRST - no async calls needed
      let targetLang: LangCode = DEFAULT_LANG;
      
      const storedLang = localStorage.getItem(STORAGE_KEY);
      if (storedLang && ALLOWED_LANGS.includes(storedLang as LangCode)) {
        // Use stored language from localStorage (immediate, no database query needed)
        targetLang = storedLang as LangCode;
        console.log('[I18n] Using stored language from localStorage:', targetLang);
      }

      setLangState(targetLang);

      // OPTIMIZATION: Check cache FIRST for instant render
      const cachedTranslations = getCachedTranslations(targetLang);
      if (cachedTranslations && Object.keys(cachedTranslations).length > 100) {
        // Cache hit - instant render, no blocking
        setTranslations(cachedTranslations);
        setIsLoading(false);
        
        // Background refresh (don't block UI)
        fetchTranslations(targetLang).then(freshTranslations => {
          if (Object.keys(freshTranslations).length > 0) {
            setTranslations(freshTranslations);
          }
        });

        // DEFERRED: Check user profile for language preference AFTER UI is ready
        if (!storedLang) {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              supabase
                .from('profiles')
                .select('preferred_language')
                .eq('id', user.id)
                .single()
                .then(({ data: profile }) => {
                  if (profile?.preferred_language && profile.preferred_language !== targetLang) {
                    const newLang = resolveInitialLang({ 
                      loggedInUserPreferredLanguage: profile.preferred_language 
                    });
                    if (newLang !== targetLang) {
                      setLang(newLang, true);
                    }
                  }
                });
            }
          });
        }
      } else {
        // Cache miss - fetch translations (still fast with edge function cache)
        console.log('[I18n] Cache miss, fetching translations for:', targetLang);
        const trans = await fetchTranslations(targetLang);
        if (Object.keys(trans).length > 0) {
          setTranslations(trans);
          console.log('[I18n] Translations loaded:', Object.keys(trans).length, 'keys');
        } else {
          console.error('[I18n] No translations returned from edge function!');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[I18n] Language initialization failed:', error);
      // Fallback to default (en) with cache check
      setLangState(DEFAULT_LANG);
      const cachedTranslations = getCachedTranslations(DEFAULT_LANG);
      if (cachedTranslations && Object.keys(cachedTranslations).length > 0) {
        setTranslations(cachedTranslations);
      } else {
        const trans = await fetchTranslations(DEFAULT_LANG);
        setTranslations(trans);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeLanguage();

    // Listen for auth state changes - only reinitialize on actual login/logout,
    // NOT on USER_UPDATED to prevent language switching during data refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Re-initialize language for the newly logged-in user
        initializeLanguage();
      } else if (event === 'SIGNED_OUT') {
        // On logout, reset to English default
        setLangState('en');
        localStorage.setItem(STORAGE_KEY, 'en');
      }
      // Explicitly NOT handling USER_UPDATED to keep language stable during data refreshes
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setLang = async (newLang: LangCode, skipDbUpdate = false) => {
    if (!ALLOWED_LANGS.includes(newLang)) {
      console.warn(`[I18n] Invalid language code: ${newLang}`);
      return;
    }

    try {
      console.log(`[I18n] Language change initiated: ${lang} -> ${newLang}`);
      
      // Update state and localStorage immediately
      setLangState(newLang);
      localStorage.setItem(STORAGE_KEY, newLang);

      // Try to load from cache first (instant language switch)
      const cachedTranslations = getCachedTranslations(newLang);
      if (cachedTranslations && Object.keys(cachedTranslations).length > 0) {
        setTranslations(cachedTranslations);
        setIsLoading(false);
        
        // Fetch fresh translations in background
        fetchTranslations(newLang).then(freshTranslations => {
          if (Object.keys(freshTranslations).length > 0) {
            setTranslations(freshTranslations);
          }
        });
      } else {
        // No cache - show loading and fetch
        setIsLoading(true);
        const trans = await fetchTranslations(newLang);
        setTranslations(trans);
        setIsLoading(false);
      }

      // CRITICAL: Invalidate all language-dependent queries
      // This forces React Query to refetch all cached data with the new language
      if (queryClient) {
        console.log('[I18n] Invalidating language-dependent query cache...');
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            // Invalidate queries that might contain language-dependent data
            const key = query.queryKey[0] as string;
            return key === 'user-game-profile' || 
                   key === 'profile' || 
                   key === 'wallet' ||
                   key === 'questions' ||
                   key === 'leaderboard';
          }
        });
        console.log('[I18n] Query cache invalidated');
      }

      // Update database (await to ensure consistency)
      if (!skipDbUpdate) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ preferred_language: newLang })
            .eq('id', user.id);
          console.log(`[I18n] Database updated with preferred_language: ${newLang}`);
        }
      }
      
      console.log(`[I18n] ✓ Language change complete: ${newLang}`);
    } catch (error) {
      console.error('[I18n] Failed to change language:', error);
      setIsLoading(false);
    }
  };

  const t = (key: string): string => {
    // The edge function already returns the correct language with fallback to Hungarian
    // So we just need to return the value directly from the translations map
    const value = translations[key];
    
    if (value && value.trim() !== '') {
      return value;
    }

    // Log missing translation in development
    if (import.meta.env.DEV) {
      console.warn(`[I18n] Missing translation for key: ${key} (lang: ${lang})`);
    }

    // Return key itself as last resort (debug mode)
    return key;
  };

  const value: I18nContextValue = {
    lang,
    translations,
    t,
    setLang,
    isLoading
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export default I18nContext;
