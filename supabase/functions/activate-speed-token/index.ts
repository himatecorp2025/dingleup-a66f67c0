import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivateSpeedTokenResponse {
  success: boolean;
  error?: string;
  activeSpeedToken?: {
    id: string;
    expiresAt: string;
    durationMinutes: number;
    source: string;
  };
  pendingTokensCount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Auth client for verification
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      console.error('[activate-speed-token] Auth failed:', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    
    // Admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log(`[activate-speed-token] User ${userId} activating speed token`);

    // **COLLISION CHECK** - prevent multiple active tokens at the same time
    const { data: activeTokens, error: activeError } = await supabaseAdmin
      .from("speed_tokens")
      .select("id, expires_at, duration_minutes")
      .eq("user_id", userId)
      .not("used_at", "is", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (activeError) {
      console.error("[activate-speed-token] Error checking active tokens:", activeError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (activeTokens && activeTokens.length > 0) {
      const activeToken = activeTokens[0];
      const expiresAt = new Date(activeToken.expires_at);
      const remainingMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / (60 * 1000));
      
      console.log(`[activate-speed-token] User ${userId} already has active token, ${remainingMinutes} minutes remaining`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "ACTIVE_TOKEN_EXISTS",
          message: `You already have an active speed token. Please wait ${remainingMinutes} minutes for it to expire.`,
          remainingMinutes
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for unused speed tokens
    const { data: unusedTokens, error: tokenError } = await supabaseAdmin
      .from("speed_tokens")
      .select("*")
      .eq("user_id", userId)
      .is("used_at", null)
      .order("created_at", { ascending: true })
      .limit(1);

    if (tokenError || !unusedTokens || unusedTokens.length === 0) {
      console.log(`[activate-speed-token] No unused tokens found for user ${userId}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "NO_UNUSED_TOKENS",
          pendingTokensCount: 0
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenToActivate = unusedTokens[0];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenToActivate.duration_minutes * 60 * 1000);

    console.log(`[activate-speed-token] Activating token ${tokenToActivate.id}, expires at ${expiresAt.toISOString()}`);

    // Activate the token
    const { error: activateError } = await supabaseAdmin
      .from("speed_tokens")
      .update({
        used_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq("id", tokenToActivate.id);

    if (activateError) {
      console.error("[activate-speed-token] Activation error:", activateError);
      return new Response(
        JSON.stringify({ success: false, error: "Token activation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Speed tokens are now only from gold-based booster purchases

    // Count remaining unused tokens
    const { count: remainingCount } = await supabaseAdmin
      .from("speed_tokens")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .is("used_at", null);

    console.log(`[activate-speed-token] Success! Remaining tokens: ${remainingCount || 0}`);

    const response: ActivateSpeedTokenResponse = {
      success: true,
      activeSpeedToken: {
        id: tokenToActivate.id,
        expiresAt: expiresAt.toISOString(),
        durationMinutes: tokenToActivate.duration_minutes,
        source: tokenToActivate.source
      },
      pendingTokensCount: remainingCount || 0
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[activate-speed-token] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
