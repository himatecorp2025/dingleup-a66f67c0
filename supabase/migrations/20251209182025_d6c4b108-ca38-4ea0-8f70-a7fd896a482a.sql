-- First: Remove booster_purchases referencing PREMIUM and INSTANT_RESCUE
DELETE FROM public.booster_purchases 
WHERE booster_type_id IN (
  SELECT id FROM public.booster_types WHERE code IN ('PREMIUM', 'INSTANT_RESCUE')
);

-- Now remove real-money boosters from booster_types
DELETE FROM public.booster_types WHERE code IN ('PREMIUM', 'INSTANT_RESCUE');

-- Remove purchases table (Stripe payments)
DROP TABLE IF EXISTS public.purchases;

-- Remove speed_tokens entries from PREMIUM_BOOSTER or PURCHASE sources
DELETE FROM public.speed_tokens WHERE source IN ('PREMIUM_BOOSTER', 'PURCHASE');

-- Remove user_purchase_settings table
DROP TABLE IF EXISTS public.user_purchase_settings;

-- Remove user_premium_booster_state table 
DROP TABLE IF EXISTS public.user_premium_booster_state;