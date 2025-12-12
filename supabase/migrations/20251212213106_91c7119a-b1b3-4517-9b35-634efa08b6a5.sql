
-- Drop 7 obsolete tables (no active functionality)
-- Verified empty and unused as of 2025-12-12

-- 1. Group chat tables (chat feature removed)
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- 2. Email-based authentication (replaced by username+PIN)
DROP TABLE IF EXISTS email_verifications CASCADE;

-- 3. Tips and tricks videos (never implemented)
DROP TABLE IF EXISTS tips_and_tricks_videos CASCADE;

-- 4. Weekly system tables (only daily system active)
DROP TABLE IF EXISTS weekly_leaderboard_snapshot CASCADE;
DROP TABLE IF EXISTS weekly_rankings CASCADE;
DROP TABLE IF EXISTS weekly_winner_popup_shown CASCADE;
