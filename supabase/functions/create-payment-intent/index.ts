import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceeded } from '../_shared/rateLimit.ts';

/**
 * KÖZPONTI MOBILFIZETÉSI ENDPOINT
 * 
 * Stripe PaymentIntent létrehozása natív mobilfizetéshez (Apple Pay / Google Pay).
 * Támogatott terméktípusok: coins, lootbox, speed_booster, premium_booster, instant_rescue
 */

interface PaymentIntentRequest {
  productType: 'coins' | 'lootbox' | 'speed_booster' | 'premium_booster' | 'instant_rescue';
  amount: number; // cents (pl. 1490 = 14.90 HUF vagy USD)
  currency: string; // 'huf' vagy 'usd'
  metadata?: Record<string, string>; // extra adatok (pl. boxes, coin_quantity)
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(supabaseClient, 'create-payment-intent', { maxRequests: 10, windowMinutes: 1 });
    if (!rateLimitResult.allowed) {
      return rateLimitExceeded(corsHeaders);
    }

    const body: PaymentIntentRequest = await req.json();
    const { productType, amount, currency, metadata = {} } = body;

    if (!productType || !amount || !currency) {
      throw new Error("Missing required fields: productType, amount, currency");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Stripe customer keresése/létrehozása
    let customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
    }

    // PaymentIntent létrehozása
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata: {
        user_id: user.id,
        product_type: productType,
        ...metadata
      },
      // Automatikus fizetési módok (Apple Pay, Google Pay, kártya)
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`[create-payment-intent] PaymentIntent created for user ${user.id}, type: ${productType}, amount: ${amount} ${currency}`);

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-payment-intent] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
