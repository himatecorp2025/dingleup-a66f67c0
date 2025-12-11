import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardStartRequest {
  eventType: 'daily_gift' | 'end_game' | 'refill';
  originalReward?: number;
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

    // Determine required video count
    const videosRequired = eventType === 'refill' ? 2 : 1;

    console.log(`[reward-start] User ${userId}, event: ${eventType}, videosRequired: ${videosRequired}`);

    // Generate unique session ID
    const rewardSessionId = `${userId}-${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const now = new Date().toISOString();

    // STEP 1: Try to get topic-based videos first
    // Get user's top topics for targeting (if available)
    let topicVideos: any[] = [];
    
    const { data: userStats } = await supabaseClient
      .from('user_topic_stats')
      .select('topic_id')
      .eq('user_id', userId)
      .order('correct_count', { ascending: false })
      .limit(3);

    if (userStats && userStats.length > 0) {
      const topTopicIds = userStats.map(s => s.topic_id);
      
      // Get videos matching user's top topics
      const { data: topicVideoData } = await supabaseClient
        .from('creator_videos')
        .select(`
          id,
          embed_url,
          platform,
          user_id,
          creator_video_topics!inner(topic_id)
        `)
        .eq('is_active', true)
        .gt('expires_at', now)
        .not('embed_url', 'is', null)
        .in('creator_video_topics.topic_id', topTopicIds);

      if (topicVideoData) {
        topicVideos = topicVideoData;
      }
    }

    // STEP 2: Get all active videos as fallback
    const { data: allVideos, error: videosError } = await supabaseClient
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
      console.error('[reward-start] Error fetching videos:', videosError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'DATABASE_ERROR',
          rewardSessionId: null,
          videos: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Get active creator subscriptions
    const allVideosList = allVideos || [];
    const creatorIds = [...new Set(allVideosList.map(v => v.user_id))];
    
    let activeCreatorIds = new Set<string>();
    
    if (creatorIds.length > 0) {
      const { data: subscriptions } = await supabaseClient
        .from('creator_subscriptions')
        .select('user_id, status')
        .in('user_id', creatorIds)
        .in('status', ['active', 'trial', 'active_trial', 'cancel_at_period_end']);

      activeCreatorIds = new Set(subscriptions?.map(s => s.user_id) || []);
    }

    // STEP 4: Filter eligible videos (active creator + valid embed)
    const filterEligible = (videos: any[]) => {
      return videos.filter(v => {
        if (!activeCreatorIds.has(v.user_id)) return false;
        if (!v.embed_url) return false;
        const hasValidEmbed = v.embed_url.includes('/embed/') || v.embed_url.includes('plugins/video');
        return hasValidEmbed;
      });
    };

    const eligibleTopicVideos = filterEligible(topicVideos);
    const eligibleAllVideos = filterEligible(allVideosList);

    console.log(`[reward-start] Found ${eligibleTopicVideos.length} topic videos, ${eligibleAllVideos.length} total eligible videos`);

    // STEP 5: Select videos with repetition logic
    // Priority: topic-based videos first, then fallback to all videos
    let sourceVideos = eligibleTopicVideos.length > 0 ? eligibleTopicVideos : eligibleAllVideos;

    // If no videos at all, return error
    if (sourceVideos.length === 0) {
      console.log('[reward-start] No eligible videos in entire system');
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

    // Shuffle source videos
    const shuffled = sourceVideos.sort(() => Math.random() - 0.5);

    // Build result array with repetition if needed
    const selectedVideos: RewardVideo[] = [];
    for (let i = 0; i < videosRequired; i++) {
      const video = shuffled[i % shuffled.length]; // Cycle through if not enough
      selectedVideos.push({
        id: video.id,
        embedUrl: video.embed_url!,
        platform: video.platform as RewardVideo['platform'],
      });
    }

    console.log(`[reward-start] Selected ${selectedVideos.length} videos (source had ${sourceVideos.length})`);

    // Store session in database for validation on complete
    const { error: sessionError } = await supabaseClient
      .from('reward_sessions')
      .insert({
        id: rewardSessionId,
        user_id: userId,
        event_type: eventType,
        required_ads: videosRequired,
        original_reward: originalReward,
        video_ids: selectedVideos.map(v => v.id),
        created_at: now,
        status: 'pending',
      });

    if (sessionError) {
      console.log('[reward-start] Could not store session (table may not exist):', sessionError.message);
    }

    console.log(`[reward-start] Session ${rewardSessionId} created with ${selectedVideos.length} videos`);

    return new Response(
      JSON.stringify({
        success: true,
        rewardSessionId,
        videos: selectedVideos,
        videosRequired,
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
