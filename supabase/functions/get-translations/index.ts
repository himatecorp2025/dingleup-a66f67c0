import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LangCode = 'hu' | 'en';

const VALID_LANGUAGES: LangCode[] = ['hu', 'en'];

// ============================================================================
// IN-MEMORY TRANSLATION CACHE - Same pattern as question pools
// Translations are static data, loaded once and served from memory
// ============================================================================
const TRANSLATIONS_CACHE: Record<LangCode, Record<string, string>> = {
  hu: {},
  en: {}
};
let CACHE_INITIALIZED = false;
let CACHE_INIT_PROMISE: Promise<void> | null = null;

// Initialize translation cache from database (runs once per cold start)
async function initializeTranslationsCache(): Promise<void> {
  if (CACHE_INITIALIZED) return;
  if (CACHE_INIT_PROMISE) return CACHE_INIT_PROMISE;

  CACHE_INIT_PROMISE = (async () => {
    const startTime = Date.now();
    console.log('[get-translations] Initializing in-memory cache...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL translations with pagination (Supabase limit is 1000)
    let allTranslations: any[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data: batch, error } = await supabase
        .from('translations')
        .select('key, hu, en')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('[get-translations] Cache init error:', error);
        CACHE_INIT_PROMISE = null;
        throw error;
      }

      if (!batch || batch.length === 0) break;

      allTranslations = allTranslations.concat(batch);

      if (batch.length < batchSize) break; // Last page
      offset += batchSize;
    }

    // Build language-specific maps
    for (const row of allTranslations) {
      const key = row.key;
      
      // Hungarian map
      if (row.hu) {
        TRANSLATIONS_CACHE.hu[key] = row.hu;
      }
      
      // English map (with fallback to Hungarian)
      if (row.en) {
        TRANSLATIONS_CACHE.en[key] = row.en;
      } else if (row.hu) {
        TRANSLATIONS_CACHE.en[key] = row.hu; // Fallback to Hungarian
      }
    }

    CACHE_INITIALIZED = true;
    const elapsed = Date.now() - startTime;

    console.log(`[get-translations] Cache initialized in ${elapsed}ms:`, {
      total_keys: allTranslations.length,
      hu_keys: Object.keys(TRANSLATIONS_CACHE.hu).length,
      en_keys: Object.keys(TRANSLATIONS_CACHE.en).length
    });
  })();

  return CACHE_INIT_PROMISE;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get('lang') as LangCode | null;

    if (!lang || !VALID_LANGUAGES.includes(lang)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing lang parameter. Must be one of: hu, en' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize cache if needed (only runs once per cold start)
    await initializeTranslationsCache();

    // Serve from in-memory cache - ZERO database queries!
    const translations = TRANSLATIONS_CACHE[lang];
    
    console.log(`[get-translations] Serving ${Object.keys(translations).length} translations for ${lang} from memory`);

    return new Response(
      JSON.stringify({ translations }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour browser + CDN cache
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('[get-translations] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
