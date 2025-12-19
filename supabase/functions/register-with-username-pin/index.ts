import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple SHA-256 hash using Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Generate secure random recovery code (format: XXXX-XXXX-XXXX)
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments: string[] = [];
  
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      segment += chars[randomIndex];
    }
    segments.push(segment);
  }
  
  return segments.join('-');
}

// Hash recovery code using SHA-256
async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
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
    const { username, pin, invitationCode, countryCode, userTimezone, preferredLanguage } = await req.json();

    // Validation
    if (!username || !pin) {
      return new Response(
        JSON.stringify({ error: 'Missing username or PIN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate username
    if (username.length < 3 || username.length > 30) {
      return new Response(
        JSON.stringify({ error: 'Username must be 3-30 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (/\s/.test(username)) {
      return new Response(
        JSON.stringify({ error: 'Username cannot contain spaces' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate allowed characters (alphanumeric, underscore, and Hungarian accented characters)
    if (!/^[a-zA-Z0-9_áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/.test(username)) {
      return new Response(
        JSON.stringify({ error: 'Username contains invalid characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PIN (exactly 6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'PIN must be exactly 6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Uniqueness check (case-insensitive)
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Username is already taken' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invitation code lookup (FIX: profiles primary key is id, not user_id)
    let inviterId: string | null = null;
    if (invitationCode && invitationCode.trim() !== '') {
      const normalizedCode = invitationCode.trim().toUpperCase();

      const { data: inviterProfile, error: inviterError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('invitation_code', normalizedCode)
        .maybeSingle();

      if (inviterError) {
        console.error('[register] Invitation lookup error:', inviterError);
        return new Response(
          JSON.stringify({ error: 'Invalid invitation code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!inviterProfile) {
        return new Response(
          JSON.stringify({ error: 'Invalid invitation code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      inviterId = inviterProfile.id;
    }

    // BATCH HASH GENERATION: Compute all hashes in parallel for speed
    const recoveryCode = generateRecoveryCode();
    const [pinHash, recoveryCodeHash] = await Promise.all([
      hashPin(pin),
      hashRecoveryCode(recoveryCode)
    ]);

    // ATOMIC USER CREATION: Create auth.users + profiles in sequence with guaranteed rollback
    const autoEmail = `${username.toLowerCase()}@dingleup.auto`;
    let authUserId: string | null = null;

    try {
      // Step 1: Create auth user - IMMEDIATELY CONFIRMED
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: autoEmail,
        password: pin + username,
        email_confirm: true,
        user_metadata: { username }
      });

      if (authError || !authData.user) {
        console.error('[register] Auth user creation failed:', authError);
        return new Response(
          JSON.stringify({ error: 'Account creation failed', error_code: 'AUTH_CREATION_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = authData.user.id;

      // Step 2: Create profile row with all required fields (initialize core defaults)
      const nowIso = new Date().toISOString();
      const profilePayload: Record<string, unknown> = {
        id: authUserId,
        username,
        pin_hash: pinHash,
        email: null,
        recovery_code_hash: recoveryCodeHash,
        recovery_code_set_at: nowIso,

        // Best-effort initialization for app expectations
        country_code: typeof countryCode === 'string' && countryCode ? countryCode : null,
        user_timezone: typeof userTimezone === 'string' && userTimezone ? userTimezone : null,
        preferred_language: typeof preferredLanguage === 'string' && preferredLanguage ? preferredLanguage : 'hu',

        // These columns exist in current prod schema; setting them here prevents NOT NULL/default issues
        coins: 0,
        max_lives: 15,
        lives: 15,
        lives_regeneration_rate: 12,
        last_life_regeneration: nowIso,
        updated_at: nowIso,
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        console.error('[register] Profile creation failed:', profileError);
        
        // CRITICAL ROLLBACK: Delete auth user to prevent dangling account
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          console.log(`[register] Rolled back auth user ${authUserId} after profile creation failure`);
        } catch (deleteError) {
          console.error(`[register] CRITICAL: Failed to rollback auth user ${authUserId}:`, deleteError);
          // Log but don't fail - user will see profile creation error
        }

        return new Response(
          JSON.stringify({ error: 'Profile creation failed', error_code: 'PROFILE_CREATION_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ensure base user role exists (some policies/features assume this row)
      try {
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: authUserId, role: 'user' })
          .select('id')
          .maybeSingle();
      } catch (e) {
        console.error('[register] user_roles insert failed (non-fatal):', e);
      }

      // SUCCESS: auth.users and profiles are now consistent
      console.log(`[register] Successfully created user ${authUserId} with username ${username}`);

    } catch (error) {
      console.error('[register] Unexpected error during user creation:', error);
      
      // CRITICAL ROLLBACK: Attempt to clean up auth user if it was created
      if (authUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          console.log(`[register] Rolled back auth user ${authUserId} after unexpected error`);
        } catch (deleteError) {
          console.error(`[register] CRITICAL: Failed to rollback auth user ${authUserId}:`, deleteError);
        }
      }

      return new Response(
        JSON.stringify({ error: 'Account creation failed', error_code: 'CREATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OPTIMIZATION: Process invitation with atomic, idempotent reward handling
    // This runs AFTER user creation succeeds, so if invitation processing fails,
    // the user account still exists (business logic: registration succeeds even if reward fails)
    if (inviterId && authUserId) {
      try {
        // Create invitation record
        const { error: invitationError } = await supabaseAdmin
          .from('invitations')
          .insert({
            inviter_id: inviterId,
            invited_user_id: authUserId,
            invited_email: autoEmail,
            invitation_code: invitationCode.trim().toUpperCase(),
            accepted: true,
            accepted_at: new Date().toISOString(),
          });

        if (invitationError) {
          console.error('[register] Invitation creation error:', invitationError);
          // Continue registration even if invitation fails
        } else {
          // ATOMIC REWARD: Call apply_invitation_reward RPC (single backend call)
          // This function handles:
          // - Counting accepted invitations (single indexed query)
          // - Calculating tier reward (unchanged business logic)
          // - Idempotent ledger insertion (unique constraint protection)
          // - Atomic wallet update (same transaction)
          const { data: rewardResult, error: rewardError } = await supabaseAdmin
            .rpc('apply_invitation_reward', {
              p_inviter_id: inviterId,
              p_invited_user_id: authUserId
            });

          if (rewardError) {
            console.error('[register] Reward application error:', rewardError);
            // Continue even if reward fails - reward is idempotent and retryable
          } else if (rewardResult && rewardResult.success) {
            console.log('[register] Invitation reward credited:', {
              inviter_id: inviterId,
              invited_user_id: authUserId,
              reward_coins: rewardResult.reward_coins,
              reward_lives: rewardResult.reward_lives,
              tier: rewardResult.tier,
              accepted_count: rewardResult.accepted_count
            });
          } else if (rewardResult && !rewardResult.success) {
            console.log('[register] Reward not credited (idempotent):', rewardResult.error);
            // This is expected behavior for duplicate/concurrent registrations
          }
        }

        // Create friendship (idempotent via ON CONFLICT)
        // This function already uses ON CONFLICT DO UPDATE for idempotency
        const { error: friendshipError } = await supabaseAdmin
          .rpc('create_friendship_from_invitation', {
            p_inviter_id: inviterId,
            p_invitee_id: authUserId
          });

        if (friendshipError) {
          console.error('[register] Friendship creation error:', friendshipError);
          // Continue even if friendship fails
        }

      } catch (invitationProcessError) {
        console.error('[register] Invitation processing error:', invitationProcessError);
        // Continue registration even if entire invitation block fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authUserId,
          username,
        },
        recovery_code: recoveryCode,
        // IMPORTANT: Frontend must display this recovery code to the user
        // with a clear warning to save it securely for PIN reset purposes.
        // Message: "Írd fel / mentsd el ezt a helyreállítási kódot! Ezzel tudod 
        // visszaállítani a PIN kódodat, ha elfelejted. A kódot nem küldjük el újra."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[register-with-username-pin] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error occurred',
        error_code: 'REGISTRATION_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});