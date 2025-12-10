import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Package price IDs - these should be created in Stripe Dashboard
// For now using placeholder prices, will need to be updated with actual Stripe price IDs
const PACKAGE_PRICES: Record<string, { priceId: string; maxVideos: number }> = {
  starter: { priceId: 'price_creator_starter', maxVideos: 1 },
  creator_plus: { priceId: 'price_creator_plus', maxVideos: 3 },
  creator_pro: { priceId: 'price_creator_pro', maxVideos: 5 },
  creator_max: { priceId: 'price_creator_max', maxVideos: 10 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;

    // Get request body
    const { packageType, maxVideos, priceHuf } = await req.json();

    if (!packageType || !PACKAGE_PRICES[packageType]) {
      throw new Error("Invalid package type");
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, username')
      .eq('id', user.id)
      .single();

    const userEmail = profile?.email || `${user.id}@dingleup.app`;

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://dingleup.app";

    // Create checkout session with 30-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: `DingleUP! Creator - ${packageType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
              description: `${maxVideos} videó egyszerre aktív / ${maxVideos} videos active at once`,
            },
            unit_amount: priceHuf * 100, // Convert to fillér
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          user_id: user.id,
          package_type: packageType,
          max_videos: maxVideos.toString(),
        },
      },
      metadata: {
        user_id: user.id,
        package_type: packageType,
        max_videos: maxVideos.toString(),
      },
      success_url: `${origin}/creators?checkout=success&package=${packageType}`,
      cancel_url: `${origin}/creators?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating checkout:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
