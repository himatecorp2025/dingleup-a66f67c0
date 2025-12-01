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

// Tables to export in order (respecting foreign key dependencies)
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
