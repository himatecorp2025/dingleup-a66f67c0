import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const requestingUserId = payload.sub;

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { targetUsername } = await req.json();

    if (!targetUsername?.trim()) {
      return new Response(JSON.stringify({ error: 'Username required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find target user
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .ilike('username', targetUsername.trim())
      .maybeSingle();

    if (userError || !targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if already admin
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (existingRole) {
      return new Response(JSON.stringify({ error: 'User is already admin', username: targetUser.username }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Grant admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: targetUser.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error inserting role:', roleError);
      throw roleError;
    }

    // Set as creator with permanent free access (using service role bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_creator: true,
        creator_subscription_status: 'active_paid'
      })
      .eq('id', targetUser.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Create or update creator subscription
    const { error: subError } = await supabaseAdmin
      .from('creator_subscriptions')
      .upsert({
        user_id: targetUser.id,
        package_type: 'creator_max',
        status: 'active',
        max_videos: 999,
        current_period_ends_at: '2099-12-31'
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('Error creating subscription:', subError);
    }

    console.log(`Admin role granted to ${targetUser.username} by ${requestingUserId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      username: targetUser.username,
      message: `Admin rights granted to ${targetUser.username} with permanent free creator access`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Grant admin error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
