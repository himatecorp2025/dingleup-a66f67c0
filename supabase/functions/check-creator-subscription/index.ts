import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CHECK-CREATOR-SUB] Function started");

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
      console.error("[CHECK-CREATOR-SUB] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ 
          has_subscription: false,
          status: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const userId = userData.user.id;
    console.log("[CHECK-CREATOR-SUB] User authenticated:", userId);

    // Get local subscription record
    const { data: subscription } = await supabaseClient
      .from('creator_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription) {
      console.log("[CHECK-CREATOR-SUB] No subscription found");
      return new Response(
        JSON.stringify({ 
          has_subscription: false,
          status: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If we have a Stripe subscription ID, verify with Stripe
    if (subscription.stripe_subscription_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, {
          apiVersion: "2025-08-27.basil",
        });

        try {
          const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          
          // Map Stripe status to our status
          let newStatus = subscription.status;
          if (stripeSub.status === 'trialing') {
            newStatus = 'active_trial';
          } else if (stripeSub.status === 'active') {
            newStatus = 'active';
          } else if (stripeSub.cancel_at_period_end) {
            newStatus = 'cancel_at_period_end';
          } else if (['canceled', 'unpaid', 'past_due'].includes(stripeSub.status)) {
            newStatus = 'inactive';
          }

          // Update local record if status changed
          if (newStatus !== subscription.status) {
            console.log("[CHECK-CREATOR-SUB] Updating status:", subscription.status, "->", newStatus);
            await supabaseClient
              .from('creator_subscriptions')
              .update({ 
                status: newStatus,
                current_period_ends_at: stripeSub.current_period_end 
                  ? new Date(stripeSub.current_period_end * 1000).toISOString() 
                  : null,
                trial_ends_at: stripeSub.trial_end 
                  ? new Date(stripeSub.trial_end * 1000).toISOString() 
                  : null,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            subscription.status = newStatus;
          }
        } catch (stripeError) {
          console.error("[CHECK-CREATOR-SUB] Stripe error:", stripeError);
          // Continue with local data
        }
      }
    }

    const isActive = ['active', 'active_trial', 'cancel_at_period_end'].includes(subscription.status);

    console.log("[CHECK-CREATOR-SUB] Subscription status:", subscription.status, "isActive:", isActive);

    return new Response(
      JSON.stringify({ 
        has_subscription: true,
        is_active: isActive,
        status: subscription.status,
        trial_ends_at: subscription.trial_ends_at,
        current_period_ends_at: subscription.current_period_ends_at,
        package_type: subscription.package_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-CREATOR-SUB] Error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        has_subscription: false,
        status: null,
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
