import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LangCode = 'hu' | 'en';

const VALID_LANGUAGES: LangCode[] = ['hu', 'en'];

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL translations directly from database (no cache)
    let allTranslations: any[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data: batch, error } = await supabase
        .from('translations')
        .select('key, hu, en')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('[get-translations] DB error:', error);
        throw error;
      }

      if (!batch || batch.length === 0) break;

      allTranslations = allTranslations.concat(batch);

      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    // Build language-specific map
    const translations: Record<string, string> = {};
    
    for (const row of allTranslations) {
      const key = row.key;
      
      if (lang === 'hu') {
        if (row.hu) {
          translations[key] = row.hu;
        }
      } else {
        // English with fallback to Hungarian
        if (row.en) {
          translations[key] = row.en;
        } else if (row.hu) {
          translations[key] = row.hu;
        }
      }
    }

    console.log(`[get-translations] Serving ${Object.keys(translations).length} translations for ${lang} from DB`);

    return new Response(
      JSON.stringify({ translations }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
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