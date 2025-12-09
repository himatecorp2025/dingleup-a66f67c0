import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LangCode = 'hu' | 'en';

const VALID_LANGUAGES: LangCode[] = ['hu', 'en'];

// In-memory cache for translations (reduces DB queries)
const translationCache: Record<string, { data: Record<string, string>; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    // Check in-memory cache first
    const now = Date.now();
    const cached = translationCache[lang];
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('[get-translations] Cache hit for language:', lang);
      return new Response(
        JSON.stringify({ translations: cached.data }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min browser + CDN cache
          },
          status: 200
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Use service role for faster queries
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[get-translations] Fetching translations for language:', lang);

    // Fetch ALL translations - Supabase default limit is 1000, so we need pagination
    let allTranslations: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('translations')
        .select('key, hu, en')
        .range(offset, offset + batchSize - 1);
      
      if (error) {
        console.error('[get-translations] Error:', error);
        throw error;
      }
      
      if (!batch || batch.length === 0) break;
      
      allTranslations = allTranslations.concat(batch);
      
      if (batch.length < batchSize) break; // Last page
      offset += batchSize;
    }

    if (!allTranslations || allTranslations.length === 0) {
      console.log('[get-translations] No translations found');
      return new Response(
        JSON.stringify({ translations: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[get-translations] Fetched', allTranslations.length, 'translations');

    // Build translation map with fallback chain: target → en → hu
    const translationMap: Record<string, string> = {};
    
    for (const row of allTranslations) {
      const key = row.key;
      const targetLangText = (row as any)[lang] as string | null;
      const englishText = row.en as string | null;
      const hungarianText = row.hu;
      
      if (targetLangText !== null && targetLangText !== undefined) {
        translationMap[key] = targetLangText;
      } else if (englishText !== null && englishText !== undefined) {
        translationMap[key] = englishText;
      } else {
        translationMap[key] = hungarianText || key;
      }
    }

    // Store in cache
    translationCache[lang] = { data: translationMap, timestamp: now };

    console.log('[get-translations] Returning', Object.keys(translationMap).length, 'translations');

    return new Response(
      JSON.stringify({ translations: translationMap }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min browser + CDN cache
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
