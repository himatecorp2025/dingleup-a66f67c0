import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardVideo {
  id: string;
  embedUrl: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse count from query params (default 10)
    const url = new URL(req.url);
    const count = parseInt(url.searchParams.get('count') || '10', 10);
    const requestedCount = Math.min(Math.max(count, 1), 20); // Clamp between 1-20

    console.log(`[preload-reward-videos] User ${userId}, requesting ${requestedCount} videos`);

    const now = new Date().toISOString();

    // Get active creator videos with valid subscriptions
    const { data: videos, error: videosError } = await supabaseClient
      .from('creator_videos')
      .select(`
        id,
        embed_url,
        platform,
        user_id
      `)
      .eq('is_active', true)
      .gt('expires_at', now)
      .not('embed_url', 'is', null);

    if (videosError) {
      console.error('[preload-reward-videos] Error fetching videos:', videosError);
      return new Response(
        JSON.stringify({ videos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!videos || videos.length === 0) {
      console.log('[preload-reward-videos] No active videos available');
      return new Response(
        JSON.stringify({ videos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active creator subscriptions
    const creatorIds = [...new Set(videos.map(v => v.user_id))];
    
    const { data: subscriptions } = await supabaseClient
      .from('creator_subscriptions')
      .select('user_id, status')
      .in('user_id', creatorIds)
      .in('status', ['active', 'trial', 'active_trial', 'cancel_at_period_end']);

    const activeCreatorIds = new Set(subscriptions?.map(s => s.user_id) || []);

    // Filter by active creators AND valid embed URLs
    const eligibleVideos = videos.filter(v => {
      if (!activeCreatorIds.has(v.user_id)) return false;
      if (!v.embed_url) return false;
      // Valid embed URLs must contain /embed/ or plugins/video for Facebook
      const hasValidEmbed = v.embed_url.includes('/embed/') || v.embed_url.includes('plugins/video');
      return hasValidEmbed;
    });

    if (eligibleVideos.length === 0) {
      console.log('[preload-reward-videos] No eligible videos after filtering');
      return new Response(
        JSON.stringify({ videos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Shuffle and pick up to requestedCount videos
    const shuffled = eligibleVideos.sort(() => Math.random() - 0.5);
    
    // If we have fewer videos than requested, allow repetition
    const resultVideos: RewardVideo[] = [];
    for (let i = 0; i < requestedCount; i++) {
      const video = shuffled[i % shuffled.length];
      resultVideos.push({
        id: video.id,
        embedUrl: video.embed_url!,
        platform: video.platform as RewardVideo['platform'],
      });
    }

    console.log(`[preload-reward-videos] Returning ${resultVideos.length} videos`);

    return new Response(
      JSON.stringify({ videos: resultVideos }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[preload-reward-videos] Error:', error);
    return new Response(
      JSON.stringify({ videos: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
