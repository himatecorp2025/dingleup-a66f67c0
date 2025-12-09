import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders('*');

// Tables in STRICT foreign key dependency order
const TABLES = [
  // Level 0: No foreign keys
  'topics', 'booster_types', 'legal_documents', 'translations', 'daily_prize_table',
  'data_collection_metadata', 'engagement_analytics', 'performance_summary', 'rpc_rate_limits',
  'daily_winner_processing_log', 'app_download_links', 'weekly_prize_table', 'weekly_login_rewards',
  'retention_analytics', 'tips_tricks_videos', 'subscription_promo_events',
  
  // Level 1: Depends on Level 0
  'profiles', 'questions', 'question_pools',
  
  // Level 2: Depends on profiles
  'user_roles', 'password_history', 'pin_reset_tokens', 'login_attempts', 'login_attempts_pin',
  'question_translations', 'wallet_ledger', 'wallet_ledger_archive',
  'lives_ledger', 'lives_ledger_archive', 'tutorial_progress', 'user_presence', 'speed_tokens',
  'user_sessions', 'user_game_settings', 'user_topic_stats', 'user_ad_interest_candidates',
  'user_cohorts', 'user_engagement_scores', 'user_journey_analytics',
  'user_premium_booster_state', 'user_purchase_settings', 'user_activity_daily', 'user_activity_pings',
  'question_seen_history', 'subscribers', 'welcome_bonus_attempts', 'typing_status',
  
  // Level 3: Depends on Level 2
  'game_results', 'game_sessions', 'game_session_pools', 'friendships', 'invitations',
  'daily_rankings', 'weekly_rankings', 'global_leaderboard', 'leaderboard_cache',
  'leaderboard_public_cache', 'daily_leaderboard_snapshot', 'weekly_leaderboard_snapshot',
  'daily_winner_awarded', 'weekly_winner_awarded', 'daily_winners_popup_views',
  'daily_winner_popup_shown', 'weekly_winner_popup_shown', 'weekly_login_state',
  'purchases', 'booster_purchases',
  'friend_request_rate_limit', 'admin_audit_log',
  
  // Level 4: Depends on Level 3
  'game_question_analytics', 'game_help_usage', 'dm_threads', 'conversations',
  
  // Level 5: Depends on Level 4
  'dm_messages', 'message_reads', 'conversation_members', 'messages', 'thread_participants',
  
  // Level 6: Depends on Level 5
  'message_media', 'message_reactions',
  
  // Analytics tables
  'app_session_events', 'navigation_events', 'feature_usage_events', 'game_exit_events',
  'bonus_claim_events', 'chat_interaction_events', 'conversion_events', 'error_logs',
  'performance_metrics', 'device_geo_analytics', 'session_details', 'reports',
];

// Map PostgreSQL data_type to SQL DDL type
function mapPgType(dataType: string, udtName: string): string {
  const dt = dataType.toLowerCase();
  if (dt === 'uuid') return 'UUID';
  if (dt === 'text') return 'TEXT';
  if (dt === 'character varying') return 'TEXT';
  if (dt === 'integer') return 'INTEGER';
  if (dt === 'bigint') return 'BIGINT';
  if (dt === 'smallint') return 'SMALLINT';
  if (dt === 'boolean') return 'BOOLEAN';
  if (dt === 'numeric' || dt === 'real' || dt === 'double precision') return 'NUMERIC';
  if (dt === 'jsonb') return 'JSONB';
  if (dt === 'json') return 'JSON';
  if (dt === 'date') return 'DATE';
  if (dt === 'timestamp with time zone') return 'TIMESTAMPTZ';
  if (dt === 'timestamp without time zone') return 'TIMESTAMP';
  if (dt === 'array') return udtName.replace(/^_/, '') + '[]';
  if (dt === 'user-defined' && udtName === 'app_role') return 'app_role';
  return 'TEXT';
}

