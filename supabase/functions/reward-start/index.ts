import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardStartRequest {
  eventType: 'daily_gift' | 'end_game' | 'refill';
  originalReward?: number; // For doubling contexts
}

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

    const body: RewardStartRequest = await req.json();
    const { eventType, originalReward = 0 } = body;

    // Determine required ads count
    const requiredAds = eventType === 'refill' ? 2 : 1;

    console.log(`[reward-start] User ${userId}, event: ${eventType}, requiredAds: ${requiredAds}`);

    // Generate unique session ID
    const rewardSessionId = `${userId}-${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const now = new Date().toISOString();

    // Get active creator videos
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

    if (videosError || !videos || videos.length === 0) {
      console.log('[reward-start] No active videos available');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'NO_VIDEOS_AVAILABLE',
          rewardSessionId: null,
          videos: []
        }),
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

    // Filter eligible videos
    const eligibleVideos = videos.filter(v => {
      if (!activeCreatorIds.has(v.user_id)) return false;
      if (!v.embed_url) return false;
      const hasValidEmbed = v.embed_url.includes('/embed/') || v.embed_url.includes('plugins/video');
      return hasValidEmbed;
    });

    if (eligibleVideos.length === 0) {
      console.log('[reward-start] No eligible videos after filtering');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'NO_VIDEOS_AVAILABLE',
          rewardSessionId: null,
          videos: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Shuffle and select videos
    const shuffled = eligibleVideos.sort(() => Math.random() - 0.5);
    const selectedVideos: RewardVideo[] = [];

    for (let i = 0; i < requiredAds; i++) {
      const video = shuffled[i % shuffled.length];
      selectedVideos.push({
        id: video.id,
        embedUrl: video.embed_url!,
        platform: video.platform as RewardVideo['platform'],
      });
    }

    // Store session in database for validation on complete
    const { error: sessionError } = await supabaseClient
      .from('reward_sessions')
      .insert({
        id: rewardSessionId,
        user_id: userId,
        event_type: eventType,
        required_ads: requiredAds,
        original_reward: originalReward,
        video_ids: selectedVideos.map(v => v.id),
        created_at: now,
        status: 'pending',
      });

    // If table doesn't exist, continue anyway (session validation will be looser)
    if (sessionError) {
      console.log('[reward-start] Could not store session (table may not exist):', sessionError.message);
    }

    console.log(`[reward-start] Session ${rewardSessionId} created with ${selectedVideos.length} videos`);

    return new Response(
      JSON.stringify({
        success: true,
        rewardSessionId,
        videos: selectedVideos,
        requiredAds,
        eventType,
        originalReward,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reward-start] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
