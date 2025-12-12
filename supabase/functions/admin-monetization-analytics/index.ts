import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch booster purchases (only real-money purchases with usd_cents_spent > 0)
    const { data: boosterPurchases, error: boosterPurchasesError } = await supabase
      .from('booster_purchases')
      .select('*, booster_types(name, code)')
      .order('created_at', { ascending: false });

    if (boosterPurchasesError) throw boosterPurchasesError;

    // Fetch total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Calculate metrics from booster purchases only (usd_cents_spent > 0 = real money)
    const boosterRevenueUSD = (boosterPurchases || []).reduce((sum, p) => sum + (p.usd_cents_spent / 100), 0);
    const totalRevenue = boosterRevenueUSD;

    // Paying users (those who spent real money)
    const payingUsersSet = new Set(
      (boosterPurchases || []).filter(p => p.usd_cents_spent > 0).map(p => p.user_id)
    );
    const payingUsers = payingUsersSet.size;
    
    const arpu = totalUsers ? totalRevenue / totalUsers : 0;
    const arppu = payingUsers ? totalRevenue / payingUsers : 0;
    const conversionRate = totalUsers ? (payingUsers / totalUsers) * 100 : 0;

    // Revenue over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueByDay: Record<string, number> = {};
    
    // Add booster purchases with real money
    (boosterPurchases || [])
      .filter(p => new Date(p.created_at) >= thirtyDaysAgo && p.usd_cents_spent > 0)
      .forEach(p => {
        const date = new Date(p.created_at).toISOString().split('T')[0];
        if (!revenueByDay[date]) revenueByDay[date] = 0;
        revenueByDay[date] += p.usd_cents_spent / 100;
      });

    const revenueOverTime = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue by product (booster types)
    const revenueByProductMap: Record<string, { product: string; revenue: number; count: number }> = {};
    
    // All booster purchases (including gold-based for count metrics)
    (boosterPurchases || []).forEach(p => {
      const productName = (p.booster_types as any)?.name || 'Unknown Booster';
      if (!revenueByProductMap[productName]) {
        revenueByProductMap[productName] = { product: productName, revenue: 0, count: 0 };
      }
      revenueByProductMap[productName].revenue += p.usd_cents_spent / 100;
      revenueByProductMap[productName].count += 1;
    });

    const revenueByProduct = Object.values(revenueByProductMap)
      .sort((a, b) => b.count - a.count);

    console.log('[admin-monetization-analytics] Metrics calculated:', {
      totalRevenue,
      payingUsers,
      totalUsers,
      boosterCount: boosterPurchases?.length || 0
    });

    return new Response(JSON.stringify({
      totalRevenue,
      arpu,
      arppu,
      conversionRate,
      totalUsers: totalUsers || 0,
      payingUsers,
      revenueOverTime,
      revenueByProduct
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in admin-monetization-analytics:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
