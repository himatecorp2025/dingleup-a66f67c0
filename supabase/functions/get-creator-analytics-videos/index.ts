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

    // Get params from request body
    const body = await req.json().catch(() => ({}));
    const platform = body.platform;
    const status = body.status; // 'active', 'expired', 'all'
    const search = body.search;
    const sortBy = body.sortBy || 'relevant_hits';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
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
      .eq('user_id', userId);

    // Platform filter
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform.toLowerCase());
    }

    // Status filter
    const now = new Date().toISOString();
    if (status === 'active') {
      query = query.eq('is_active', true).gt('expires_at', now);
    } else if (status === 'expired') {
      query = query.or(`is_active.eq.false,expires_at.lt.${now}`);
    }

    // Search filter (video_url or platform)
    if (search) {
      query = query.or(`video_url.ilike.%${search}%,platform.ilike.%${search}%`);
    }

    const { data: videos, error: videosError } = await query;

    if (videosError) {
      console.error('Error fetching videos:', videosError);
      return new Response(JSON.stringify({ error: 'Failed to fetch videos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get real-time impressions
    const videoIds = videos?.map(v => v.id) || [];
    
    let impressions: any[] = [];
    if (videoIds.length > 0) {
      const { data: impData } = await supabase
        .from('creator_video_impressions')
        .select('creator_video_id, watched_full_15s, is_relevant_viewer')
        .in('creator_video_id', videoIds);
      impressions = impData || [];
    }

    // Aggregate impressions per video
    const videoStats: Record<string, { imp: number; comp: number; rel: number }> = {};
    for (const imp of impressions) {
      if (!videoStats[imp.creator_video_id]) {
        videoStats[imp.creator_video_id] = { imp: 0, comp: 0, rel: 0 };
      }
      videoStats[imp.creator_video_id].imp++;
      if (imp.watched_full_15s) videoStats[imp.creator_video_id].comp++;
      if (imp.is_relevant_viewer) videoStats[imp.creator_video_id].rel++;
    }

    // Get topics for videos
    let topicsMap: Record<string, Array<{ id: number; name: string }>> = {};
    if (videoIds.length > 0) {
      const { data: videoTopics } = await supabase
        .from('creator_video_topics')
        .select('creator_video_id, topic_id, topics:topic_id(id, name)')
        .in('creator_video_id', videoIds);

      if (videoTopics) {
        for (const vt of videoTopics) {
          if (!topicsMap[vt.creator_video_id]) {
            topicsMap[vt.creator_video_id] = [];
          }
          if (vt.topics) {
            topicsMap[vt.creator_video_id].push(vt.topics as any);
          }
        }
      }
    }

    // Enrich videos with real-time stats and topics
    const enrichedVideos = (videos || []).map(video => {
      const live = videoStats[video.id] || { imp: 0, comp: 0, rel: 0 };
      const isExpired = video.expires_at && new Date(video.expires_at) < new Date();
      const isExpiringSoon = video.expires_at && 
        new Date(video.expires_at) > new Date() && 
        new Date(video.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      return {
        ...video,
        impressions: live.imp || video.total_impressions || 0,
        completions: live.comp || video.total_video_completions || 0,
        relevant_hits: live.rel || video.total_relevant_hits || 0,
        clickthrough: video.total_clickthrough || 0,
        topics: topicsMap[video.id] || [],
        status_badge: isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'active',
      };
    });

    // Sort
    enrichedVideos.sort((a, b) => {
      switch (sortBy) {
        case 'impressions':
          return b.impressions - a.impressions;
        case 'completions':
          return b.completions - a.completions;
        case 'clickthrough':
          return b.clickthrough - a.clickthrough;
        case 'activated_at':
          return new Date(b.first_activated_at || b.created_at).getTime() - 
                 new Date(a.first_activated_at || a.created_at).getTime();
        case 'relevant_hits':
        default:
          return b.relevant_hits - a.relevant_hits;
      }
    });

    console.log(`[get-creator-analytics-videos] User ${userId}, platform: ${platform || 'all'}, videos: ${enrichedVideos.length}`);

    return new Response(JSON.stringify({ videos: enrichedVideos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-creator-analytics-videos:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
