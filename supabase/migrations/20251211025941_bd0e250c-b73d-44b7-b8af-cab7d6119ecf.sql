-- Update ALL users to 60 second life regeneration
UPDATE public.profiles
SET lives_regeneration_rate = 60
WHERE lives_regeneration_rate != 60 OR lives_regeneration_rate IS NULL;