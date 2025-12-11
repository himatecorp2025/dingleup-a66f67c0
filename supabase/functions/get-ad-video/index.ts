import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoRequest {
  context: 'daily_gift' | 'game_end' | 'refill';
  exclude_video_ids?: string[];
  exclude_creator_ids?: string[];
}

interface CreatorVideo {
  id: string;
  video_url: string;
  embed_url: string | null;
  platform: string;
  duration_seconds: number | null;
  creator_id: string;
  topics: number[];
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

    const body: VideoRequest = await req.json();
    const { context, exclude_video_ids = [], exclude_creator_ids = [] } = body;

    console.log(`[get-ad-video] User ${userId}, context: ${context}`);

    // Step 1: Get user's top 3 topics (if they have 100+ answered questions)
    const { data: topicStats, error: topicError } = await supabaseClient
      .from('user_topic_stats')
      .select('topic_id, correct_count')
      .eq('user_id', userId)
      .order('correct_count', { ascending: false })
      .limit(10);

    let userTopTopics: number[] = [];
    let totalAnswered = 0;

    if (!topicError && topicStats) {
      totalAnswered = topicStats.reduce((sum, t) => sum + (t.correct_count || 0), 0);
      if (totalAnswered >= 100) {
        userTopTopics = topicStats.slice(0, 3).map(t => t.topic_id);
      }
    }

    console.log(`[get-ad-video] User has ${totalAnswered} correct answers, top topics: ${userTopTopics.join(',')}`);

    // Step 2: Get active creator videos with valid subscriptions
    const now = new Date().toISOString();
    
    let query = supabaseClient
      .from('creator_videos')
      .select(`
        id,
        video_url,
        embed_url,
        platform,
        duration_seconds,
        user_id,
        creator_video_topics(topic_id)
      `)
      .eq('is_active', true)
      .gt('expires_at', now);

    // Exclude already shown videos in this sequence
    if (exclude_video_ids.length > 0) {
      query = query.not('id', 'in', `(${exclude_video_ids.join(',')})`);
    }

    // Exclude creators already shown
    if (exclude_creator_ids.length > 0) {
      query = query.not('user_id', 'in', `(${exclude_creator_ids.join(',')})`);
    }

    const { data: videos, error: videosError } = await query;

    if (videosError) {
      console.error('[get-ad-video] Error fetching videos:', videosError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!videos || videos.length === 0) {
      console.log('[get-ad-video] No active videos available');
      return new Response(
        JSON.stringify({ available: false, video: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Filter videos by creator subscription status
    const creatorIds = [...new Set(videos.map(v => v.user_id))];
    
    const { data: subscriptions } = await supabaseClient
      .from('creator_subscriptions')
      .select('user_id, status')
      .in('user_id', creatorIds)
      .in('status', ['active', 'trial', 'cancel_at_period_end']);

    const activeCreatorIds = new Set(subscriptions?.map(s => s.user_id) || []);
    
    const eligibleVideos = videos.filter(v => activeCreatorIds.has(v.user_id));

    if (eligibleVideos.length === 0) {
      console.log('[get-ad-video] No videos from active creators');
      return new Response(
        JSON.stringify({ available: false, video: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Prioritize by topic relevance
    let selectedVideo: typeof eligibleVideos[0];
    
    if (userTopTopics.length > 0) {
      // Find videos matching user's interests
      const relevantVideos = eligibleVideos.filter(v => {
        const videoTopics = v.creator_video_topics?.map((t: any) => t.topic_id) || [];
        return videoTopics.some((tid: number) => userTopTopics.includes(tid));
      });

      if (relevantVideos.length > 0) {
        // Random selection from relevant videos
        selectedVideo = relevantVideos[Math.floor(Math.random() * relevantVideos.length)];
        console.log(`[get-ad-video] Selected relevant video ${selectedVideo.id}`);
      } else {
        // Fallback: random from all eligible
        selectedVideo = eligibleVideos[Math.floor(Math.random() * eligibleVideos.length)];
        console.log(`[get-ad-video] No relevant videos, selected random ${selectedVideo.id}`);
      }
    } else {
      // No user preferences: random selection
      selectedVideo = eligibleVideos[Math.floor(Math.random() * eligibleVideos.length)];
      console.log(`[get-ad-video] User has no preferences, selected random ${selectedVideo.id}`);
    }

    // Check if video is relevant to user
    const videoTopics = selectedVideo.creator_video_topics?.map((t: any) => t.topic_id) || [];
    const isRelevant = userTopTopics.length > 0 && videoTopics.some((tid: number) => userTopTopics.includes(tid));

    return new Response(
      JSON.stringify({
        available: true,
        video: {
          id: selectedVideo.id,
          video_url: selectedVideo.video_url,
          embed_url: selectedVideo.embed_url,
          platform: selectedVideo.platform,
          duration_seconds: selectedVideo.duration_seconds,
          creator_id: selectedVideo.user_id,
          topics: videoTopics,
        },
        is_relevant: isRelevant,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-ad-video] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
