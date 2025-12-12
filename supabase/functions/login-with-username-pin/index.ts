import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

// Simple SHA-256 hash using Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return new Response(
        JSON.stringify({ error: 'Missing username or PIN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUsername = username.trim();

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check rate limiting (skip for test users during load testing)
    const isTestUser = normalizedUsername.toLowerCase().startsWith('testuser');
    
    // Skip rate limiting for admin users (temporary - 7 days from Dec 12, 2025)
    const { data: adminCheckProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', normalizedUsername)
      .maybeSingle();
    
    let isAdminUser = false;
    if (adminCheckProfile) {
      const { data: adminRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', adminCheckProfile.id)
        .eq('role', 'admin')
        .maybeSingle();
      isAdminUser = !!adminRole;
    }
    
    if (!isTestUser && !isAdminUser) {
      const { data: rateLimitData } = await supabaseAdmin
        .from('login_attempts_pin')
        .select('locked_until')
        .eq('username', normalizedUsername.toLowerCase())
        .maybeSingle();

      if (rateLimitData?.locked_until) {
        const lockedUntil = new Date(rateLimitData.locked_until);
        if (lockedUntil > new Date()) {
          const minutesRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
          return new Response(
            JSON.stringify({ 
              error: `Too many failed attempts. Try again in ${minutesRemaining} minutes.` 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Find user by username and get auth email (CRITICAL: need actual auth email!)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, pin_hash')
      .ilike('username', normalizedUsername)
      .maybeSingle();

    if (profileError || !profile) {
      await recordFailedAttempt(supabaseAdmin, normalizedUsername);
      return new Response(
        JSON.stringify({ error: 'Incorrect username or PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN hash
    const pinHash = await hashPin(pin);
    if (pinHash !== profile.pin_hash) {
      await recordFailedAttempt(supabaseAdmin, normalizedUsername);
      return new Response(
        JSON.stringify({ error: 'Incorrect username or PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get actual auth email (legacy users may have gmail, new users have @dingleup.auto)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const authEmail = authUser?.user?.email || `${profile.username.toLowerCase()}@dingleup.auto`;
    
    // OPTIMIZATION: Conditional password sync - only update if auth password doesn't match
    // This reduces unnecessary auth.users writes on every login (high-load optimization)
    const expectedPassword = pin + profile.username;
    
    // Try signin with expected password to check if sync needed
    const { error: signinTestError } = await supabaseAdmin.auth.signInWithPassword({
      email: authEmail,
      password: expectedPassword,
    });
    
    // Only sync password if signin failed (password mismatch)
    if (signinTestError) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(profile.id, {
          password: expectedPassword,
        });
        console.log(`[login] Password synced for user ${profile.id}`);
      } catch (syncError) {
        console.error('Failed to sync auth password from PIN:', syncError);
        // Do not block login if password sync fails; frontend will still try variants
      }
    }

    // Clear failed attempts
    await supabaseAdmin
      .from('login_attempts_pin')
      .delete()
      .eq('username', normalizedUsername.toLowerCase());

    // Return credentials for frontend to sign in
    // Try multiple password formats (migration compatibility)
    const passwordVariants = [
      pin + profile.username,           // Standard: "123456Username"
      pin + profile.username + '!@#',   // Weak password workaround: "123456Username!@#"
    ];

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: profile.id,
          username: profile.username,
          email: authEmail,
        },
        passwordVariants, // Frontend will try these in order
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[login-with-username-pin] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error occurred',
        error_code: 'LOGIN_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function recordFailedAttempt(supabaseAdmin: any, username: string) {
  const normalizedUsername = username.toLowerCase();
  const now = new Date();
  
  const { data: existing } = await supabaseAdmin
    .from('login_attempts_pin')
    .select('failed_attempts')
    .eq('username', normalizedUsername)
    .maybeSingle();

  const newAttempts = (existing?.failed_attempts || 0) + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;
  
  await supabaseAdmin
    .from('login_attempts_pin')
    .upsert({
      username: normalizedUsername,
      failed_attempts: newAttempts,
      last_attempt_at: now.toISOString(),
      locked_until: shouldLock 
        ? new Date(now.getTime() + LOCKOUT_MINUTES * 60000).toISOString()
        : null,
    }, { onConflict: 'username' });
}
