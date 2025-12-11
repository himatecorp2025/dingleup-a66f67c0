import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardCompleteRequest {
  rewardSessionId: string;
  watchedVideoIds: string[];
  eventType: 'daily_gift' | 'end_game' | 'refill';
  originalReward?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RewardCompleteRequest = await req.json();
    const { rewardSessionId, watchedVideoIds, eventType, originalReward = 0 } = body;

    console.log(`[reward-complete] User ${userId}, session: ${rewardSessionId}, watched: ${watchedVideoIds.length}`);

    // Use session ID as idempotency key
    const idempotencyKey = `reward-${rewardSessionId}`;

    // Check idempotency - prevent double claims
    const { data: existingClaim } = await supabaseClient
      .from('wallet_ledger')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingClaim) {
      console.log(`[reward-complete] Already claimed: ${rewardSessionId}`);
      return new Response(
        JSON.stringify({ success: true, already_claimed: true, reward: { coinsDelta: 0, livesDelta: 0 } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine required ads and validate
    const requiredAds = eventType === 'refill' ? 2 : 1;
    
    if (watchedVideoIds.length < requiredAds) {
      console.log(`[reward-complete] Insufficient videos watched: ${watchedVideoIds.length} < ${requiredAds}`);
      return new Response(
        JSON.stringify({ success: false, error: 'INSUFFICIENT_VIDEOS_WATCHED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate reward based on event type
    let coinsToCredit = 0;
    let livesToCredit = 0;

    if (eventType === 'refill') {
      // Refill: fixed 500 coins + 5 lives
      coinsToCredit = 500;
      livesToCredit = 5;
    } else if (eventType === 'daily_gift' || eventType === 'end_game') {
      // DOUBLING: Credit the DOUBLED amount (original × 2)
      // User watches video to DOUBLE their reward
      coinsToCredit = originalReward * 2;
      livesToCredit = 0;
    }

    console.log(`[reward-complete] Crediting ${coinsToCredit} coins, ${livesToCredit} lives`);

    // Log impressions for watched videos
    for (let i = 0; i < watchedVideoIds.length; i++) {
      await supabaseClient
        .from('creator_video_impressions')
        .insert({
          creator_video_id: watchedVideoIds[i],
          viewer_user_id: userId,
          context: eventType,
          watched_full_15s: true,
          is_relevant_viewer: false,
          sequence_position: i + 1,
        });
    }

    // Credit wallet with idempotency
    const { error: walletError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: userId,
        delta_coins: coinsToCredit,
        delta_lives: livesToCredit,
        source: `video_reward_${eventType}`,
        idempotency_key: idempotencyKey,
        metadata: {
          reward_session_id: rewardSessionId,
          event_type: eventType,
          original_reward: originalReward,
          watched_video_ids: watchedVideoIds,
        },
      });

    if (walletError) {
      console.error('[reward-complete] Wallet ledger error:', walletError);
      return new Response(
        JSON.stringify({ error: 'Failed to credit reward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile balance directly
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('coins, lives, max_lives')
      .eq('id', userId)
      .single();

    if (profile) {
      const newCoins = (profile.coins || 0) + coinsToCredit;
      // Lives can exceed max_lives when rewarded
      const newLives = (profile.lives || 0) + livesToCredit;

      await supabaseClient
        .from('profiles')
        .update({
          coins: newCoins,
          lives: newLives,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    // Mark session as completed (if table exists)
    await supabaseClient
      .from('reward_sessions')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        watched_video_ids: watchedVideoIds,
      })
      .eq('id', rewardSessionId);

    return new Response(
      JSON.stringify({
        success: true,
        reward: {
          coinsDelta: coinsToCredit,
          livesDelta: livesToCredit,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reward-complete] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
