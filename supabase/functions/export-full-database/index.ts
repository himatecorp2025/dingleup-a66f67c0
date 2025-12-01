import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders('*');

// Tables to export in dependency-safe order (copied from scripts/export-database-full.js)
const TABLES = [
  // Core user tables
  'profiles',
  'user_roles',
  'password_history',
  'pin_reset_tokens',
  'login_attempts',
  'login_attempts_pin',

  // Content tables
  'topics',
  'questions',
  'question_pools',
  'question_translations',
  'translations',
  'legal_documents',

  // User data
  'wallet_ledger',
  'lives_ledger',
  'game_results',
  'game_sessions',
  'game_session_pools',
  'game_question_analytics',
  'game_help_usage',

  // Social features
  'friendships',
  'invitations',
  'dm_threads',
  'dm_messages',
  'message_reads',

  // Leaderboards
  'daily_rankings',
  'global_leaderboard',
  'leaderboard_cache',
  'daily_leaderboard_snapshot',
  'daily_winner_awarded',
  'daily_winners_popup_views',

  // Lootbox system
  'lootbox_instances',
  'lootbox_daily_plan',

  // Monetization
  'purchases',
  'booster_types',
  'booster_purchases',

  // Analytics tables
  'app_session_events',
  'navigation_events',
  'feature_usage_events',
  'game_exit_events',
  'error_logs',
  'performance_metrics',
  'device_geo_analytics',

  // Other tables
  'user_presence',
  'tutorial_progress',
  'question_likes',
  'question_reactions',
];

function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') return value.toString();

  // Dates come as strings from Supabase client
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  // JSON / objects
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsert(tableName: string, row: Record<string, unknown>, columns: string[]): string {
  const values = columns.map((col) => escapeSqlValue(row[col])).join(', ');
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values});`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req.headers.get('origin'));
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Decode JWT to get user id (sub)
    let userId: string | null = null;
    try {
      const payloadPart = token.split('.')[1];
      const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      userId = payload.sub ?? null;
    } catch (e) {
      console.error('Failed to decode JWT payload:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JWT token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid user in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Backend admin check using user_roles table
    const { data: adminRole, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminError) {
      console.error('Admin role check error:', adminError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('Starting full database export for admin user:', userId);

    let output = '';

    output += `-- DingleUP! Full Database Export\n`;
    output += `-- Generated: ${new Date().toISOString()}\n`;
    output += `-- Source: ${supabaseUrl}\n\n`;

    output += `-- ============================================\n`;
    output += `-- INSTRUCTIONS FOR IMPORT\n`;
    output += `-- ============================================\n`;
    output += `-- 1. First, apply the schema: psql -U postgres -d dingleup -f db/schema_latest.sql\n`;
    output += `-- 2. Then, import this data: psql -U postgres -d dingleup -f db/full_data_export.sql\n`;
    output += `-- 3. Verify: psql -U postgres -d dingleup -c "SELECT COUNT(*) FROM profiles;"\n`;
    output += `-- ============================================\n\n`;

    output += `BEGIN;\n\n`;

    for (const table of TABLES) {
      console.log(`Exporting table: ${table}`);

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(100000);

      if (error) {
        console.error(`Error exporting ${table}:`, error);
        // Include error as SQL comment so export remains usable
        output += `-- ERROR exporting table ${table}: ${error.message}\n\n`;
        continue;
      }

      if (!data || data.length === 0) {
        output += `-- Table ${table} is empty\n\n`;
        continue;
      }

      output += `\n-- Data for table: ${table}\n`;
      output += `-- Rows: ${data.length}\n\n`;

      const columns = Object.keys(data[0]);

      // Disable triggers during import for performance
      output += `ALTER TABLE public.${table} DISABLE TRIGGER ALL;\n`;

      for (const row of data as Record<string, unknown>[]) {
        output += generateInsert(table, row, columns) + '\n';
      }

      // Re-enable triggers
      output += `ALTER TABLE public.${table} ENABLE TRIGGER ALL;\n\n`;
    }

    output += `COMMIT;\n\n`;
    output += `-- Export completed successfully!\n`;

    console.log('Export completed, size (chars):', output.length);

    return new Response(output, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="dingleup_full_export_${new Date()
          .toISOString()
          .split('T')[0]}.sql"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error in export-full-database function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
