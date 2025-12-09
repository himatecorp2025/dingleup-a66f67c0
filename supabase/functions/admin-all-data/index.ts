import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(origin);
  }
  
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Auth check using ANON key first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with anon key
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: hasAdminRole } = await anonClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now use SERVICE ROLE to bypass RLS
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all users
    const { data: users, error: usersError } = await serviceClient
      .from('profiles')
      .select('id, username, email, lives, max_lives, coins, total_correct_answers, created_at')
      .order('created_at', { ascending: false });

    // Fetch user roles
    const userIds = users?.map(u => u.id) || [];
    const { data: rolesData } = await serviceClient
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    // Fetch all booster purchases (only gold-based boosters now)
    const { data: boosterPurchases, error: boosterPurchasesError } = await serviceClient
      .from('booster_purchases')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch user profiles for booster purchases (manual join)
    const boosterPurchaseUserIds = [...new Set(boosterPurchases?.map(p => p.user_id) || [])];
    const { data: boosterPurchaseProfiles } = await serviceClient
      .from('profiles')
      .select('id, username, email')
      .in('id', boosterPurchaseUserIds);

    const boosterProfileMap = new Map(boosterPurchaseProfiles?.map(p => [p.id, p]) || []);
    const boosterPurchasesWithProfiles = boosterPurchases?.map(p => ({
      ...p,
      profiles: boosterProfileMap.get(p.user_id)
    })) || [];

    // Fetch all reports
    const { data: reports, error: reportsError } = await serviceClient
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch profiles for reports (manual join)
    const reportUserIds = [...new Set([
      ...(reports?.map(r => r.reporter_id) || []),
      ...(reports?.filter(r => r.reported_user_id).map(r => r.reported_user_id) || [])
    ])];
    const { data: reportProfiles } = await serviceClient
      .from('profiles')
      .select('id, username, email')
      .in('id', reportUserIds);

    const reportProfileMap = new Map(reportProfiles?.map(p => [p.id, p]) || []);
    
    // Generate signed URLs for report screenshots
    const reportsWithProfiles = await Promise.all(reports?.map(async (r) => {
      let signedScreenshotUrls: string[] = [];
      
      if (r.screenshot_urls && Array.isArray(r.screenshot_urls) && r.screenshot_urls.length > 0) {
        signedScreenshotUrls = await Promise.all(
          r.screenshot_urls.map(async (url: string) => {
            try {
              // Extract path from URL or use as-is if it's already a path
              const path = url.includes('report-screenshots/') 
                ? url.split('report-screenshots/')[1].split('?')[0]
                : url;
              
              const { data: signedData, error: signedError } = await serviceClient.storage
                .from('report-screenshots')
                .createSignedUrl(path, 3600); // 1 hour expiry
              
              if (signedError) {
                return url; // fallback to original URL
              }
              
              return signedData.signedUrl;
            } catch (err) {
              return url;
            }
          })
        );
      }
      
      return {
        ...r,
        reporter: reportProfileMap.get(r.reporter_id),
        reported_user: r.reported_user_id ? reportProfileMap.get(r.reported_user_id) : null,
        screenshot_urls: signedScreenshotUrls
      };
    }) || []);

    // Fetch ALL invitations
    const { data: invitations, error: invitationsError } = await serviceClient
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch profiles for invitations (manual join)
    const invitationUserIds = [...new Set([
      ...(invitations?.map(i => i.inviter_id) || []),
      ...(invitations?.filter(i => i.invited_user_id).map(i => i.invited_user_id) || [])
    ])];
    const { data: invitationProfiles } = await serviceClient
      .from('profiles')
      .select('id, username, email, avatar_url')
      .in('id', invitationUserIds);

    const invitationProfileMap = new Map(invitationProfiles?.map(p => [p.id, p]) || []);
    const invitationsWithProfiles = invitations?.map(i => ({
      ...i,
      inviter: invitationProfileMap.get(i.inviter_id),
      invited: i.invited_user_id ? invitationProfileMap.get(i.invited_user_id) : null
    })) || [];

    return new Response(
      JSON.stringify({
        users: users || [],
        roles: rolesData || [],
        boosterPurchases: boosterPurchasesWithProfiles,
        reports: reportsWithProfiles,
        invitations: invitationsWithProfiles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});