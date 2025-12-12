// Archive analytics data older than 90 days
// Run monthly via cron or manually from admin
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    console.log('[archive-analytics] Starting 90-day analytics archival...');
    const startTime = Date.now();

    const { data, error } = await supabase.rpc('archive_old_analytics_data');
    
    if (error) {
      console.error('[archive-analytics] Error:', error);
      throw error;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[archive-analytics] ✅ Archived in ${elapsed}ms:`, data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        elapsed_ms: elapsed,
        ...data
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[archive-analytics] Failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
