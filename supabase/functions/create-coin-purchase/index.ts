import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceeded } from '../_shared/rateLimit.ts';

/**
 * COIN PURCHASE - Stripe Checkout Session
 * 
 * Creates a Stripe Checkout session for purchasing gold coins.
 * Pricing: 200 coins = $0.99 (base), +100 coins increments
 */

interface CoinPurchaseRequest {
  quantity: number; // Number of coins to purchase
  priceInCents: number; // Price in cents
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
    const rateLimitResult = await checkRateLimit(supabaseClient, 'create-coin-purchase', { maxRequests: 10, windowMinutes: 1 });
    if (!rateLimitResult.allowed) {
      return rateLimitExceeded(corsHeaders);
    }

    const body: CoinPurchaseRequest = await req.json();
    const { quantity, priceInCents } = body;

    // Validate request
    if (!quantity || quantity < 200 || !priceInCents || priceInCents < 99) {
      throw new Error("Invalid purchase request: minimum 200 coins for $0.99");
    }

    // Validate price calculation (should be ~$0.00495 per coin)
    const expectedPrice = Math.round(quantity * 0.495); // cents
    const priceDiff = Math.abs(priceInCents - expectedPrice);
    if (priceDiff > 5) { // Allow 5 cent tolerance for rounding
      console.warn(`[create-coin-purchase] Price mismatch: expected ${expectedPrice}, got ${priceInCents}`);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${quantity} Gold Coins`,
              description: `DingleUP! Gold Coins Pack`,
              images: ['https://wdpxmwsxhckazwxufttk.supabase.co/storage/v1/object/public/assets/coin-icon.png'],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/payment-success?type=coins&quantity=${quantity}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?canceled=true`,
      metadata: {
        user_id: user.id,
        product_type: 'coins',
        coin_quantity: String(quantity),
      },
    });

    console.log(`[create-coin-purchase] Checkout session created for user ${user.id}, ${quantity} coins, $${(priceInCents / 100).toFixed(2)}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-coin-purchase] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
