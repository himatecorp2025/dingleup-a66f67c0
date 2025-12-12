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

    console.log(`[claim-video-reward] User ${userId}, type: ${reward_type}, key: ${idempotency_key}`);

    // Check idempotency
    const { data: existingClaim } = await supabaseClient
      .from('wallet_ledger')
      .select('id')
      .eq('idempotency_key', idempotency_key)
      .single();

    if (existingClaim) {
      console.log(`[claim-video-reward] Already claimed: ${idempotency_key}`);
      return new Response(
        JSON.stringify({ success: true, already_claimed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let coinsToCredit = 0;
    let livesToCredit = 0;

    if (reward_type === 'refill') {
      // Get refill reward from config
      const { data: rewardConfig } = await supabaseClient
        .from('video_ad_rewards')
        .select('coins_reward, lives_reward')
        .eq('id', 'refill')
        .single();

      if (rewardConfig) {
        coinsToCredit = rewardConfig.coins_reward;
        livesToCredit = rewardConfig.lives_reward;
      } else {
        // Default values
        coinsToCredit = 500;
        livesToCredit = 5;
      }
    } else if (reward_type === 'daily_gift_double') {
      // Daily gift: credit the ADDITIONAL amount (base was already claimed)
      coinsToCredit = original_reward;
    } else if (reward_type === 'game_end_double') {
      // Game end 2×: Credit the FULL 2× amount (base NOT yet credited to DB)
      // Frontend shows base amount visually, but DB credit only happens here
      coinsToCredit = original_reward * 2;
    }

    console.log(`[claim-video-reward] Crediting ${coinsToCredit} coins, ${livesToCredit} lives`);

    // Credit wallet
    const { error: walletError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: userId,
        delta_coins: coinsToCredit,
        delta_lives: livesToCredit,
        source: `video_ad_${reward_type}`,
        idempotency_key,
        metadata: {
          reward_type,
          original_reward,
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
