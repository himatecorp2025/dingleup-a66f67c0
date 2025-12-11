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
  is_relevant: boolean;
  sequence_position?: number;
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
    const { video_id, context, watched_full_15s, is_relevant, sequence_position = 1 } = body;

    console.log(`[log-video-impression] User ${userId}, video ${video_id}, context: ${context}, watched: ${watched_full_15s}`);

    // Insert impression log
    const { error: insertError } = await supabaseClient
      .from('creator_video_impressions')
      .insert({
        creator_video_id: video_id,
        viewer_user_id: userId,
        context,
        watched_full_15s,
        is_relevant_viewer: is_relevant,
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
