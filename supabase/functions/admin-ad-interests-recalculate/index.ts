import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecalculateAdInterestsResponse {
  processedUsers: number;
  processedUserTopicPairs: number;
  updatedAt: string;
}

Deno.serve(async (req) => {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseServiceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Ad Interests Recalculate] Starting recalculation...');

    // Fetch all user_topic_stats
    const { data: userTopicStats, error: statsError } = await supabaseServiceClient
      .from('user_topic_stats')
      .select('user_id, topic_id, answered_count, correct_count');

    if (statsError) {
      console.error('Error fetching user_topic_stats:', statsError);
      throw new Error('Failed to fetch user topic stats');
    }

    console.log(`[Ad Interests] Fetched ${userTopicStats?.length || 0} user-topic stats`);

    // Calculate interest scores
    const userMap = new Map<string, Map<number, { answered: number; correct: number }>>();

    // Group by user
    for (const stat of userTopicStats || []) {
      if (!userMap.has(stat.user_id)) {
        userMap.set(stat.user_id, new Map());
      }
      const topicMap = userMap.get(stat.user_id)!;
      topicMap.set(stat.topic_id, {
        answered: stat.answered_count || 0,
        correct: stat.correct_count || 0,
      });
    }

    console.log(`[Ad Interests] Processing ${userMap.size} unique users`);

    const interestRecords: Array<{
      user_id: string;
      topic_id: number;
      interest_score: number;
      last_update: string;
    }> = [];

    // Calculate normalized scores per user
    for (const [userId, topicMap] of userMap.entries()) {
      // Find max values for this user across all topics
      let maxAnswered = 0;
      let maxCorrect = 0;

      for (const stats of topicMap.values()) {
        maxAnswered = Math.max(maxAnswered, stats.answered);
        maxCorrect = Math.max(maxCorrect, stats.correct);
      }

      // Normalize and calculate interest score for each topic
      for (const [topicId, stats] of topicMap.entries()) {
        const normalizedAnswered = maxAnswered > 0 ? stats.answered / maxAnswered : 0;
        const correctRate = stats.answered > 0 ? stats.correct / stats.answered : 0;

        // Interest score formula:
        // 60% based on how many questions answered in this topic (engagement)
        // 40% based on correct answer rate (proficiency/interest)
        const interestScore = 
          0.6 * normalizedAnswered +
          0.4 * correctRate;

        // Only store if there's any activity
        if (stats.answered > 0) {
          interestRecords.push({
            user_id: userId,
            topic_id: topicId,
            interest_score: Math.max(0, Math.min(1, interestScore)), // Clamp to 0-1
            last_update: new Date().toISOString(),
          });
        }
      }
    }

    console.log(`[Ad Interests] Calculated ${interestRecords.length} interest records`);

    // Batch upsert to database (chunk into groups of 1000)
    const chunkSize = 1000;
    let totalUpserted = 0;

    for (let i = 0; i < interestRecords.length; i += chunkSize) {
      const chunk = interestRecords.slice(i, i + chunkSize);
      
      const { error: upsertError } = await supabaseServiceClient
        .from('user_ad_interest_candidates')
        .upsert(chunk, {
          onConflict: 'user_id,topic_id',
        });

      if (upsertError) {
        console.error('Error upserting chunk:', upsertError);
        throw new Error(`Failed to upsert chunk: ${upsertError.message}`);
      }

      totalUpserted += chunk.length;
      console.log(`[Ad Interests] Upserted ${totalUpserted}/${interestRecords.length} records`);
    }

    const response: RecalculateAdInterestsResponse = {
      processedUsers: userMap.size,
      processedUserTopicPairs: totalUpserted,
      updatedAt: new Date().toISOString(),
    };

    console.log('[Ad Interests Recalculate] Completed successfully:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Ad Interests Recalculate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
