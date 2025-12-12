import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardRequest {
  reward_type: 'daily_gift_double' | 'game_end_double' | 'refill';
  original_reward?: number; // For doubling rewards
  idempotency_key: string;
  multiplier?: number; // 1 = declined video (1× base), 2 = watched video (2× base). Default: 2
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

    const body: RewardRequest = await req.json();
    const { reward_type, original_reward = 0, idempotency_key } = body;
    // FIX: multiplier controls final reward: 1 = declined video (1×), 2 = watched video (2×)
    const multiplier = body.multiplier ?? 2;

    console.log(`[claim-video-reward] User ${userId}, type: ${reward_type}, key: ${idempotency_key}, multiplier: ${multiplier}`);

    // CRITICAL: Idempotency key includes multiplier to prevent abuse
    // (e.g., claiming 1× then trying to claim 2× with same base key)
    const finalIdempotencyKey = `${idempotency_key}:${multiplier}`;

    // Check idempotency with the full key
    const { data: existingClaim } = await supabaseClient
      .from('wallet_ledger')
      .select('id')
      .eq('idempotency_key', finalIdempotencyKey)
      .single();

    if (existingClaim) {
      console.log(`[claim-video-reward] Already claimed: ${finalIdempotencyKey}`);
      return new Response(
        JSON.stringify({ success: true, already_claimed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also check if any multiplier was already used for this base key
    const { data: anyExistingClaim } = await supabaseClient
      .from('wallet_ledger')
      .select('id')
      .like('idempotency_key', `${idempotency_key}:%`)
      .limit(1)
      .maybeSingle();

    if (anyExistingClaim) {
      console.log(`[claim-video-reward] Session already claimed with different multiplier: ${idempotency_key}`);
      return new Response(
        JSON.stringify({ success: true, already_claimed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let coinsToCredit = 0;
    let livesToCredit = 0;

    if (reward_type === 'refill') {
      // Refill only awarded if user watched video (multiplier=2)
      if (multiplier === 2) {
        const { data: rewardConfig } = await supabaseClient
          .from('video_ad_rewards')
          .select('coins_reward, lives_reward')
          .eq('id', 'refill')
          .single();

        if (rewardConfig) {
          coinsToCredit = rewardConfig.coins_reward;
          livesToCredit = rewardConfig.lives_reward;
        } else {
          coinsToCredit = 500;
          livesToCredit = 5;
        }
      }
      // multiplier=1 for refill = declined, no reward
    } else if (reward_type === 'daily_gift_double') {
      // Daily gift: base was already credited, this is the ADDITIONAL amount
      if (multiplier === 2) {
        coinsToCredit = original_reward; // Double the base
      }
      // multiplier=1 = declined, base already credited, nothing more
    } else if (reward_type === 'game_end_double') {
      // FIX: Game end reward - credit based on multiplier
      // multiplier=1: user declined video → 1× base reward
      // multiplier=2: user watched video → 2× base reward
      coinsToCredit = original_reward * multiplier;
    }

    console.log(`[claim-video-reward] Crediting ${coinsToCredit} coins, ${livesToCredit} lives`);

    // Credit wallet with multiplier-aware idempotency key
    const { error: walletError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: userId,
        delta_coins: coinsToCredit,
        delta_lives: livesToCredit,
        source: `video_ad_${reward_type}`,
        idempotency_key: finalIdempotencyKey,
        metadata: {
          reward_type,
          original_reward,
          multiplier,
        },
      });

    if (walletError) {
      console.error('[claim-video-reward] Wallet ledger error:', walletError);
      return new Response(
        JSON.stringify({ error: 'Failed to credit reward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile balance
    const { error: profileError } = await supabaseClient.rpc('credit_wallet_direct', {
      p_user_id: userId,
      p_coins: coinsToCredit,
      p_lives: livesToCredit,
    });

    // If RPC doesn't exist, update directly
    if (profileError) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('coins, lives, max_lives')
        .eq('id', userId)
        .single();

      if (profile) {
        const newCoins = (profile.coins || 0) + coinsToCredit;
        const newLives = Math.min((profile.lives || 0) + livesToCredit, (profile.max_lives || 15) + livesToCredit);

        await supabaseClient
          .from('profiles')
          .update({
            coins: newCoins,
            lives: newLives,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        coins_credited: coinsToCredit,
        lives_credited: livesToCredit,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[claim-video-reward] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
