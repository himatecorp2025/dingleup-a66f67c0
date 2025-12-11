import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reactivation price (290 HUF one-time)
const REACTIVATION_PRICE_ID = "price_1ScxL1KKw7HPC0ZDT5vBroHp";
const REACTIVATION_AMOUNT = 290; // HUF

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[REACTIVATE-VIDEO] Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("[REACTIVATE-VIDEO] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "NOT_AUTHENTICATED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log("[REACTIVATE-VIDEO] User authenticated:", userId);

    // Get request body
    const { video_id } = await req.json();

    if (!video_id) {
      return new Response(
        JSON.stringify({ success: false, error: "VIDEO_ID_REQUIRED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check subscription status
    const { data: subscription } = await supabaseClient
      .from('creator_subscriptions')
      .select('*, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription || !['active', 'active_trial', 'cancel_at_period_end'].includes(subscription.status)) {
      console.log("[REACTIVATE-VIDEO] No active subscription for user:", userId);
      return new Response(
        JSON.stringify({ success: false, error: "NO_ACTIVE_SUBSCRIPTION" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get the video
    const { data: video } = await supabaseClient
      .from('creator_videos')
      .select('*')
      .eq('id', video_id)
      .eq('user_id', userId)
      .single();

    if (!video) {
      return new Response(
        JSON.stringify({ success: false, error: "VIDEO_NOT_FOUND" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Get or find Stripe customer
    let stripeCustomerId = subscription.stripe_customer_id;

    if (!stripeCustomerId) {
      // Get user email
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      const userEmail = profile?.email || `${userId}@dingleup.app`;

      // Find existing customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        // Update subscription record
        await supabaseClient
          .from('creator_subscriptions')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('user_id', userId);
      }
    }

    if (!stripeCustomerId) {
      console.error("[REACTIVATE-VIDEO] No Stripe customer found for user:", userId);
      return new Response(
        JSON.stringify({ success: false, error: "NO_PAYMENT_METHOD" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    
    if (customer.deleted) {
      return new Response(
        JSON.stringify({ success: false, error: "CUSTOMER_DELETED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
      console.log("[REACTIVATE-VIDEO] No default payment method");
      // Fallback: create a checkout session for one-time payment
      const origin = req.headers.get("origin") || "https://dingleup.app";
      
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price: REACTIVATION_PRICE_ID,
            quantity: 1,
          },
        ],
        metadata: {
          user_id: userId,
          video_id: video_id,
          action: "reactivate",
        },
        success_url: `${origin}/creators?reactivate=success&video=${video_id}`,
        cancel_url: `${origin}/creators?reactivate=cancelled`,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          requires_checkout: true,
          checkout_url: session.url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create PaymentIntent with saved card
    console.log("[REACTIVATE-VIDEO] Creating PaymentIntent for video:", video_id);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: REACTIVATION_AMOUNT,
      currency: "huf",
      customer: stripeCustomerId,
      payment_method: defaultPaymentMethod as string,
      off_session: true,
      confirm: true,
      description: `DingleUP Creator Video Reactivation - ${video_id}`,
      metadata: {
        user_id: userId,
        video_id: video_id,
        action: "reactivate",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      console.error("[REACTIVATE-VIDEO] Payment failed:", paymentIntent.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "PAYMENT_FAILED",
          status: paymentIntent.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    console.log("[REACTIVATE-VIDEO] Payment successful:", paymentIntent.id);

    // Calculate new expiry date
    const now = new Date();
    let newExpiresAt: Date;
    
    if (video.expires_at && new Date(video.expires_at) > now) {
      // Video still active: add 90 days to current expiry
      newExpiresAt = new Date(new Date(video.expires_at).getTime() + 90 * 24 * 60 * 60 * 1000);
    } else {
      // Video expired: start fresh from now
      newExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    // Update the video
    const { error: updateError } = await supabaseClient
      .from('creator_videos')
      .update({
        expires_at: newExpiresAt.toISOString(),
        is_active: true,
        status: 'active',
        updated_at: now.toISOString(),
      })
      .eq('id', video_id);

    if (updateError) {
      console.error("[REACTIVATE-VIDEO] Update error:", updateError);
      // Payment went through but update failed - log for manual fix
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "UPDATE_FAILED",
          payment_id: paymentIntent.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[REACTIVATE-VIDEO] Video reactivated, new expiry:", newExpiresAt);

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_expires_at: newExpiresAt.toISOString(),
        payment_id: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[REACTIVATE-VIDEO] Error:", errorMessage);
    
    // Check for Stripe card errors
    const err = error as Record<string, unknown>;
    if (err && err.type === 'StripeCardError') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "CARD_ERROR",
          message: String(err.message || 'Card error'),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", details: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
