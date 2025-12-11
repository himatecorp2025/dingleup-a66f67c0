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
    const days = parseInt(url.searchParams.get('days') || '14');

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

    if (videoIds.length === 0) {
      // Return empty data for all days
      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyData.push({
          date: date.toISOString().split('T')[0],
          impressions: 0,
          completions: 0,
          relevant_hits: 0,
        });
      }
      return new Response(JSON.stringify({ daily: dailyData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get impressions from last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: impressions } = await supabase
      .from('creator_video_impressions')
      .select('creator_video_id, watched_full_15s, is_relevant_viewer, created_at')
      .in('creator_video_id', videoIds)
      .gte('created_at', startDate.toISOString());

    // Aggregate by day
    const dailyMap: Record<string, { impressions: number; completions: number; relevant_hits: number }> = {};

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap[dateStr] = { impressions: 0, completions: 0, relevant_hits: 0 };
    }

    // Aggregate impressions
    if (impressions) {
      for (const imp of impressions) {
        const dateStr = imp.created_at.split('T')[0];
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].impressions++;
          if (imp.watched_full_15s) dailyMap[dateStr].completions++;
          if (imp.is_relevant_viewer) dailyMap[dateStr].relevant_hits++;
        }
      }
    }

    // Convert to array
    const dailyData = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify({ daily: dailyData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-creator-analytics-weekly:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
