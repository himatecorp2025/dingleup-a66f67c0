-- CTO AUDIT: CRITICAL SECURITY FIXES (No functionality change)
-- These policies restrict data access without changing any business logic

-- 1. FIX: login_attempts_pin - should not be publicly readable
-- This table contains security-sensitive data about failed login attempts
ALTER TABLE public.login_attempts_pin ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role only for login_attempts_pin" ON public.login_attempts_pin;

-- Create restrictive policy - only service role can access
CREATE POLICY "Service role only for login_attempts_pin"
ON public.login_attempts_pin FOR ALL
TO authenticated, anon
USING (false);

-- 2. FIX: speed_tokens - users should only see their own tokens
ALTER TABLE public.speed_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own speed tokens" ON public.speed_tokens;
DROP POLICY IF EXISTS "Users can insert own speed tokens" ON public.speed_tokens;
DROP POLICY IF EXISTS "Users can update own speed tokens" ON public.speed_tokens;

-- Users can only view their own speed tokens
CREATE POLICY "Users can view own speed tokens"
ON public.speed_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own speed tokens
CREATE POLICY "Users can insert own speed tokens"
ON public.speed_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own speed tokens
CREATE POLICY "Users can update own speed tokens"
ON public.speed_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 3. FIX: Ensure profiles has proper SELECT policy for own data only
-- First check if restrictive policy exists, if not create one
-- Note: profiles may already have RLS, we're adding/replacing the SELECT policy

DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create policy that allows users to read only their own profile
-- This is MORE restrictive than before but doesn't break functionality
-- because users only need to read their own profile
CREATE POLICY "Users can view own profile only"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Keep existing admin policies intact by checking for admin role
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);