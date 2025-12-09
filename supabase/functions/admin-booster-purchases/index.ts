import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminBoosterPurchaseRow {
  id: string;
  userId: string;
  userDisplayName: string | null;
  boosterCode: string;
  boosterName: string;
  purchaseSource: 'GOLD' | 'IAP';
  goldSpent: number;
  usdCentsSpent: number;
  createdAt: string;
  iapTransactionId: string | null;
}

function getUserIdFromAuthHeader(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const normalized = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + (4 - (normalized.length % 4)) % 4,
      "="
    );

    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch (error) {
    console.error("[admin-booster-purchases] Failed to decode JWT:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleError) {
      console.error("[admin-booster-purchases] Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params for filtering
    const url = new URL(req.url);
    const boosterCode = url.searchParams.get("boosterCode");
    const source = url.searchParams.get("source");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // FIXED: Fetch purchases first, then join data separately to avoid foreign key issues
    let purchasesQuery = supabaseAdmin
      .from("booster_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (source) {
      purchasesQuery = purchasesQuery.eq("purchase_source", source);
    }

    purchasesQuery = purchasesQuery.range(offset, offset + limit - 1);

    const { data: purchases, error: fetchError } = await purchasesQuery;

    if (fetchError) {
      console.error("[admin-booster-purchases] Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!purchases || purchases.length === 0) {
      return new Response(
        JSON.stringify({ purchases: [], summary: { totalFreePurchases: 0, totalGoldSaverPurchases: 0, totalGoldSpent: 0 } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booster types
    const boosterTypeIds = [...new Set(purchases.map(p => p.booster_type_id))];
    const { data: boosterTypes } = await supabaseAdmin
      .from("booster_types")
      .select("id, code, name")
      .in("id", boosterTypeIds);

    // Fetch user profiles
    const userIds = [...new Set(purchases.map(p => p.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    // Create lookup maps
    const boosterTypeMap = new Map(boosterTypes?.map(bt => [bt.id, bt]) || []);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Transform data with explicit joins
    const response: AdminBoosterPurchaseRow[] = purchases.map(p => {
      const boosterType = boosterTypeMap.get(p.booster_type_id);
      const profile = profileMap.get(p.user_id);

      return {
        id: p.id,
        userId: p.user_id,
        userDisplayName: profile?.username || 'Unknown',
        boosterCode: boosterType?.code || 'UNKNOWN',
        boosterName: boosterType?.name || 'Unknown Booster',
        purchaseSource: p.purchase_source as 'GOLD' | 'IAP',
        goldSpent: p.gold_spent,
        usdCentsSpent: p.usd_cents_spent,
        createdAt: p.created_at,
        iapTransactionId: p.iap_transaction_id
      };
    });

    // Calculate summary stats (only gold-based boosters now)
    const totalFreePurchases = response.filter(p => p.boosterCode === 'FREE').length;
    const totalGoldSaverPurchases = response.filter(p => p.boosterCode === 'GOLD_SAVER').length;
    const totalGoldSpent = response.reduce((sum, p) => sum + p.goldSpent, 0);

    return new Response(
      JSON.stringify({
        purchases: response,
        summary: {
          totalFreePurchases,
          totalGoldSaverPurchases,
          totalGoldSpent
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[admin-booster-purchases] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
