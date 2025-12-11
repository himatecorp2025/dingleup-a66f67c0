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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all videos for this creator with aggregated stats
    const { data: videos, error: videosError } = await supabase
      .from('creator_videos')
      .select('id, platform, total_impressions, total_video_completions, total_relevant_hits, total_clickthrough')
      .eq('user_id', userId);

    if (videosError) {
      console.error('Error fetching videos:', videosError);
      return new Response(JSON.stringify({ error: 'Failed to fetch videos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also get real-time stats from impressions table
    const { data: impressions, error: impError } = await supabase
      .from('creator_video_impressions')
      .select('creator_video_id, watched_full_15s, is_relevant_viewer, created_at')
      .in('creator_video_id', videos?.map(v => v.id) || []);

    // Aggregate totals
    let impressions_total = 0;
    let completions_total = 0;
    let relevant_hits_total = 0;
    let clickthrough_total = 0;

    const platform_breakdown: Record<string, {
      impressions: number;
      completions: number;
      relevant_hits: number;
      clickthrough: number;
    }> = {
      tiktok: { impressions: 0, completions: 0, relevant_hits: 0, clickthrough: 0 },
      instagram: { impressions: 0, completions: 0, relevant_hits: 0, clickthrough: 0 },
      youtube: { impressions: 0, completions: 0, relevant_hits: 0, clickthrough: 0 },
      facebook: { impressions: 0, completions: 0, relevant_hits: 0, clickthrough: 0 },
    };

    // Calculate from impressions for real-time accuracy
    const videoImpCounts: Record<string, { imp: number; comp: number; rel: number }> = {};
    
    if (impressions && !impError) {
      for (const imp of impressions) {
        if (!videoImpCounts[imp.creator_video_id]) {
          videoImpCounts[imp.creator_video_id] = { imp: 0, comp: 0, rel: 0 };
        }
        videoImpCounts[imp.creator_video_id].imp++;
        if (imp.watched_full_15s) videoImpCounts[imp.creator_video_id].comp++;
        if (imp.is_relevant_viewer) videoImpCounts[imp.creator_video_id].rel++;
      }
    }

    for (const video of videos || []) {
      const liveStats = videoImpCounts[video.id] || { imp: 0, comp: 0, rel: 0 };
      const imp = liveStats.imp || video.total_impressions || 0;
      const comp = liveStats.comp || video.total_video_completions || 0;
      const rel = liveStats.rel || video.total_relevant_hits || 0;
      const click = video.total_clickthrough || 0;

      impressions_total += imp;
      completions_total += comp;
      relevant_hits_total += rel;
      clickthrough_total += click;

      const platform = (video.platform || 'tiktok').toLowerCase();
      if (platform_breakdown[platform]) {
        platform_breakdown[platform].impressions += imp;
        platform_breakdown[platform].completions += comp;
        platform_breakdown[platform].relevant_hits += rel;
        platform_breakdown[platform].clickthrough += click;
      }
    }

    return new Response(JSON.stringify({
      impressions_total,
      completions_total,
      relevant_hits_total,
      clickthrough_total,
      platform_breakdown,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-creator-analytics-overview:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
