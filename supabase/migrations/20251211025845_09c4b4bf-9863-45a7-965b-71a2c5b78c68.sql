-- Update lives_regeneration_rate from 720 seconds (12 min) to 60 seconds for all users
UPDATE public.profiles
SET lives_regeneration_rate = 60
WHERE lives_regeneration_rate = 720 OR lives_regeneration_rate IS NULL;

-- Also update default value in case new users are created
ALTER TABLE public.profiles 
ALTER COLUMN lives_regeneration_rate SET DEFAULT 60;