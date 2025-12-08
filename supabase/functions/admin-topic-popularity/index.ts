import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface TopicStatsRow {
  topicId: number;
  topicName: string;
  correctAnswers: number;
  incorrectAnswers: number;
  totalAnswers: number;
  correctPercentage: number;
  countryCode: string | null;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not logged in' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query params for country filter
    const url = new URL(req.url);
    const countryFilter = url.searchParams.get('country'); // null = all countries

    // Get all topics
    const { data: topicsData, error: topicsError } = await supabaseClient
      .from('topics')
      .select('id, name');

    if (topicsError) {
      console.error('[admin-topic-popularity] Error fetching topics:', topicsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch topics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get question analytics with optional country filter
    // We need to join with profiles to get country_code
    let analyticsQuery = supabaseClient
      .from('game_question_analytics')
      .select(`
        question_id,
        was_correct,
        user_id
      `);

    const { data: analyticsData, error: analyticsError } = await analyticsQuery;

    if (analyticsError) {
      console.error('[admin-topic-popularity] Error fetching analytics:', analyticsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profiles for country filtering
    let profilesQuery = supabaseClient
      .from('profiles')
      .select('id, country_code');
    
    if (countryFilter && countryFilter !== 'ALL') {
      profilesQuery = profilesQuery.eq('country_code', countryFilter);
    }

    const { data: profilesData, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('[admin-topic-popularity] Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user ID set for country filtering
    const userIdsInCountry = new Set(profilesData?.map(p => p.id) || []);

    // Get questions with topic_id
    const { data: questionsData, error: questionsError } = await supabaseClient
      .from('questions')
      .select('id, topic_id');

    if (questionsError) {
      console.error('[admin-topic-popularity] Error fetching questions:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create question_id -> topic_id map
    const questionTopicMap = new Map<string, number>();
    (questionsData || []).forEach((q: any) => {
      questionTopicMap.set(q.id, q.topic_id);
    });

    // Aggregate by topic
    const topicStats = new Map<number, { correct: number; incorrect: number }>();
    
    // Initialize all topics
    (topicsData || []).forEach((topic: any) => {
      topicStats.set(topic.id, { correct: 0, incorrect: 0 });
    });

    // Count correct/incorrect answers per topic
    (analyticsData || []).forEach((row: any) => {
      // Apply country filter
      if (countryFilter && countryFilter !== 'ALL' && !userIdsInCountry.has(row.user_id)) {
        return;
      }

      const topicId = questionTopicMap.get(row.question_id);
      if (topicId !== undefined) {
        const stats = topicStats.get(topicId);
        if (stats) {
          if (row.was_correct) {
            stats.correct++;
          } else {
            stats.incorrect++;
          }
        }
      }
    });

    // Build response data
    const popularityData: TopicStatsRow[] = (topicsData || []).map((topic: any) => {
      const stats = topicStats.get(topic.id) || { correct: 0, incorrect: 0 };
      const total = stats.correct + stats.incorrect;
      const percentage = total > 0 ? Math.round((stats.correct / total) * 100 * 10) / 10 : 0;
      
      return {
        topicId: topic.id,
        topicName: topic.name,
        correctAnswers: stats.correct,
        incorrectAnswers: stats.incorrect,
        totalAnswers: total,
        correctPercentage: percentage,
        countryCode: countryFilter || 'ALL',
      };
    });

    // Sort by correct answers descending, then by topicName ascending
    popularityData.sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return a.topicName.localeCompare(b.topicName);
    });

    // Get unique countries for filter dropdown
    const { data: uniqueCountries, error: countriesError } = await supabaseClient
      .from('profiles')
      .select('country_code')
      .not('country_code', 'is', null);

    const countrySet = new Set<string>();
    (uniqueCountries || []).forEach((p: any) => {
      if (p.country_code) countrySet.add(p.country_code);
    });

    console.log(`[admin-topic-popularity] Returning ${popularityData.length} topics, country filter: ${countryFilter || 'ALL'}`);

    return new Response(
      JSON.stringify({
        data: popularityData,
        availableCountries: Array.from(countrySet).sort(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-topic-popularity] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
