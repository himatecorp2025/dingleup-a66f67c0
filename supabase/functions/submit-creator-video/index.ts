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

// Resolve shortlinks to full URL (TikTok, YouTube, Instagram)
async function resolveShortlink(url: string): Promise<string> {
  const isShortlink = 
    url.includes('vm.tiktok.com') || 
    url.includes('vt.tiktok.com') ||
    url.includes('youtu.be') ||
    url.includes('instagr.am') ||
    url.includes('fb.watch');
    
  if (!isShortlink) {
    return url;
  }
  
  console.log("[RESOLVE] Resolving shortlink:", url);
  
  // Try multiple methods to resolve
  const methods = [
    // Method 1: HEAD request with redirect follow
    async () => {
      const response = await fetch(url, { 
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      return response.url;
    },
    // Method 2: GET request with redirect follow
    async () => {
      const response = await fetch(url, { 
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      return response.url;
    },
    // Method 3: Manual redirect following
    async () => {
      let currentUrl = url;
      for (let i = 0; i < 5; i++) {
        const response = await fetch(currentUrl, { 
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
          }
        });
        const location = response.headers.get('location');
        if (!location || response.status < 300 || response.status >= 400) {
          break;
        }
        currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
      }
      return currentUrl;
    }
  ];
  
  for (const method of methods) {
    try {
      const resolved = await method();
      if (resolved && resolved !== url && resolved.includes('/video/')) {
        console.log("[RESOLVE] Resolved to:", resolved);
        return resolved;
      }
    } catch (e) {
      console.log("[RESOLVE] Method failed:", e);
    }
  }
  
  console.log("[RESOLVE] Could not resolve shortlink, returning original");
  return url;
}

// Build embed URL based on platform - with AUTOPLAY + MUTE params
async function buildEmbedUrl(url: string, platform: string): Promise<string> {
  try {
    // ============ YOUTUBE (including Shorts) ============
    if (platform === 'youtube') {
      let videoId: string | null = null;
      
      // Format: /shorts/VIDEO_ID
      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        videoId = shortsMatch[1];
      }
      
      // Format: watch?v=VIDEO_ID
      if (!videoId) {
        const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) {
          videoId = watchMatch[1];
        }
      }
      
      // Format: youtu.be/VIDEO_ID
      if (!videoId) {
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) {
          videoId = shortMatch[1];
        }
      }
      
      if (videoId) {
        // YouTube embed with autoplay, mute, playsinline, no controls
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1`;
        console.log("[EMBED] YouTube embed URL:", embedUrl);
        return embedUrl;
      }
    }
    
    // ============ TIKTOK ============
    if (platform === 'tiktok') {
      // First resolve shortlinks to get full URL with video ID
      let resolvedUrl = url;
      if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
        resolvedUrl = await resolveShortlink(url);
      }
      
      // Extract video ID from resolved URL
      // Format: @username/video/VIDEO_ID or /video/VIDEO_ID
      const videoMatch = resolvedUrl.match(/\/video\/(\d+)/);
      if (videoMatch) {
        // TikTok embed v2 with autoplay and mute
        const embedUrl = `https://www.tiktok.com/embed/v2/${videoMatch[1]}?autoplay=1&mute=1`;
        console.log("[EMBED] TikTok embed URL:", embedUrl);
        return embedUrl;
      }
      
      // If still no video ID found, try oEmbed API as last resort
      console.log("[EMBED] No video ID in URL, trying oEmbed API");
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
        const response = await fetch(oembedUrl, { headers: { 'Accept': 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          if (data.html) {
            const iframeMatch = data.html.match(/embed\/v2\/(\d+)/);
            if (iframeMatch) {
              const embedUrl = `https://www.tiktok.com/embed/v2/${iframeMatch[1]}?autoplay=1&mute=1`;
              console.log("[EMBED] TikTok embed from oEmbed:", embedUrl);
              return embedUrl;
            }
          }
        }
      } catch (e) {
        console.error("[EMBED] oEmbed API error:", e);
      }
      
      console.error("[EMBED] FAILED to generate TikTok embed URL for:", url);
      return '';
    }
    
    // ============ INSTAGRAM REELS ============
    if (platform === 'instagram') {
      // Format: /reel/REEL_ID/ or /p/POST_ID/
      const match = url.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const type = match[1]; // 'reel' or 'p'
        const postId = match[2];
        // Instagram embed with autoplay and muted params
        const embedUrl = `https://www.instagram.com/${type}/${postId}/embed?autoplay=1&muted=1`;
        console.log("[EMBED] Instagram embed URL:", embedUrl);
        return embedUrl;
      }
    }
    
    // ============ FACEBOOK REELS / VIDEOS ============
    if (platform === 'facebook') {
      // Facebook video plugin with autoplay and mute
      const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1&mute=1`;
      console.log("[EMBED] Facebook embed URL:", embedUrl);
      return embedUrl;
    }
    
  } catch (e) {
    console.error("[EMBED] Error generating embed URL:", e);
  }
  
  console.log("[EMBED] Failed to generate embed URL, returning empty");
  return '';
}

// Extract thumbnail URL based on platform
async function extractThumbnailUrl(url: string, platform: string): Promise<string | null> {
  try {
    // ============ YOUTUBE ============
    if (platform === 'youtube') {
      let videoId: string | null = null;
      
      // Format: /shorts/VIDEO_ID
      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        videoId = shortsMatch[1];
      }
      
      // Format: watch?v=VIDEO_ID
      if (!videoId) {
        const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) {
          videoId = watchMatch[1];
        }
      }
      
      // Format: youtu.be/VIDEO_ID
      if (!videoId) {
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) {
          videoId = shortMatch[1];
        }
      }
      
      if (videoId) {
        // Use hqdefault for higher quality thumbnail
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    
    // ============ TIKTOK - oEmbed API (FREE, no API key needed) ============
    if (platform === 'tiktok') {
      try {
        // For short links (vm.tiktok.com), first resolve to full URL
        let resolvedUrl = url;
        if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
          console.log("[THUMBNAIL] Resolving TikTok short link:", url);
          try {
            const redirectResponse = await fetch(url, { 
              method: 'HEAD',
              redirect: 'follow'
            });
            if (redirectResponse.url && redirectResponse.url !== url) {
              resolvedUrl = redirectResponse.url;
              console.log("[THUMBNAIL] Resolved to:", resolvedUrl);
            }
          } catch (redirectErr) {
            console.log("[THUMBNAIL] Redirect follow failed, trying oEmbed directly");
          }
        }
        
        console.log("[THUMBNAIL] Fetching TikTok oEmbed for:", resolvedUrl);
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
        const response = await fetch(oembedUrl, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail_url) {
            console.log("[THUMBNAIL] TikTok thumbnail found:", data.thumbnail_url);
            return data.thumbnail_url;
          }
        }
      } catch (e) {
        console.error("[THUMBNAIL] TikTok oEmbed error:", e);
      }
    }
    
    // For Instagram/Facebook - can't extract without API, user must upload custom thumbnail
    
  } catch (e) {
    console.error("[THUMBNAIL] Error extracting thumbnail:", e);
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
    const { video_url, topic_ids, activate_now, custom_thumbnail_url } = body;

    if (!video_url) {
      return new Response(
        JSON.stringify({ success: false, error: "VIDEO_URL_REQUIRED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user is admin (admins bypass subscription check)
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    const isAdmin = !!userRole;
    
    // Check subscription status (skip for admins)
    if (!isAdmin) {
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
    } else {
      console.log("[SUBMIT-VIDEO] Admin user, bypassing subscription check");
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

    // Generate embed URL (async - resolves shortlinks)
    const embedUrl = await buildEmbedUrl(video_url, platform);
    console.log("[SUBMIT-VIDEO] Generated embed URL:", embedUrl);
    
    // CRITICAL: If no embed URL could be generated, reject the video
    if (!embedUrl) {
      console.error("[SUBMIT-VIDEO] Failed to generate embed URL for:", video_url);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "EMBED_GENERATION_FAILED",
          message: "Nem sikerült feldolgozni a videó linket. Kérjük próbáld meg a teljes videó URL-t (nem rövidített linket)."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract thumbnail URL - use custom if provided, otherwise try to extract
    let thumbnailUrl = custom_thumbnail_url || null;
    if (!thumbnailUrl) {
      thumbnailUrl = await extractThumbnailUrl(video_url, platform);
    }
    console.log("[SUBMIT-VIDEO] Thumbnail URL:", thumbnailUrl || "none");

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

    // Get creator's country from their profile
    const { data: creatorProfile } = await supabaseClient
      .from('profiles')
      .select('country_code')
      .eq('id', userId)
      .single();
    
    const creatorCountry = creatorProfile?.country_code || 'HU'; // Default to HU if not set
    console.log("[SUBMIT-VIDEO] Creator country:", creatorCountry);

    // Create video record - ALL VIDEOS ARE IMMEDIATELY ACTIVE (no admin approval needed for embeds)
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    
    const videoData: Record<string, unknown> = {
      user_id: userId,
      platform,
      video_url,
      embed_url: embedUrl,
      thumbnail_url: thumbnailUrl,
      status: 'active',
      is_active: true,
      first_activated_at: now,
      expires_at: expiresAt,
    };

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

    // Add creator's country as the primary target country
    const { error: countryError } = await supabaseClient
      .from('creator_video_countries')
      .insert({
        creator_video_id: newVideo.id,
        country_code: creatorCountry,
        is_primary: true,
        sort_order: 1,
      });
    
    if (countryError) {
      console.error("[SUBMIT-VIDEO] Country insert error:", countryError);
      // Don't fail the whole request for country errors
    } else {
      console.log("[SUBMIT-VIDEO] Added primary country:", creatorCountry);
    }

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
