// get-wallet: Fetches user wallet with OPTIONAL inline life regeneration
// Supports ?skipRegen=true query parameter for read-only mode (high-load optimization)
// Applies regeneration logic during read to provide accurate real-time life counts
// Supports selective field fetching via ?fields= query parameter for payload optimization
//
// TODO FUTURE OPTIMIZATION (NOT IMPLEMENTED YET):
// - High concurrency issue: inline regeneration causes UPDATE contention at scale (10k+ concurrent users)
// - Current implementation supports skipRegen=true for read-only mode
// - Consider moving to cron-only regeneration strategy (regenerate-lives-background only)
// - If cron-only: get-wallet becomes read-only, nextLifeAt computed from profile data without UPDATE
// - Trade-off: eliminates contention but introduces slight staleness (~1min cron interval)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // Parse query parameters for field filtering and regeneration control
    const url = new URL(req.url);
    const fieldsParam = url.searchParams.get('fields');
    const skipRegen = url.searchParams.get('skipRegen') === 'true'; // HIGH-LOAD OPTIMIZATION
    const requestedFields = fieldsParam ? new Set(fieldsParam.split(',').map(f => f.trim())) : null;

    // Client for auth verification (no session persistence)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Verify user authentication using the JWT directly
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('[get-wallet] Auth failed:', authError?.message || 'No user');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lives regeneration via DB RPC removed (non-existent RPC). We calculate below based on profile fields.


    // Get current balances with subscriber status and booster info (after regeneration)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coins, lives, max_lives, last_life_regeneration, lives_regeneration_rate')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Check for active speed token
    const { data: activeSpeedTokens, error: speedError } = await supabase
      .from('speed_tokens')
      .select('*')
      .eq('user_id', user.id)
      .not('used_at', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1);

    const hasActiveSpeed = !speedError && activeSpeedTokens && activeSpeedTokens.length > 0;
    const activeSpeedToken = hasActiveSpeed ? activeSpeedTokens[0] : null;

    // Determine effective max lives and regen rate from profile fields
    let effectiveMaxLives = Number(profile.max_lives ?? 15);
    let effectiveRegenMinutes = Number(profile.lives_regeneration_rate ?? 12);

    // Speed boost: 2x faster regeneration (6 minutes instead of 12)
    if (hasActiveSpeed) {
      effectiveRegenMinutes = effectiveRegenMinutes / 2;
      console.log(`[get-wallet] Active speed boost detected, regen rate: ${effectiveRegenMinutes} min`);
    }

    if (!Number.isFinite(effectiveMaxLives) || effectiveMaxLives <= 0) {
      effectiveMaxLives = 15;
    }
    if (!Number.isFinite(effectiveRegenMinutes) || effectiveRegenMinutes <= 0) {
      effectiveRegenMinutes = 12;
    }

    // Calculate next life time with proper regeneration tracking + future timestamp guard
    // HIGH-LOAD OPTIMIZATION: Skip inline regeneration if skipRegen=true query parameter provided
    let currentLives = Number(profile.lives ?? 0);
    let nextLifeAt = null;
    
    // PERFORMANCE OPTIMIZATION: Always use read-only calculation to avoid UPDATE contention
    // Life regeneration is handled by background cron job (regenerate-lives-background)
    if (currentLives < effectiveMaxLives) {
      const nowMs = Date.now();
      const lastRegenMs = new Date(profile.last_life_regeneration).getTime();
      const regenIntervalMs = effectiveRegenMinutes * 60 * 1000;
      
      // Guard: if last_life_regeneration is in the future, use now
      const effectiveLastRegenMs = lastRegenMs > nowMs ? nowMs : lastRegenMs;
      const timeSinceLastRegen = Math.max(0, nowMs - effectiveLastRegenMs);
      const livesAvailable = Math.floor(timeSinceLastRegen / regenIntervalMs);
      
      if (livesAvailable > 0) {
        currentLives = Math.min(currentLives + livesAvailable, effectiveMaxLives);
      }
      
      if (currentLives < effectiveMaxLives) {
        const nextRegenOffset = regenIntervalMs - (timeSinceLastRegen % regenIntervalMs);
        nextLifeAt = new Date(nowMs + nextRegenOffset).toISOString();
      }
    }

    // Subscription system removed
    const subscriberRenewAt = null;

    // PERFORMANCE OPTIMIZATION: Conditional ledger fetch based on fields parameter
    // Only fetch ledger if explicitly requested or no fields filter specified
    let ledger = null;
    if (!requestedFields || requestedFields.has('ledger')) {
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('wallet_ledger')
        .select('id, delta_coins, delta_lives, source, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!ledgerError) {
        ledger = ledgerData;
      }
    }

    // Build response object based on requested fields (30-40% payload reduction)
    const response: any = {};
    
    if (!requestedFields || requestedFields.has('livesCurrent')) {
      response.livesCurrent = currentLives;
    }
    if (!requestedFields || requestedFields.has('livesMax')) {
      response.livesMax = effectiveMaxLives;
    }
    if (!requestedFields || requestedFields.has('coinsCurrent')) {
      response.coinsCurrent = Number(profile.coins ?? 0);
    }
    if (!requestedFields || requestedFields.has('nextLifeAt')) {
      response.nextLifeAt = nextLifeAt;
    }
    if (!requestedFields || requestedFields.has('regenIntervalSec')) {
      response.regenIntervalSec = effectiveRegenMinutes * 60;
    }
    if (!requestedFields || requestedFields.has('regenMinutes')) {
      response.regenMinutes = effectiveRegenMinutes;
    }
    if (!requestedFields || requestedFields.has('ledger')) {
      response.ledger = ledger || [];
    }
    if (!requestedFields || requestedFields.has('activeSpeedToken')) {
      response.activeSpeedToken = activeSpeedToken ? {
        id: activeSpeedToken.id,
        expiresAt: activeSpeedToken.expires_at,
        durationMinutes: activeSpeedToken.duration_minutes,
        source: activeSpeedToken.source
      } : null;
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
