#!/usr/bin/env node

/**
 * Full Database Export Script
 * Exports all data from Supabase database to SQL file with INSERT statements
 * 
 * Usage: node scripts/export-database-full.js > db/full_data_export.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables to export in order (respecting foreign key dependencies) - 100 tables total
// Updated 2025-12-14 - verified against information_schema.tables
const TABLES = [
  // Level 0: No foreign keys - base/config tables (17 tables)
  'topics', 'booster_types', 'legal_documents', 'translations', 'daily_prize_table',
  'weekly_prize_table', 'weekly_login_rewards', 'data_collection_metadata', 
  'engagement_analytics', 'performance_summary', 'rpc_rate_limits',
  'daily_winner_processing_log', 'app_download_links', 'retention_analytics', 
  'tips_tricks_videos', 'subscription_promo_events', 'creator_plans',
  
  // Level 1: Depends on Level 0 (3 tables)
  'profiles', 'questions', 'question_pools',
  
  // Level 2: Depends on profiles (user_id references) (32 tables)
  'user_roles', 'password_history', 'pin_reset_tokens', 'login_attempts', 'login_attempts_pin',
  'question_translations', 'wallet_ledger', 'wallet_ledger_archive',
  'lives_ledger', 'lives_ledger_archive', 'tutorial_progress', 'user_presence', 'speed_tokens',
  'user_sessions', 'user_game_settings', 'user_topic_stats', 'user_ad_interest_candidates',
  'user_cohorts', 'user_engagement_scores', 'user_journey_analytics',
  'user_activity_daily', 'user_activity_pings',
  'question_seen_history', 'subscribers', 'welcome_bonus_attempts', 'typing_status',
  'creator_subscriptions', 'creator_channels', 'creator_admin_notes', 'creator_audit_log',
  'reward_sessions',
  
  // Level 3: Depends on Level 2 (20 tables)
  'game_results', 'game_sessions', 'game_session_pools', 'friendships', 'invitations',
  'daily_rankings', 'global_leaderboard', 
  'leaderboard_cache', 'leaderboard_public_cache', 
  'daily_leaderboard_snapshot',
  'daily_winner_awarded', 'weekly_winner_awarded', 'daily_winners_popup_views',
  'daily_winner_popup_shown', 'weekly_login_state',
  'booster_purchases', 'friend_request_rate_limit', 'admin_audit_log',
  'creator_videos', 'video_ad_rewards',
  
  // Level 4: Depends on Level 3 (10 tables)
  'game_question_analytics', 'game_question_analytics_archive', 'game_help_usage', 
  'game_exit_events', 'dm_threads',
  'creator_video_countries', 'creator_video_topics', 'creator_video_impressions',
  'creator_analytics_daily', 'ad_events',
  
  // Level 5: Depends on Level 4 (4 tables)
  'dm_messages', 'message_reads', 'messages', 'thread_participants',
  
  // Level 6: Depends on Level 5 (2 tables)
  'message_media', 'message_reactions',
  
  // Analytics tables - no strict FK dependencies (12 tables)
  'app_session_events', 'app_session_events_archive', 'navigation_events', 
  'feature_usage_events', 'feature_usage_events_archive',
  'bonus_claim_events', 'chat_interaction_events', 'conversion_events', 
  'error_logs', 'performance_metrics', 'device_geo_analytics', 
  'session_details', 'reports',
];

/**
 * Escape SQL string values
 */
function escapeSqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }
  
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Generate INSERT statement for a row
 */
function generateInsert(tableName, row, columns) {
  const values = columns.map(col => escapeSqlString(row[col])).join(', ');
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values});`;
}

/**
 * Export table data
 */
async function exportTable(tableName) {
  console.error(`\n-- Exporting table: ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(100000);
    
    if (error) {
      console.error(`-- Error exporting ${tableName}: ${error.message}`);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log(`-- Table ${tableName} is empty\n`);
      return;
    }
    
    console.log(`\n-- Data for table: ${tableName}`);
    console.log(`-- Rows: ${data.length}\n`);
    
    const columns = Object.keys(data[0]);
    
    // Disable triggers during import for performance
    console.log(`ALTER TABLE public.${tableName} DISABLE TRIGGER ALL;`);
    
    for (const row of data) {
      console.log(generateInsert(tableName, row, columns));
    }
    
    // Re-enable triggers
    console.log(`ALTER TABLE public.${tableName} ENABLE TRIGGER ALL;\n`);
    
    console.error(`✓ Exported ${data.length} rows from ${tableName}`);
  } catch (err) {
    console.error(`-- Exception exporting ${tableName}: ${err.message}`);
  }
}

/**
 * Main export function
 */
async function exportDatabase() {
  console.log(`-- DingleUP! Full Database Export`);
  console.log(`-- Generated: ${new Date().toISOString()}`);
  console.log(`-- Source: ${supabaseUrl}\n`);
  
  console.log(`-- ============================================`);
  console.log(`-- INSTRUCTIONS FOR IMPORT`);
  console.log(`-- ============================================`);
  console.log(`-- 1. First, apply the schema: psql -U postgres -d dingleup -f db/schema_latest.sql`);
  console.log(`-- 2. Then, import this data: psql -U postgres -d dingleup -f db/full_data_export.sql`);
  console.log(`-- 3. Verify: psql -U postgres -d dingleup -c "SELECT COUNT(*) FROM profiles;"`);
  console.log(`-- ============================================\n`);
  
  console.log(`BEGIN;\n`);
  
  // Export all tables
  for (const table of TABLES) {
    await exportTable(table);
  }
  
  console.log(`COMMIT;\n`);
  console.log(`-- Export completed successfully!`);
  
  console.error('\n✓ Database export completed!');
  console.error('Save the output to: db/full_data_export.sql');
}

// Run export
exportDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
