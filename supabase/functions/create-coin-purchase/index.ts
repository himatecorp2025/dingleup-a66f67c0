import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceeded } from '../_shared/rateLimit.ts';

/**
 * COIN PURCHASE - Stripe Checkout Session
 * 
 * Creates a Stripe Checkout session for purchasing gold coins.
 * Fixed pricing tiers
 */

// Fixed pricing tiers - must match frontend
const COIN_TIERS: Record<number, number> = {
  200: 99,    // $0.99
  300: 139,   // $1.39
  400: 179,   // $1.79
  500: 219,   // $2.19
  600: 259,   // $2.59
  700: 299,   // $2.99
  800: 339,   // $3.39
  900: 379,   // $3.79
  1000: 399,  // $3.99
  1500: 549,  // $5.49
  2000: 699,  // $6.99
  2500: 849,  // $8.49
  3000: 999,  // $9.99
  4000: 1299, // $12.99
  5000: 1499, // $14.99
};

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

    // Validate request - must be a valid tier
    const expectedPrice = COIN_TIERS[quantity];
    if (!expectedPrice) {
      throw new Error(`Invalid coin quantity: ${quantity}. Must be one of: ${Object.keys(COIN_TIERS).join(', ')}`);
    }
    
    // Validate price matches expected tier price
    if (priceInCents !== expectedPrice) {
      console.warn(`[create-coin-purchase] Price mismatch: expected ${expectedPrice}, got ${priceInCents}`);
      throw new Error("Price validation failed");
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
