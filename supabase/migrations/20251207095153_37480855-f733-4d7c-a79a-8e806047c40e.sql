-- Drop lootbox tables completely
DROP TABLE IF EXISTS public.lootbox_instances CASCADE;
DROP TABLE IF EXISTS public.lootbox_daily_plan CASCADE;

-- Drop any related RPC functions
DROP FUNCTION IF EXISTS public.generate_lootbox_daily_plan CASCADE;
DROP FUNCTION IF EXISTS public.open_lootbox_transaction CASCADE;
DROP FUNCTION IF EXISTS public.deliver_lootbox_slot CASCADE;