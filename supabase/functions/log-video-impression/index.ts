import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImpressionRequest {
  video_id: string;
  context: 'daily_gift' | 'game_end' | 'refill';
  watched_full_15s: boolean;
  sequence_position?: number;
}

// Calculate is_relevant_viewer based on video topics intersecting user's TOP3 topics
async function calculateIsRelevant(
  supabase: any,
  userId: string,
  videoId: string
): Promise<boolean> {
  // Get video's topic IDs
  const { data: videoTopics } = await supabase
    .from('creator_video_topics')
    .select('topic_id')
    .eq('creator_video_id', videoId);

  if (!videoTopics || videoTopics.length === 0) {
    return false;
  }

  const videoTopicIds = (videoTopics as { topic_id: number }[]).map(t => t.topic_id);

  // Get user's TOP3 topics by correct_count
  const { data: userTopStats } = await supabase
    .from('user_topic_stats')
    .select('topic_id')
    .eq('user_id', userId)
    .order('correct_count', { ascending: false })
    .limit(3);

  if (!userTopStats || userTopStats.length === 0) {
    return false;
  }

  const userTop3TopicIds = (userTopStats as { topic_id: number }[]).map(t => t.topic_id);

  // Check intersection
  const hasIntersection = videoTopicIds.some(vt => userTop3TopicIds.includes(vt));
  return hasIntersection;
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

    const body: ImpressionRequest = await req.json();
    const { video_id, context, watched_full_15s, sequence_position = 1 } = body;

    // Calculate is_relevant_viewer server-side
    const isRelevant = await calculateIsRelevant(supabaseClient, userId, video_id);

    console.log(`[log-video-impression] User ${userId}, video ${video_id}, context: ${context}, watched: ${watched_full_15s}, is_relevant: ${isRelevant}`);

    // Insert impression log
    const { error: insertError } = await supabaseClient
      .from('creator_video_impressions')
      .insert({
        creator_video_id: video_id,
        viewer_user_id: userId,
        context,
        watched_full_15s,
        is_relevant_viewer: isRelevant,
        sequence_position,
      });

    if (insertError) {
      console.error('[log-video-impression] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log impression' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[log-video-impression] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