function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (Array.isArray(value)) {
    const arrayValues = value.map(v => {
      if (typeof v === 'string') return `"${v.replace(/"/g, '\\"')}"`;
      return String(v);
    }).join(',');
    return `'{${arrayValues}}'`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsert(tableName: string, row: Record<string, unknown>, columns: string[]): string {
  const values = columns.map((col) => escapeSqlValue(row[col])).join(', ');
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values});`;
}

// Fetch actual schema from information_schema using RPC
// deno-lint-ignore no-explicit-any
async function fetchTableSchema(
  supabase: any, 
  tableName: string
): Promise<Array<{column_name: string, data_type: string, udt_name: string}>> {
  const { data, error } = await supabase.rpc('get_table_column_types', { 
    p_table_name: tableName 
  });
  
  if (error || !data) {
    console.log(`Schema fetch failed for ${tableName}:`, error?.message);
    return [];
  }
  
  return data as Array<{column_name: string, data_type: string, udt_name: string}>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req.headers.get('origin'));
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    let userId: string | null = null;
    try {
      const payloadPart = token.split('.')[1];
      const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      userId = JSON.parse(payloadJson).sub ?? null;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JWT token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid user in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse export type from query params
    const url = new URL(req.url);
    const exportType = url.searchParams.get('type') || 'full';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Admin check
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Starting database export (type: ${exportType}) for admin:`, userId);

    let output = '';
    const timestamp = new Date().toISOString();
    const PAGE_SIZE = 1000;
    
    if (exportType === 'schema') {
      // SCHEMA ONLY EXPORT (CREATE TABLE statements)
      output += `-- ============================================\n`;
      output += `-- DingleUP! Database Schema Export (CREATE TABLE)\n`;
      output += `-- Generated: ${timestamp}\n`;
      output += `-- ============================================\n\n`;
      output += `-- Extensions\n`;
      output += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
      output += `CREATE EXTENSION IF NOT EXISTS "pg_trgm";\n\n`;
      output += `-- Enum Types\n`;
      output += `DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n\n`;

      for (const tableName of TABLES) {
        console.log(`Schema export: ${tableName}`);
        
        // Get ACTUAL schema from information_schema
        const schemaInfo = await fetchTableSchema(supabase, tableName);
        
        if (!schemaInfo || schemaInfo.length === 0) {
          output += `-- Table ${tableName}: skipped (not found in information_schema)\n\n`;
          continue;
        }

        const colDefs = schemaInfo.map(col => {
          const pgType = mapPgType(col.data_type, col.udt_name);
          return `  ${col.column_name} ${pgType}`;
        });
        
        output += `-- ============================================\n`;
        output += `-- Table: ${tableName}\n`;
        output += `-- ============================================\n`;
        output += `DROP TABLE IF EXISTS public.${tableName} CASCADE;\n`;
        output += `CREATE TABLE public.${tableName} (\n${colDefs.join(',\n')}\n);\n\n`;
      }

      output += `-- Schema export complete\n`;
      
      return new Response(output, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="dingleup_schema_${timestamp.split('T')[0]}.sql"`,
        },
      });

    } else if (exportType === 'data') {
      // DATA ONLY EXPORT (INSERT statements)
      output += `-- ============================================\n`;
      output += `-- DingleUP! Database Data Export (INSERT)\n`;
      output += `-- Generated: ${timestamp}\n`;
      output += `-- ============================================\n\n`;
      output += `-- IMPORT INSTRUCTIONS:\n`;
      output += `-- 1. First import the schema file\n`;
      output += `-- 2. Then run: psql -U postgres -d dingleup -f this_file.sql\n`;
      output += `-- ============================================\n\n`;
      output += `BEGIN;\n`;
      output += `SET session_replication_role = 'replica';\n`;
      output += `SET CONSTRAINTS ALL DEFERRED;\n\n`;

      let totalRowsExported = 0;

      for (const tableName of TABLES) {
        console.log(`Data export: ${tableName}`);
        
        const { data: firstRow, error: firstError } = await supabase.from(tableName).select('*').limit(1);
        
        if (firstError || !firstRow || firstRow.length === 0) {
          output += `-- Table ${tableName}: empty or not found\n\n`;
          continue;
        }

        const columns = Object.keys(firstRow[0]);
        output += `-- ============================================\n`;
        output += `-- Data: ${tableName}\n`;
        output += `-- ============================================\n`;
        output += `TRUNCATE TABLE public.${tableName} CASCADE;\n`;

        let offset = 0;
        let tableRows = 0;

        while (true) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) {
            output += `-- ERROR: ${error.message}\n`;
            break;
          }

          if (!data || data.length === 0) break;

          for (const row of data as Record<string, unknown>[]) {
            output += generateInsert(tableName, row, columns) + '\n';
          }

          tableRows += data.length;
          offset += data.length;

          if (data.length < PAGE_SIZE) break;
        }

        output += `-- Rows: ${tableRows}\n\n`;
        totalRowsExported += tableRows;
      }

      output += `SET session_replication_role = 'origin';\n`;
      output += `COMMIT;\n\n`;
      output += `-- Data export complete: ${totalRowsExported} total rows\n`;

      return new Response(output, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="dingleup_data_${timestamp.split('T')[0]}.sql"`,
        },
      });

    } else {
      // FULL EXPORT (both schema and data) - default
      output += `-- ============================================\n`;
      output += `-- DingleUP! Full Database Export (Schema + Data)\n`;
      output += `-- Generated: ${timestamp}\n`;
      output += `-- ============================================\n\n`;
      output += `-- IMPORT INSTRUCTIONS:\n`;
      output += `-- psql -U postgres -d dingleup -f this_file.sql\n`;
      output += `-- ============================================\n\n`;
      output += `BEGIN;\n`;
      output += `SET session_replication_role = 'replica';\n`;
      output += `SET CONSTRAINTS ALL DEFERRED;\n\n`;
      output += `-- Extensions\n`;
      output += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
      output += `CREATE EXTENSION IF NOT EXISTS "pg_trgm";\n\n`;
      output += `-- Enum Types\n`;
      output += `DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n\n`;

      for (const tableName of TABLES) {
        console.log(`Full export: ${tableName}`);

        // Get ACTUAL schema from information_schema
        const schemaInfo = await fetchTableSchema(supabase, tableName);
        
        if (!schemaInfo || schemaInfo.length === 0) {
          output += `-- Table ${tableName}: skipped (not found)\n\n`;
          continue;
        }

        const columnNames = schemaInfo.map(c => c.column_name);
        const colDefs = schemaInfo.map(col => {
          const pgType = mapPgType(col.data_type, col.udt_name);
          return `  ${col.column_name} ${pgType}`;
        });
        
        output += `-- ============================================\n`;
        output += `-- Table: ${tableName}\n`;
        output += `-- ============================================\n`;
        output += `DROP TABLE IF EXISTS public.${tableName} CASCADE;\n`;
        output += `CREATE TABLE public.${tableName} (\n${colDefs.join(',\n')}\n);\n\n`;

        let offset = 0;
        let totalRows = 0;

        while (true) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) {
            output += `-- ERROR: ${error.message}\n`;
            break;
          }

          if (!data || data.length === 0) break;

          for (const row of data as Record<string, unknown>[]) {
            output += generateInsert(tableName, row, columnNames) + '\n';
          }

          totalRows += data.length;
          offset += data.length;

          if (data.length < PAGE_SIZE) break;
        }

        output += `-- Rows: ${totalRows}\n\n`;
      }

      output += `SET session_replication_role = 'origin';\n`;
      output += `COMMIT;\n\n`;
      output += `-- Export complete\n`;

      return new Response(output, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="dingleup_full_export_${timestamp.split('T')[0]}.sql"`,
        },
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
