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
  'user_cohorts', 'user_engagement_scores', 'user_journey_analytics', 'user_like_prompt_tracking',
  'user_premium_booster_state', 'user_purchase_settings', 'user_activity_daily', 'user_activity_pings',
  'question_seen_history', 'subscribers', 'welcome_bonus_attempts', 'typing_status',
  
  // Level 3: Depends on Level 2
  'game_results', 'game_sessions', 'game_session_pools', 'friendships', 'invitations',
  'daily_rankings', 'weekly_rankings', 'global_leaderboard', 'leaderboard_cache',
  'leaderboard_public_cache', 'daily_leaderboard_snapshot', 'weekly_leaderboard_snapshot',
  'daily_winner_awarded', 'weekly_winner_awarded', 'daily_winners_popup_views',
  'daily_winner_popup_shown', 'weekly_winner_popup_shown', 'weekly_login_state',
  'lootbox_instances', 'lootbox_daily_plan', 'purchases', 'booster_purchases',
  'question_likes', 'question_dislikes', 'question_reactions', 'like_prompt_tracking',
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

function inferPgType(value: unknown, colName: string): string {
  if (value === null || value === undefined) {
    if (colName === 'id' || colName.endsWith('_id')) return 'UUID';
    if (colName.includes('_at') || colName.includes('date')) return 'TIMESTAMPTZ';
    if (colName === 'email') return 'TEXT';
    return 'TEXT';
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (Array.isArray(value)) return 'TEXT[]';
  if (typeof value === 'object') return 'JSONB';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'TIMESTAMPTZ';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'DATE';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'UUID';
    return 'TEXT';
  }
  return 'TEXT';
}

function generateInsert(tableName: string, row: Record<string, unknown>, columns: string[]): string {
  const values = columns.map((col) => escapeSqlValue(row[col])).join(', ');
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values});`;
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
        
        const { data: firstRow, error } = await supabase.from(tableName).select('*').limit(1);
        
        if (error || !firstRow || firstRow.length === 0) {
          output += `-- Table ${tableName}: skipped (empty or not found)\n\n`;
          continue;
        }

        const columns = Object.keys(firstRow[0]);
        const colDefs = columns.map(col => {
          const val = firstRow[0][col];
          const type = inferPgType(val, col);
          return `  ${col} ${type}`;
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

        const { data: firstRow } = await supabase.from(tableName).select('*').limit(1);
        
        if (!firstRow || firstRow.length === 0) {
          output += `-- Table ${tableName} is empty or does not exist\n\n`;
          continue;
        }

        const columns = Object.keys(firstRow[0]);
        const colDefs = columns.map(col => {
          const val = firstRow[0][col];
          const type = inferPgType(val, col);
          return `  ${col} ${type}`;
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
            output += generateInsert(tableName, row, columns) + '\n';
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
