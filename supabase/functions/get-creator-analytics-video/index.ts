import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    const url = new URL(req.url);
    const videoId = url.searchParams.get('videoId');
    const days = parseInt(url.searchParams.get('days') || '14');

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Video ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('creator_videos')
      .select(`
        id,
        platform,
        video_url,
        embed_url,
        thumbnail_url,
        title,
        first_activated_at,
        expires_at,
        is_active,
        status,
        total_impressions,
        total_video_completions,
        total_relevant_hits,
        total_clickthrough,
        created_at
      `)
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (videoError || !video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get topics
    const { data: videoTopics } = await supabase
      .from('creator_video_topics')
      .select('topic_id, topics:topic_id(id, name)')
      .eq('creator_video_id', videoId);

    const topics = videoTopics?.map(vt => vt.topics).filter(Boolean) || [];

    // Get impressions for stats
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: impressions } = await supabase
      .from('creator_video_impressions')
      .select('watched_full_15s, is_relevant_viewer, created_at')
      .eq('creator_video_id', videoId)
      .gte('created_at', startDate.toISOString());

    // Calculate total stats
    let totalImpressions = 0;
    let totalCompletions = 0;
    let totalRelevantHits = 0;

    // Aggregate by day
    const dailyMap: Record<string, { impressions: number; completions: number; relevant_hits: number; clickthrough: number }> = {};

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap[dateStr] = { impressions: 0, completions: 0, relevant_hits: 0, clickthrough: 0 };
    }

    if (impressions) {
      for (const imp of impressions) {
        totalImpressions++;
        if (imp.watched_full_15s) totalCompletions++;
        if (imp.is_relevant_viewer) totalRelevantHits++;

        const dateStr = imp.created_at.split('T')[0];
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].impressions++;
          if (imp.watched_full_15s) dailyMap[dateStr].completions++;
          if (imp.is_relevant_viewer) dailyMap[dateStr].relevant_hits++;
        }
      }
    }

    const daily = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify({
      video: {
        id: video.id,
        platform: video.platform,
        video_url: video.video_url,
        embed_url: video.embed_url,
        thumbnail_url: video.thumbnail_url,
        title: video.title,
        activated_at: video.first_activated_at,
        expires_at: video.expires_at,
        is_active: video.is_active,
        topics,
        stats: {
          impressions: totalImpressions || video.total_impressions || 0,
          completions: totalCompletions || video.total_video_completions || 0,
          relevant_hits: totalRelevantHits || video.total_relevant_hits || 0,
          clickthrough: video.total_clickthrough || 0,
          daily,
        },
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-creator-analytics-video:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
