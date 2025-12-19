import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OPTIMIZED: Fetch only necessary fields (no username needed)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_timezone, daily_gift_last_seen, daily_gift_streak')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw profileError;
    }

    // NOTE: Admins are NOT excluded - they have full access to all features including Daily Gift
    const userTimezone = profile.user_timezone || 'UTC';
    
    // Calculate today's date in user's timezone
    const nowUtc = new Date();
    const localDateString = nowUtc.toLocaleDateString('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Calculate yesterday's date in user's timezone
    const yesterdayUtc = new Date(nowUtc);
    yesterdayUtc.setDate(yesterdayUtc.getDate() - 1);
    const yesterdayDateString = yesterdayUtc.toLocaleDateString('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Check if user has seen the popup today (either claimed or dismissed)
    const lastSeenDate = profile.daily_gift_last_seen;
    const canShow = !lastSeenDate || lastSeenDate !== localDateString;

    // Calculate reward based on streak
    const currentStreak = profile.daily_gift_streak ?? 0;
    const cyclePosition = currentStreak % 7;
    const baseRewardCoins = [50, 75, 110, 160, 220, 300, 500][cyclePosition];

    // TASK 7: Fetch yesterday's rank from daily_rankings
    let yesterdayRank: number | null = null;
    let isTop10Yesterday = false;

    const { data: yesterdayRankData, error: rankError } = await supabase
      .from('daily_rankings')
      .select('rank')
      .eq('user_id', user.id)
      .eq('day_date', yesterdayDateString)
      .maybeSingle();

    if (!rankError && yesterdayRankData?.rank) {
      yesterdayRank = yesterdayRankData.rank;
      isTop10Yesterday = yesterdayRank !== null && yesterdayRank <= 10;
    }

    // Apply TOP10 multiplier: 3x base if user was in TOP10 yesterday, otherwise 1x
    // Ads multiplier: TOP10 = 5x, normal = 2x (calculated on frontend)
    const multiplier = isTop10Yesterday ? 3 : 1;
    const rewardCoins = baseRewardCoins * multiplier;

    console.log('Daily Gift Status:', {
      userId: user.id,
      localDate: localDateString,
      yesterdayDate: yesterdayDateString,
      lastSeenDate,
      canShow,
      streak: currentStreak,
      baseReward: baseRewardCoins,
      multiplier,
      nextReward: rewardCoins,
      yesterdayRank,
      isTop10Yesterday,
    });

    return new Response(
      JSON.stringify({
        canShow,
        localDate: localDateString,
        timeZone: userTimezone,
        streak: currentStreak,
        nextReward: rewardCoins,
        baseReward: baseRewardCoins,
        multiplier,
        yesterdayRank,
        isTop10Yesterday,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-daily-gift-status] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: error instanceof Error ? 'hidden' : undefined,
    });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: message,
        error_code: 'DAILY_GIFT_STATUS_ERROR'
      }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
