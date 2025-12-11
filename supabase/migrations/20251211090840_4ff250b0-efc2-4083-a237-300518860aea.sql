-- Drop existing constraint and recreate with ALL source types
ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_source_check;

-- Add constraint with all existing + new video ad sources
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_source_check 
CHECK (source IN (
  -- Existing sources from database
  'booster_purchase',
  'daily',
  'game_reward',
  'game_start',
  'invitation',
  'like_popup_reward',
  'lootbox_open_cost',
  'lootbox_reward',
  'weekly_reward',
  'welcome',
  -- Legacy sources
  'game', 
  'weekly', 
  'purchase', 
  'admin', 
  'welcome_bonus', 
  'refund', 
  'booster', 
  'rank_reward',
  -- New video ad sources
  'video_ad_daily_gift_double',
  'video_ad_game_end_double',
  'video_ad_refill'
));