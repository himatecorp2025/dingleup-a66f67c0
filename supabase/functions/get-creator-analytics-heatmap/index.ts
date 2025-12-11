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
    const platform = url.searchParams.get('platform');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's videos
    let videoQuery = supabase
      .from('creator_videos')
      .select('id')
      .eq('user_id', userId);

    if (platform && platform !== 'all') {
      videoQuery = videoQuery.eq('platform', platform.toLowerCase());
    }

    const { data: videos } = await videoQuery;
    const videoIds = videos?.map(v => v.id) || [];

    // Initialize heatmap: 7 days x 24 hours
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

    if (videoIds.length === 0) {
      return new Response(JSON.stringify({ heatmap }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get impressions from last 30 days for heatmap
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data: impressions } = await supabase
      .from('creator_video_impressions')
      .select('created_at, is_relevant_viewer')
      .in('creator_video_id', videoIds)
      .eq('is_relevant_viewer', true)
      .gte('created_at', startDate.toISOString());

    // Aggregate by day of week and hour
    if (impressions) {
      for (const imp of impressions) {
        const date = new Date(imp.created_at);
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday
        const hour = date.getUTCHours();
        heatmap[dayOfWeek][hour]++;
      }
    }

    return new Response(JSON.stringify({ heatmap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-creator-analytics-heatmap:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
