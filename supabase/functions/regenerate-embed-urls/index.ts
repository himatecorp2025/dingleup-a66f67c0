import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resolve shortlinks to full URL (TikTok vm.tiktok.com, vt.tiktok.com)
async function resolveShortlink(url: string, maxHops = 5): Promise<string> {
  let current = url;
  
  for (let i = 0; i < maxHops; i++) {
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; DingleUP/1.0)",
          "accept": "text/html,application/xhtml+xml",
        },
      });

      // 3xx → Follow Location header
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        current = new URL(loc, current).toString();
        console.log(`[RESOLVE] Hop ${i + 1}: ${current}`);
        continue;
      }

      return current;
    } catch (e) {
      console.error("[RESOLVE] Error:", e);
      break;
    }
  }
  
  return current;
}

// Try oEmbed API for TikTok
async function tiktokOEmbedFallback(originalUrl: string): Promise<string | null> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(originalUrl)}`;
    const res = await fetch(endpoint, { method: "GET" });
    if (!res.ok) return null;
    
    const data = await res.json();
    const html = data?.html as string | undefined;
    if (!html) return null;

    // Extract embed src or video ID
    const mSrc = html.match(/src="([^"]+)"/);
    if (mSrc?.[1] && mSrc[1].includes("tiktok.com/embed")) {
      return mSrc[1];
    }

    const mV2 = html.match(/\/embed\/v2\/(\d+)/);
    if (mV2?.[1]) {
      return `https://www.tiktok.com/embed/v2/${mV2[1]}`;
    }

    const mId = html.match(/\/video\/(\d+)/);
    if (mId?.[1]) {
      return `https://www.tiktok.com/embed/v2/${mId[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

function addParams(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

// Build embed URL based on platform
async function buildEmbedUrl(url: string, platform: string): Promise<string> {
  try {
    const p = platform.toLowerCase();

    // ===================== YOUTUBE =====================
    if (p === "youtube") {
      let videoId: string | null = null;
      
      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) videoId = shortsMatch[1];
      
      if (!videoId) {
        const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) videoId = watchMatch[1];
      }
      
      if (!videoId) {
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) videoId = shortMatch[1];
      }
      
      if (videoId) {
        return addParams(`https://www.youtube.com/embed/${videoId}`, {
          autoplay: "1",
          mute: "1",
          playsinline: "1",
          controls: "0",
          rel: "0",
          modestbranding: "1",
        });
      }
      return "";
    }

    // ===================== TIKTOK =====================
    if (p === "tiktok") {
      let finalUrl = url;

      // Resolve shortlinks
      if (url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
        console.log("[EMBED] Resolving TikTok shortlink:", url);
        finalUrl = await resolveShortlink(url);
        console.log("[EMBED] Resolved to:", finalUrl);
      }

      // Extract video ID from path
      const videoMatch = finalUrl.match(/\/video\/(\d+)/);
      if (videoMatch?.[1]) {
        return addParams(`https://www.tiktok.com/embed/v2/${videoMatch[1]}`, {
          autoplay: "1",
          mute: "1",
        });
      }

      // Try oEmbed fallback
      console.log("[EMBED] No video ID, trying oEmbed for:", url);
      const oembed = await tiktokOEmbedFallback(url);
      if (oembed) {
        const idMatch = oembed.match(/\/embed\/v2\/(\d+)/) || oembed.match(/\/video\/(\d+)/);
        if (idMatch?.[1]) {
          return addParams(`https://www.tiktok.com/embed/v2/${idMatch[1]}`, {
            autoplay: "1",
            mute: "1",
          });
        }
        // If oembed already has embed URL
        if (oembed.includes("tiktok.com/embed")) {
          return addParams(oembed, { autoplay: "1", mute: "1" });
        }
      }

      console.error("[EMBED] FAILED to generate TikTok embed for:", url);
      return "";
    }

    // ===================== INSTAGRAM =====================
    if (p === "instagram") {
      const match = url.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return addParams(`https://www.instagram.com/${match[1]}/${match[2]}/embed/`, {
          autoplay: "1",
          muted: "1",
        });
      }
      return "";
    }

    // ===================== FACEBOOK =====================
    if (p === "facebook") {
      return addParams("https://www.facebook.com/plugins/video.php", {
        href: url,
        autoplay: "1",
        mute: "1",
        show_text: "0",
      });
    }

    return "";
  } catch (e) {
    console.error("[EMBED] Error:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[REGENERATE] Starting embed URL regeneration");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate - require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "NOT_AUTHENTICATED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check admin role
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ success: false, error: "ADMIN_REQUIRED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get videos with NULL or empty embed_url
    const { data: videos, error: fetchError } = await supabaseClient
      .from('creator_videos')
      .select('id, video_url, platform, embed_url')
      .or('embed_url.is.null,embed_url.eq.');

    if (fetchError) {
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    console.log(`[REGENERATE] Found ${videos?.length || 0} videos needing embed URLs`);

    const results: { id: string; success: boolean; embed_url?: string; error?: string }[] = [];

    for (const video of videos || []) {
      console.log(`[REGENERATE] Processing: ${video.id} (${video.platform})`);
      
      try {
        const embedUrl = await buildEmbedUrl(video.video_url, video.platform);
        
        if (embedUrl) {
          const { error: updateError } = await supabaseClient
            .from('creator_videos')
            .update({ embed_url: embedUrl, updated_at: new Date().toISOString() })
            .eq('id', video.id);

          if (updateError) {
            results.push({ id: video.id, success: false, error: updateError.message });
          } else {
            results.push({ id: video.id, success: true, embed_url: embedUrl });
            console.log(`[REGENERATE] ✓ Updated ${video.id}: ${embedUrl}`);
          }
        } else {
          results.push({ id: video.id, success: false, error: "Could not generate embed URL" });
          console.log(`[REGENERATE] ✗ Failed ${video.id}: no embed URL generated`);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        results.push({ id: video.id, success: false, error: errMsg });
        console.error(`[REGENERATE] ✗ Error ${video.id}:`, errMsg);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[REGENERATE] Complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[REGENERATE] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", details: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
