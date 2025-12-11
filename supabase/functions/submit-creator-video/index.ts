import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform detection patterns
const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  tiktok: [
    /tiktok\.com/i,
    /vm\.tiktok\.com/i,
    /vt\.tiktok\.com/i,
  ],
  youtube: [
    /youtube\.com\/shorts/i,
    /youtu\.be/i,
    /youtube\.com\/watch/i,
  ],
  instagram: [
    /instagram\.com\/reel/i,
    /instagram\.com\/p\//i,
    /instagr\.am/i,
  ],
  facebook: [
    /facebook\.com\/reel/i,
    /fb\.watch/i,
    /facebook\.com\/watch/i,
  ],
};

function detectPlatform(url: string): string | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  return null;
}

// Extract video ID for embed URL generation
function generateEmbedUrl(url: string, platform: string): string | null {
  try {
    if (platform === 'tiktok') {
      // TikTok embed: https://www.tiktok.com/embed/v2/VIDEO_ID
      const match = url.match(/\/video\/(\d+)/);
      if (match) {
        return `https://www.tiktok.com/embed/v2/${match[1]}`;
      }
    }
    if (platform === 'youtube') {
      // YouTube Shorts embed
      const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      }
      const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (watchMatch) {
        return `https://www.youtube.com/embed/${watchMatch[1]}`;
      }
      const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (shortMatch) {
        return `https://www.youtube.com/embed/${shortMatch[1]}`;
      }
    }
    if (platform === 'instagram') {
      // Instagram embed URL
      const match = url.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
      }
    }
    if (platform === 'facebook') {
      // Facebook uses oEmbed, return original for now
      return url;
    }
  } catch (e) {
    console.error("Error generating embed URL:", e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SUBMIT-VIDEO] Function started");

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
      console.error("[SUBMIT-VIDEO] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "NOT_AUTHENTICATED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log("[SUBMIT-VIDEO] User authenticated:", userId);

    // Get request body
    const body = await req.json();
    const { video_url, topic_ids, activate_now } = body;

    if (!video_url) {
      return new Response(
        JSON.stringify({ success: false, error: "VIDEO_URL_REQUIRED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check subscription status
    const { data: subscription } = await supabaseClient
      .from('creator_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription || !['active', 'active_trial', 'cancel_at_period_end'].includes(subscription.status)) {
      console.log("[SUBMIT-VIDEO] No active subscription for user:", userId);
      return new Response(
        JSON.stringify({ success: false, error: "NO_ACTIVE_SUBSCRIPTION" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Detect platform
    const platform = detectPlatform(video_url);
    if (!platform) {
      console.log("[SUBMIT-VIDEO] Unknown platform for URL:", video_url);
      return new Response(
        JSON.stringify({ success: false, error: "UNSUPPORTED_PLATFORM" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    console.log("[SUBMIT-VIDEO] Detected platform:", platform);

    // Generate embed URL
    const embedUrl = generateEmbedUrl(video_url, platform);

    // Check if video already exists for this user
    const { data: existingVideo } = await supabaseClient
      .from('creator_videos')
      .select('id')
      .eq('user_id', userId)
      .eq('video_url', video_url)
      .maybeSingle();

    if (existingVideo) {
      return new Response(
        JSON.stringify({ success: false, error: "VIDEO_ALREADY_EXISTS" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // If activating now, check 3/24h limit
    if (activate_now) {
      const { count } = await supabaseClient
        .from('creator_videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('first_activated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (count !== null && count >= 3) {
        console.log("[SUBMIT-VIDEO] Daily limit reached, count:", count);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "DAILY_LIMIT_REACHED",
            current_count: count 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
    }

    // Create video record
    const videoData: Record<string, unknown> = {
      user_id: userId,
      platform,
      video_url,
      embed_url: embedUrl,
      status: activate_now ? 'active' : 'pending',
      is_active: activate_now,
    };

    if (activate_now) {
      videoData.first_activated_at = new Date().toISOString();
      videoData.expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: newVideo, error: insertError } = await supabaseClient
      .from('creator_videos')
      .insert(videoData)
      .select()
      .single();

    if (insertError) {
      console.error("[SUBMIT-VIDEO] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "INSERT_FAILED", details: insertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[SUBMIT-VIDEO] Video created:", newVideo.id);

    // Add topic associations if provided
    if (topic_ids && Array.isArray(topic_ids) && topic_ids.length > 0) {
      // Limit to 10 topics
      const limitedTopics = topic_ids.slice(0, 10);
      
      const topicInserts = limitedTopics.map((topicId: number) => ({
        creator_video_id: newVideo.id,
        topic_id: topicId,
      }));

      const { error: topicError } = await supabaseClient
        .from('creator_video_topics')
        .insert(topicInserts);

      if (topicError) {
        console.error("[SUBMIT-VIDEO] Topic insert error:", topicError);
        // Don't fail the whole request for topic errors
      } else {
        console.log("[SUBMIT-VIDEO] Added", limitedTopics.length, "topics");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        video: newVideo,
        platform,
        activated: activate_now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SUBMIT-VIDEO] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", details: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
