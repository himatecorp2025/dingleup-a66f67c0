import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BoosterPurchaseRequest {
  boosterCode: 'FREE' | 'GOLD_TO_LIFE' | 'LIFE_TO_GOLD';
}

interface BoosterPurchaseResponse {
  success: boolean;
  error?: string;
  balanceAfter?: {
    gold: number;
    lives: number;
    speedTokensAvailable: number;
  };
  grantedRewards?: {
    gold: number;
    lives: number;
    speedCount: number;
    speedDurationMinutes: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const body: BoosterPurchaseRequest = await req.json();
    const { boosterCode } = body;

    console.log(`[purchase-booster] User ${userId} purchasing ${boosterCode}`);

    if (boosterCode === 'FREE') {
      return await handleFreeBoosterPurchase(supabaseAdmin, userId);
    } else if (boosterCode === 'GOLD_TO_LIFE') {
      return await handleGoldToLifePurchase(supabaseAdmin, userId);
    } else if (boosterCode === 'LIFE_TO_GOLD') {
      return await handleLifeToGoldPurchase(supabaseAdmin, userId);
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown booster code" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[purchase-booster] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// FREE BOOSTER (Profile): Pay 500 gold → grant +1000 gold, +15 lives (net +500 gold, +15 lives)
async function handleFreeBoosterPurchase(supabaseAdmin: any, userId: string) {
  const priceGold = 500;
  const rewardGold = 1000;
  const rewardLives = 15;

  console.log(`[FREE] Price: ${priceGold}, Rewards: gold=${rewardGold}, lives=${rewardLives}`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("coins, lives")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const currentGold = profile.coins || 0;
  const currentLives = profile.lives || 0;

  if (currentGold < priceGold) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "NOT_ENOUGH_GOLD",
        balanceAfter: { gold: currentGold, lives: currentLives }
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const idempotencyKey = `free_booster:${userId}:${Date.now()}`;
  
  // Net delta: -500 + 1000 = +500 gold
  const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: userId,
    p_delta_coins: rewardGold - priceGold, // +500 net
    p_delta_lives: rewardLives, // +15 lives
    p_source: 'booster_purchase',
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      booster_code: 'FREE',
      price_gold: priceGold,
      reward_gold: rewardGold,
      reward_lives: rewardLives,
      purchase_context: 'PROFILE'
    }
  });

  if (creditError) {
    console.error("[FREE] credit_wallet RPC error:", creditError);
    return new Response(
      JSON.stringify({ success: false, error: "Wallet transaction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!creditResult || !creditResult.success) {
    console.error("[FREE] credit_wallet returned failure:", creditResult);
    return new Response(
      JSON.stringify({ success: false, error: creditResult?.error || "Insufficient funds" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const newGold = creditResult.new_coins;
  const newLives = creditResult.new_lives;

  // Log purchase
  await supabaseAdmin
    .from("booster_purchases")
    .insert({
      user_id: userId,
      booster_type_id: 'FREE',
      purchase_source: "GOLD",
      gold_spent: priceGold,
      usd_cents_spent: 0,
      purchase_context: "PROFILE"
    });

  // Track purchase completion
  await supabaseAdmin
    .from("conversion_events")
    .insert({
      user_id: userId,
      event_type: "purchase_complete",
      product_type: "booster",
      product_id: 'FREE',
      session_id: `session_${userId}_${Date.now()}`,
      metadata: {
        booster_code: 'FREE',
        price_gold: priceGold,
        reward_gold: rewardGold,
        reward_lives: rewardLives
      }
    });

  console.log(`[FREE] Purchase successful - net +${rewardGold - priceGold} gold, +${rewardLives} lives`);

  const response: BoosterPurchaseResponse = {
    success: true,
    balanceAfter: {
      gold: newGold,
      lives: newLives,
      speedTokensAvailable: 0
    },
    grantedRewards: {
      gold: rewardGold,
      lives: rewardLives,
      speedCount: 0,
      speedDurationMinutes: 0
    }
  };

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GOLD_TO_LIFE: Pay 500 gold → grant +5 lives (net -500 gold, +5 lives)
async function handleGoldToLifePurchase(supabaseAdmin: any, userId: string) {
  const priceGold = 500;
  const rewardLives = 5;

  console.log(`[GOLD_TO_LIFE] Price: ${priceGold} gold, Reward: ${rewardLives} lives`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("coins, lives")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const currentGold = profile.coins || 0;
  const currentLives = profile.lives || 0;

  if (currentGold < priceGold) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "NOT_ENOUGH_GOLD",
        balanceAfter: { gold: currentGold, lives: currentLives, speedTokensAvailable: 0 }
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const idempotencyKey = `gold_to_life:${userId}:${Date.now()}`;
  
  const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: userId,
    p_delta_coins: -priceGold, // -500 gold
    p_delta_lives: rewardLives, // +5 lives
    p_source: 'booster_purchase',
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      booster_code: 'GOLD_TO_LIFE',
      price_gold: priceGold,
      reward_gold: 0,
      reward_lives: rewardLives,
      purchase_context: 'INGAME'
    }
  });

  if (creditError) {
    console.error("[GOLD_TO_LIFE] credit_wallet RPC error:", creditError);
    return new Response(
      JSON.stringify({ success: false, error: "Wallet transaction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!creditResult || !creditResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: creditResult?.error || "Insufficient funds" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const newGold = creditResult.new_coins;
  const newLives = creditResult.new_lives;

  // Log purchase
  await supabaseAdmin
    .from("booster_purchases")
    .insert({
      user_id: userId,
      booster_type_id: 'GOLD_TO_LIFE',
      purchase_source: "GOLD",
      gold_spent: priceGold,
      usd_cents_spent: 0,
      purchase_context: "INGAME"
    });

  // Track conversion
  await supabaseAdmin
    .from("conversion_events")
    .insert({
      user_id: userId,
      event_type: "purchase_complete",
      product_type: "booster",
      product_id: 'GOLD_TO_LIFE',
      session_id: `session_${userId}_${Date.now()}`,
      metadata: {
        booster_code: 'GOLD_TO_LIFE',
        price_gold: priceGold,
        reward_lives: rewardLives
      }
    });

  console.log(`[GOLD_TO_LIFE] Purchase successful`);

  const response: BoosterPurchaseResponse = {
    success: true,
    balanceAfter: {
      gold: newGold,
      lives: newLives,
      speedTokensAvailable: 0
    },
    grantedRewards: {
      gold: 0,
      lives: rewardLives,
      speedCount: 0,
      speedDurationMinutes: 0
    }
  };

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// LIFE_TO_GOLD: Pay 15 lives → grant +1500 gold (net -15 lives, +1500 gold)
async function handleLifeToGoldPurchase(supabaseAdmin: any, userId: string) {
  const priceLives = 15;
  const rewardGold = 1500;

  console.log(`[LIFE_TO_GOLD] Price: ${priceLives} lives, Reward: ${rewardGold} gold`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("coins, lives")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const currentGold = profile.coins || 0;
  const currentLives = profile.lives || 0;

  if (currentLives < priceLives) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "NOT_ENOUGH_LIVES",
        balanceAfter: { gold: currentGold, lives: currentLives, speedTokensAvailable: 0 }
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const idempotencyKey = `life_to_gold:${userId}:${Date.now()}`;
  
  const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: userId,
    p_delta_coins: rewardGold, // +1500 gold
    p_delta_lives: -priceLives, // -15 lives
    p_source: 'booster_purchase',
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      booster_code: 'LIFE_TO_GOLD',
      price_lives: priceLives,
      reward_gold: rewardGold,
      reward_lives: 0,
      purchase_context: 'INGAME'
    }
  });

  if (creditError) {
    console.error("[LIFE_TO_GOLD] credit_wallet RPC error:", creditError);
    return new Response(
      JSON.stringify({ success: false, error: "Wallet transaction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!creditResult || !creditResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: creditResult?.error || "Insufficient lives" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const newGold = creditResult.new_coins;
  const newLives = creditResult.new_lives;

  // Log purchase - use lives_spent field conceptually (gold_spent=0)
  await supabaseAdmin
    .from("booster_purchases")
    .insert({
      user_id: userId,
      booster_type_id: 'LIFE_TO_GOLD',
      purchase_source: "LIVES",
      gold_spent: 0,
      usd_cents_spent: 0,
      purchase_context: "INGAME"
    });

  // Track conversion
  await supabaseAdmin
    .from("conversion_events")
    .insert({
      user_id: userId,
      event_type: "purchase_complete",
      product_type: "booster",
      product_id: 'LIFE_TO_GOLD',
      session_id: `session_${userId}_${Date.now()}`,
      metadata: {
        booster_code: 'LIFE_TO_GOLD',
        price_lives: priceLives,
        reward_gold: rewardGold
      }
    });

  console.log(`[LIFE_TO_GOLD] Purchase successful`);

  const response: BoosterPurchaseResponse = {
    success: true,
    balanceAfter: {
      gold: newGold,
      lives: newLives,
      speedTokensAvailable: 0
    },
    grantedRewards: {
      gold: rewardGold,
      lives: 0,
      speedCount: 0,
      speedDurationMinutes: 0
    }
  };

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
