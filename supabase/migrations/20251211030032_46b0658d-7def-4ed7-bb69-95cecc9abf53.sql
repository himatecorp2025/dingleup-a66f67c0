-- Reset last_life_regeneration to now for all users so timer starts fresh
UPDATE public.profiles
SET last_life_regeneration = now();