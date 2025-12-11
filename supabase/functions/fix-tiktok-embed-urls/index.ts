import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resolve shortlinks to full URL
async function resolveShortlink(url: string): Promise<string> {
  if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
    console.log("[FIX] Resolving TikTok shortlink:", url);
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        redirect: 'follow'
      });
      
      if (response.url && response.url !== url) {
        console.log("[FIX] Resolved to:", response.url);
        return response.url;
      }
      
      const getResponse = await fetch(url, { redirect: 'follow' });
      if (getResponse.url && getResponse.url !== url) {
        console.log("[FIX] Resolved via GET to:", getResponse.url);
        return getResponse.url;
      }
    } catch (e) {
      console.error("[FIX] Failed to resolve shortlink:", e);
    }
  }
  return url;
}

// Generate proper embed URL for TikTok
async function generateTikTokEmbed(videoUrl: string): Promise<string | null> {
  // Resolve shortlink first
  const resolvedUrl = await resolveShortlink(videoUrl);
  
  // Extract video ID
  const videoMatch = resolvedUrl.match(/\/video\/(\d+)/);
  if (videoMatch) {
    return `https://www.tiktok.com/embed/v2/${videoMatch[1]}`;
  }
  
  // Try oEmbed API
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
    const response = await fetch(oembedUrl, { headers: { 'Accept': 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      if (data.html) {
        const iframeMatch = data.html.match(/embed\/v2\/(\d+)/);
        if (iframeMatch) {
          return `https://www.tiktok.com/embed/v2/${iframeMatch[1]}`;
        }
      }
    }
  } catch (e) {
    console.error("[FIX] oEmbed error:", e);
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[FIX-TIKTOK] Starting fix...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all TikTok videos with shortlink embed_urls
    const { data: videos, error } = await supabaseClient
      .from('creator_videos')
      .select('id, video_url, embed_url, platform')
      .eq('platform', 'tiktok');

    if (error) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }

    console.log(`[FIX-TIKTOK] Found ${videos?.length || 0} TikTok videos`);

    const results: Array<{ id: string; oldEmbed: string; newEmbed: string | null; success: boolean }> = [];

    for (const video of videos || []) {
      // Check if embed_url is a shortlink (not a proper embed URL)
      const needsFix = !video.embed_url || 
                       video.embed_url.includes('vm.tiktok.com') || 
                       video.embed_url.includes('vt.tiktok.com') ||
                       !video.embed_url.includes('/embed/');

      if (needsFix) {
        console.log(`[FIX-TIKTOK] Fixing video ${video.id}: ${video.video_url}`);
        
        const newEmbedUrl = await generateTikTokEmbed(video.video_url);
        
        if (newEmbedUrl) {
          const { error: updateError } = await supabaseClient
            .from('creator_videos')
            .update({ embed_url: newEmbedUrl })
            .eq('id', video.id);

          if (updateError) {
            console.error(`[FIX-TIKTOK] Update error for ${video.id}:`, updateError);
            results.push({ id: video.id, oldEmbed: video.embed_url, newEmbed: null, success: false });
          } else {
            console.log(`[FIX-TIKTOK] Fixed ${video.id}: ${newEmbedUrl}`);
            results.push({ id: video.id, oldEmbed: video.embed_url, newEmbed: newEmbedUrl, success: true });
          }
        } else {
          console.error(`[FIX-TIKTOK] Could not generate embed for ${video.id}`);
          results.push({ id: video.id, oldEmbed: video.embed_url, newEmbed: null, success: false });
        }
      } else {
        console.log(`[FIX-TIKTOK] Video ${video.id} already has proper embed URL`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fixed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[FIX-TIKTOK] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});