import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * VERIFY COIN PURCHASE
 * 
 * Verifies Stripe payment and credits coins to user wallet.
 * Called from PaymentSuccess page with session_id.
 */

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("Missing session_id");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    const userId = session.metadata?.user_id;
    const coinQuantity = parseInt(session.metadata?.coin_quantity || '0', 10);

    if (!userId || coinQuantity <= 0) {
      throw new Error("Invalid session metadata");
    }

    // Check if already credited (idempotency)
    const { data: existingCredit } = await supabaseAdmin
      .from('wallet_ledger')
      .select('id')
      .eq('correlation_id', `coin_purchase_${session_id}`)
      .maybeSingle();

    if (existingCredit) {
      console.log(`[verify-coin-purchase] Already credited for session ${session_id}`);
      return new Response(JSON.stringify({ 
        success: true, 
        alreadyCredited: true,
        coinsAdded: coinQuantity 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Credit coins using RPC
    const { error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_delta_coins: coinQuantity,
      p_source: 'coin_purchase',
      p_idempotency_key: `coin_purchase_${session_id}`,
      p_metadata: { 
        stripe_session_id: session_id,
        amount_paid_cents: session.amount_total 
      }
    });

    if (creditError) {
      console.error('[verify-coin-purchase] Credit error:', creditError);
      throw new Error('Failed to credit coins');
    }

    console.log(`[verify-coin-purchase] Credited ${coinQuantity} coins to user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      coinsAdded: coinQuantity 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[verify-coin-purchase] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
