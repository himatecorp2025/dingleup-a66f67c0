import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(origin);
  }
  const corsHeaders = getCorsHeaders(origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anon = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hasAdminRole } = await anon.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's preferred language
    const { data: userProfile } = await service.from('profiles').select('preferred_language').eq('id', user.id).single();
    const userLang = userProfile?.preferred_language || 'en';

    // Get translations for funnel steps
    const { data: translations } = await service.from('translations').select('key, hu, en').in('key', [
      'journey.funnel.registration',
      'journey.funnel.dashboard_visit',
      'journey.funnel.first_game',
      'journey.funnel.first_purchase',
      'journey.funnel.product_view',
      'journey.funnel.add_to_cart',
      'journey.funnel.purchase',
      'journey.funnel.game_start',
      'journey.funnel.question_5',
      'journey.funnel.question_10',
      'journey.funnel.game_complete'
    ]);

    const t = (key: string) => {
      const translation = translations?.find(t => t.key === key);
      return translation ? translation[userLang] : key;
    };

    const [{ data: navEvents }, { data: profiles }, { data: conversionEvents }, { data: gameExitEvents }] = await Promise.all([
      service.from('navigation_events').select('*').order('created_at', { ascending: true }),
      service.from('profiles').select('id, created_at'),
      service.from('conversion_events').select('user_id, event_type, product_type, product_id'),
      service.from('game_exit_events').select('*'),
    ]);

    const totalUsers = profiles?.length || 0;
    const registeredUsers = totalUsers;
    const visitedDashboard = new Set((navEvents || []).filter((e: any) => e.page_route === '/dashboard').map((e: any) => e.user_id)).size;
    const playedFirstGame = new Set((navEvents || []).filter((e: any) => e.page_route === '/game').map((e: any) => e.user_id)).size;
    const madePurchase = new Set((conversionEvents || []).filter((e: any) => e.event_type === 'purchase_complete').map((e: any) => e.user_id)).size;

    const onboardingFunnel = [
      { step: t('journey.funnel.registration'), users: registeredUsers, dropoffRate: 0 },
      { step: t('journey.funnel.dashboard_visit'), users: visitedDashboard, dropoffRate: registeredUsers > 0 ? ((registeredUsers - visitedDashboard) / registeredUsers) * 100 : 0 },
      { step: t('journey.funnel.first_game'), users: playedFirstGame, dropoffRate: visitedDashboard > 0 ? ((visitedDashboard - playedFirstGame) / visitedDashboard) * 100 : 0 },
      { step: t('journey.funnel.first_purchase'), users: madePurchase, dropoffRate: playedFirstGame > 0 ? ((playedFirstGame - madePurchase) / playedFirstGame) * 100 : 0 },
    ];

    // Purchase Funnel: termék megtekintés (rescue popup) → kosárba helyezés → vásárlás
    const viewedProduct = new Set((conversionEvents || []).filter((e: any) => e.event_type === 'product_view').map((e: any) => e.user_id)).size;
    const addedToCart = new Set((conversionEvents || []).filter((e: any) => e.event_type === 'add_to_cart').map((e: any) => e.user_id)).size;
    const completedPurchase = new Set((conversionEvents || []).filter((e: any) => e.event_type === 'purchase_complete').map((e: any) => e.user_id)).size;

    const purchaseFunnel = [
      { step: t('journey.funnel.product_view'), users: viewedProduct, dropoffRate: 0 },
      { step: t('journey.funnel.add_to_cart'), users: addedToCart, dropoffRate: viewedProduct > 0 ? ((viewedProduct - addedToCart) / viewedProduct) * 100 : 0 },
      { step: t('journey.funnel.purchase'), users: completedPurchase, dropoffRate: addedToCart > 0 ? ((addedToCart - completedPurchase) / addedToCart) * 100 : 0 },
    ];

    // Game Funnel: játék kezdés → 5. kérdés elérése → 10. kérdés elérése → befejezés
    // Count unique users at each stage using event_type from game_exit_events
    const gameStartedUsers = new Set<string>();
    const reached5Users = new Set<string>();
    const reached10Users = new Set<string>();
    const completedUsers = new Set<string>();
    
    (gameExitEvents || []).forEach((e: any) => {
      const userId = e.user_id;
      const eventType = e.event_type;
      const questionIndex = e.question_index || 0;
      
      // Any game exit event means the user started a game
      gameStartedUsers.add(userId);
      
      // Check milestones
      if (eventType === 'question_5_reached' || questionIndex >= 5) {
        reached5Users.add(userId);
      }
      if (eventType === 'question_10_reached' || questionIndex >= 10) {
        reached10Users.add(userId);
      }
      if (eventType === 'game_complete' || questionIndex >= 15) {
        completedUsers.add(userId);
      }
    });

    const startedGame = gameStartedUsers.size;
    const reached5Questions = reached5Users.size;
    const reached10Questions = reached10Users.size;
    const completedGame = completedUsers.size;

    const gameFunnel = [
      { step: t('journey.funnel.game_start'), users: startedGame, dropoffRate: 0 },
      { step: t('journey.funnel.question_5'), users: reached5Questions, dropoffRate: startedGame > 0 ? ((startedGame - reached5Questions) / startedGame) * 100 : 0 },
      { step: t('journey.funnel.question_10'), users: reached10Questions, dropoffRate: reached5Questions > 0 ? ((reached5Questions - reached10Questions) / reached5Questions) * 100 : 0 },
      { step: t('journey.funnel.game_complete'), users: completedGame, dropoffRate: reached10Questions > 0 ? ((reached10Questions - completedGame) / reached10Questions) * 100 : 0 },
    ];

    const userPaths = new Map<string, string[]>();
    (navEvents || []).forEach((e: any) => {
      if (!userPaths.has(e.session_id)) userPaths.set(e.session_id, []);
      userPaths.get(e.session_id)!.push(e.page_route);
    });
    const pathCounts = new Map<string, number>();
    userPaths.forEach(path => {
      if (path.length >= 3) {
        const pathStr = path.slice(0, 3).join(' → ');
        pathCounts.set(pathStr, (pathCounts.get(pathStr) || 0) + 1);
      }
    });
    const commonPaths = Array.from(pathCounts.entries()).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    const exitCounts = new Map<string, number>();
    userPaths.forEach(path => {
      if (path.length > 0) {
        const last = path[path.length - 1];
        exitCounts.set(last, (exitCounts.get(last) || 0) + 1);
      }
    });
    const exitPoints = Array.from(exitCounts.entries()).map(([page, exits]) => ({ page, exits })).sort((a, b) => b.exits - a.exits).slice(0, 10);

    return new Response(JSON.stringify({
      onboardingFunnel,
      purchaseFunnel,
      gameFunnel,
      commonPaths,
      exitPoints,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
