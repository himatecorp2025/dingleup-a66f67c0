-- Add new video reward sources to wallet_ledger source check constraint (including all existing values)
ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_source_check;

ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_source_check CHECK (
  source IN (
    'daily', 
    'game', 
    'purchase', 
    'admin', 
    'referral', 
    'rank_reward', 
    'booster', 
    'refund',
    'booster_purchase',
    'game_reward',
    'game_start',
    'invitation',
    'like_popup_reward',
    'lootbox_open_cost',
    'lootbox_reward',
    'video_ad_daily_gift_double',
    'video_ad_game_end_double',
    'weekly_reward',
    'welcome',
    'video_reward_daily_gift',
    'video_reward_end_game', 
    'video_reward_refill'
  )
);