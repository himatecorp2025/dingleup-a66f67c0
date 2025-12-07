import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * FIZETÉS VERIFIKÁCIÓ ÉS JUTALOM JÓVÁÍRÁS
 * 
 * Ellenőrzi a Stripe PaymentIntent státuszát és jóváírja a jutalmat.
 * Csak akkor ír jóvá, ha a fizetés sikeres és még nem történt meg.
 */

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      throw new Error("Missing paymentIntentId");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // PaymentIntent lekérése
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    // User ID ellenőrzése
    if (paymentIntent.metadata.user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    const productType = paymentIntent.metadata.product_type;

    // Idempotencia: ellenőrizzük, hogy már jóváírtuk-e
    const { data: existingPurchase } = await supabaseClient
      .from('booster_purchases')
      .select('id')
      .eq('iap_transaction_id', paymentIntentId)
      .single();

    if (existingPurchase) {
      console.log(`[verify-payment-intent] Already processed: ${paymentIntentId}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already processed',
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Jutalom jóváírása terméktípus alapján
    let goldGranted = 0;
    let livesGranted = 0;
    let speedTokensGranted = 0;
    let lootboxesGranted = 0;

    switch (productType) {
      case 'coins': {
        const coinQuantity = parseInt(paymentIntent.metadata.coin_quantity || '0');
        if (coinQuantity <= 0) throw new Error("Invalid coin quantity");
        
        goldGranted = coinQuantity;

        // Credit coins using RPC
        const { error: creditError } = await supabaseClient.rpc('credit_wallet', {
          p_user_id: user.id,
          p_delta_coins: coinQuantity,
          p_source: 'coin_purchase',
          p_idempotency_key: `coin_purchase_${paymentIntentId}`,
          p_metadata: { 
            stripe_payment_intent_id: paymentIntentId,
            amount_paid_cents: paymentIntent.amount 
          }
        });

        if (creditError) throw creditError;
        console.log(`[verify-payment-intent] Credited ${coinQuantity} coins to user ${user.id}`);
        break;
      }

      case 'lootbox': {
        const boxes = parseInt(paymentIntent.metadata.boxes || '1');
        lootboxesGranted = boxes;
        
        // Lootbox instances létrehozása
        const lootboxInserts = Array.from({ length: boxes }, () => ({
          user_id: user.id,
          status: 'stored',
          source: 'purchase',
          cost_gold: 0,
        }));

        const { error: lootboxError } = await supabaseClient
          .from('lootbox_instances')
          .insert(lootboxInserts);

        if (lootboxError) throw lootboxError;
        break;
      }

      case 'speed_booster': {
        speedTokensGranted = parseInt(paymentIntent.metadata.speed_token_count || '1');
        goldGranted = parseInt(paymentIntent.metadata.gold_reward || '0');
        livesGranted = parseInt(paymentIntent.metadata.lives_reward || '0');

        // Speed tokens létrehozása
        if (speedTokensGranted > 0) {
          const speedTokenInserts = Array.from({ length: speedTokensGranted }, () => ({
            user_id: user.id,
            duration_minutes: parseInt(paymentIntent.metadata.speed_duration_min || '10'),
            source: 'purchase',
          }));

          const { error: tokenError } = await supabaseClient
            .from('speed_tokens')
            .insert(speedTokenInserts);

          if (tokenError) throw tokenError;
        }

        // Gold és lives jóváírása
        if (goldGranted > 0 || livesGranted > 0) {
          const { error: walletError } = await supabaseClient.rpc('credit_wallet', {
            p_user_id: user.id,
            p_delta_coins: goldGranted,
            p_delta_lives: livesGranted,
            p_source: 'speed_booster_purchase',
            p_idempotency_key: paymentIntentId,
          });

          if (walletError) throw walletError;
        }
        break;
      }

      case 'premium_booster': {
        // Booster type lekérése
        const { data: boosterType } = await supabaseClient
          .from('booster_types')
          .select('*')
          .eq('code', 'PREMIUM')
          .single();

        if (!boosterType) throw new Error("Premium booster type not found");

        goldGranted = boosterType.reward_gold;
        livesGranted = boosterType.reward_lives;
        speedTokensGranted = boosterType.reward_speed_count;

        // Wallet credit
        const { error: walletError } = await supabaseClient.rpc('credit_wallet', {
          p_user_id: user.id,
          p_delta_coins: goldGranted,
          p_delta_lives: livesGranted,
          p_source: 'premium_booster_purchase',
          p_idempotency_key: paymentIntentId,
        });

        if (walletError) throw walletError;

        // Speed tokens
        if (speedTokensGranted > 0) {
          const speedTokenInserts = Array.from({ length: speedTokensGranted }, () => ({
            user_id: user.id,
            duration_minutes: boosterType.reward_speed_duration_min,
            source: 'premium_booster',
          }));

          const { error: tokenError } = await supabaseClient
            .from('speed_tokens')
            .insert(speedTokenInserts);

          if (tokenError) throw tokenError;
        }

        // Pending flag
        await supabaseClient
          .from('profiles')
          .update({ has_pending_premium_booster: true })
          .eq('id', user.id);
        break;
      }

      case 'instant_rescue': {
        const gameSessionId = paymentIntent.metadata.game_session_id;
        if (!gameSessionId) throw new Error("Missing game_session_id in metadata");

        // Booster type (INSTANT_RESCUE)
        const { data: boosterType } = await supabaseClient
          .from('booster_types')
          .select('*')
          .eq('code', 'INSTANT_RESCUE')
          .single();

        if (!boosterType) throw new Error("Instant rescue booster type not found");

        goldGranted = boosterType.reward_gold;
        livesGranted = boosterType.reward_lives;

        // Wallet credit
        const { error: walletError } = await supabaseClient.rpc('credit_wallet', {
          p_user_id: user.id,
          p_delta_coins: goldGranted,
          p_delta_lives: livesGranted,
          p_source: 'instant_rescue_purchase',
          p_idempotency_key: paymentIntentId,
        });

        if (walletError) throw walletError;

        // Game session frissítés
        const { error: sessionError } = await supabaseClient
          .from('game_sessions')
          .update({ 
            rescue_completed_at: new Date().toISOString(),
            pending_rescue: false,
          })
          .eq('id', gameSessionId);

        if (sessionError) throw sessionError;
        break;
      }

      default:
        throw new Error(`Unknown product type: ${productType}`);
    }

    // Purchase log rögzítése (csak ha nem coins típus, mert azt wallet_ledger-ben tároljuk)
    if (productType !== 'coins') {
      const { data: boosterTypeForLog } = await supabaseClient
        .from('booster_types')
        .select('id')
        .eq('code', productType === 'lootbox' ? 'LOOTBOX' : 
                     productType === 'speed_booster' ? 'SPEED_BOOST' : 
                     productType === 'premium_booster' ? 'PREMIUM' : 'INSTANT_RESCUE')
        .single();

      if (boosterTypeForLog) {
        await supabaseClient
          .from('booster_purchases')
          .insert({
            user_id: user.id,
            booster_type_id: boosterTypeForLog.id,
            purchase_source: 'stripe_mobile',
            iap_transaction_id: paymentIntentId,
            usd_cents_spent: paymentIntent.amount,
            gold_spent: 0,
          });
      }
    }

    console.log(`[verify-payment-intent] Success for user ${user.id}, type: ${productType}`);

    return new Response(JSON.stringify({ 
      success: true,
      goldGranted,
      livesGranted,
      speedTokensGranted,
      lootboxesGranted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[verify-payment-intent] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
