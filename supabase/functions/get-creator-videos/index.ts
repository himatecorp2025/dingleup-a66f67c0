import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log("[GET-VIDEOS] Function started");

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
      console.error("[GET-VIDEOS] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "NOT_AUTHENTICATED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log("[GET-VIDEOS] User authenticated:", userId);

    // Get query params
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    const sortByExpiry = url.searchParams.get("sort_by_expiry") === "true";

    // Build query
    let query = supabaseClient
      .from('creator_videos')
      .select('*')
      .eq('user_id', userId);

    // Filter by platform if specified
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    // Order by expiry date if requested (for clock icon view)
    if (sortByExpiry) {
      query = query.order('expires_at', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: videos, error: fetchError } = await query;

    if (fetchError) {
      console.error("[GET-VIDEOS] Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "FETCH_FAILED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Calculate days remaining for each video
    const now = new Date();
    const videosWithDays = (videos || []).map(video => {
      let daysRemaining: number | null = null;
      
      if (video.expires_at) {
        const expiresAt = new Date(video.expires_at);
        const diffMs = expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) daysRemaining = 0;
      }

      return {
        ...video,
        days_remaining: daysRemaining,
      };
    });

    // Get activation count in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activationsToday } = await supabaseClient
      .from('creator_videos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('first_activated_at', twentyFourHoursAgo);

    // Get subscription status
    const { data: subscription } = await supabaseClient
      .from('creator_subscriptions')
      .select('status, trial_ends_at, current_period_ends_at')
      .eq('user_id', userId)
      .maybeSingle();

    console.log("[GET-VIDEOS] Found", videosWithDays.length, "videos");

    return new Response(
      JSON.stringify({ 
        success: true, 
        videos: videosWithDays,
        stats: {
          total: videosWithDays.length,
          active: videosWithDays.filter(v => v.status === 'active' && v.days_remaining && v.days_remaining > 0).length,
          expired: videosWithDays.filter(v => v.status === 'expired' || (v.days_remaining !== null && v.days_remaining <= 0)).length,
          activations_today: activationsToday || 0,
          remaining_activations: Math.max(0, 3 - (activationsToday || 0)),
        },
        subscription: subscription || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET-VIDEOS] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", details: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
