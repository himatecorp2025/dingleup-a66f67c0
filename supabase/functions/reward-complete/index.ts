import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardCompleteRequest {
  rewardSessionId: string;
  watchedVideoIds: string[];
  eventType: 'daily_gift' | 'end_game' | 'refill';
  originalReward?: number;
  multiplier?: number; // 1 = declined ad, 2 = watched ad (default for backward compat)
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

    const body: RewardCompleteRequest = await req.json();
    const { rewardSessionId, watchedVideoIds, eventType, originalReward = 0 } = body;
    // FIX: multiplier determines final reward: 1 = declined ad (1×), 2 = watched ad (2×)
    // Default to 2 for backward compatibility with existing video-watched flows
    const multiplier = body.multiplier ?? 2;

    console.log(`[reward-complete] User ${userId}, session: ${rewardSessionId}, watched: ${watchedVideoIds.length}, multiplier: ${multiplier}`);

    // CRITICAL: Idempotency key includes multiplier to prevent abuse
    // e.g., claiming 1× then trying 2× with same session
    const idempotencyKey = `reward-${rewardSessionId}:${multiplier}`;

    // Check idempotency - prevent double claims
    const { data: existingClaim } = await supabaseClient
      .from('wallet_ledger')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingClaim) {
      console.log(`[reward-complete] Already claimed: ${rewardSessionId} with multiplier ${multiplier}`);
      return new Response(
        JSON.stringify({ success: true, already_claimed: true, reward: { coinsDelta: 0, livesDelta: 0 } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also check if this session was already claimed with different multiplier
    const { data: anyExistingClaim } = await supabaseClient
      .from('wallet_ledger')
      .select('id')
      .like('idempotency_key', `reward-${rewardSessionId}:%`)
      .limit(1)
      .maybeSingle();

    if (anyExistingClaim) {
      console.log(`[reward-complete] Session ${rewardSessionId} already claimed with different multiplier`);
      return new Response(
        JSON.stringify({ success: true, already_claimed: true, reward: { coinsDelta: 0, livesDelta: 0 } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For multiplier=2 (watched ad), validate videos were watched
    if (multiplier === 2) {
      const requiredAds = eventType === 'refill' ? 2 : 1;
      
      if (watchedVideoIds.length < requiredAds) {
        console.log(`[reward-complete] Insufficient videos watched: ${watchedVideoIds.length} < ${requiredAds}`);
        return new Response(
          JSON.stringify({ success: false, error: 'INSUFFICIENT_VIDEOS_WATCHED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate reward based on event type and multiplier
    let coinsToCredit = 0;
    let livesToCredit = 0;

    if (eventType === 'refill') {
      // Refill: fixed 500 coins + 5 lives (only if watched ads)
      if (multiplier === 2) {
        coinsToCredit = 500;
        livesToCredit = 5;
      }
      // multiplier=1 for refill = user declined, no reward
    } else if (eventType === 'daily_gift') {
      // Daily gift: base was already credited, this is the ADDITIONAL amount for doubling
      if (multiplier === 2) {
        coinsToCredit = originalReward; // Additional coins to double the base
      }
      // multiplier=1 = declined ad, base already credited, nothing more
    } else if (eventType === 'end_game') {
      // FIX: Game end - credit originalReward × multiplier
      // multiplier=1: user declined ad → 1× base reward
      // multiplier=2: user watched ad → 2× base reward
      coinsToCredit = originalReward * multiplier;
      livesToCredit = 0;
    }

    console.log(`[reward-complete] Crediting ${coinsToCredit} coins, ${livesToCredit} lives`);

    // OPTIMIZATION: Parallel log impressions for all watched videos
    if (watchedVideoIds.length > 0) {
      const impressionPromises = watchedVideoIds.map(async (videoId, i) => {
        const isRelevant = await calculateIsRelevant(supabaseClient, userId, videoId);
        return supabaseClient
          .from('creator_video_impressions')
          .insert({
            creator_video_id: videoId,
            viewer_user_id: userId,
            context: eventType,
            watched_full_15s: true,
            is_relevant_viewer: isRelevant,
            sequence_position: i + 1,
          });
      });
      
      await Promise.all(impressionPromises);
    }

    // Credit wallet using ATOMIC RPC (replaces read-modify-write anti-pattern)
    const { data: walletResult, error: walletError } = await supabaseClient.rpc('credit_wallet', {
      p_user_id: userId,
      p_delta_coins: coinsToCredit,
      p_delta_lives: livesToCredit,
      p_source: `video_reward_${eventType}`,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        reward_session_id: rewardSessionId,
        event_type: eventType,
        original_reward: originalReward,
        multiplier: multiplier,
        watched_video_ids: watchedVideoIds,
      },
    });

    if (walletError) {
      console.error('[reward-complete] credit_wallet RPC error:', walletError);
      return new Response(
        JSON.stringify({ error: 'Failed to credit reward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle idempotency - already processed is success
    if (walletResult?.already_processed) {
      console.log(`[reward-complete] credit_wallet already processed: ${idempotencyKey}`);
    } else if (walletResult?.success === false) {
      console.error('[reward-complete] credit_wallet failed:', walletResult?.error);
      return new Response(
        JSON.stringify({ error: walletResult?.error || 'Failed to credit reward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`[reward-complete] credit_wallet success: +${coinsToCredit} coins, +${livesToCredit} lives`);
    }

    // Mark session as completed with multiplier
    await supabaseClient
      .from('reward_sessions')
      .update({ 
        status: 'completed', 
        multiplier: multiplier,
        completed_at: new Date().toISOString(),
        watched_video_ids: watchedVideoIds,
      })
      .eq('id', rewardSessionId);

    return new Response(
      JSON.stringify({
        success: true,
        reward: {
          coinsDelta: coinsToCredit,
          livesDelta: livesToCredit,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reward-complete] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
