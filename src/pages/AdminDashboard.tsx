import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, TrendingUp, Search, AlertTriangle, Activity, Target, Zap, Map as MapIcon, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserGrowthChart } from '@/components/UserGrowthChart';
import { AdminReportActionDialog } from '@/components/AdminReportActionDialog';
import { QuestionTranslationManager } from '@/components/QuestionTranslationManager';
import { TranslationSeeder } from '@/components/TranslationSeeder';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';

type MenuTab = 'dashboard' | 'users' | 'revenue' | 'payouts' | 'invitations' | 'reports' | 'popular-content';
type ReportsSubTab = 'development' | 'support';

const AdminDashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  // Read tab from URL parameter
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') as MenuTab | null;
  const [activeTab, setActiveTab] = useState<MenuTab>(tabParam || 'dashboard');
  
  const [reportsSubTab, setReportsSubTab] = useState<ReportsSubTab>('development');
  const [userName, setUserName] = useState('Admin');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Real stats from database
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('0');
  const [totalPayouts, setTotalPayouts] = useState('0');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{ 
    id: string; 
    reporterId: string;
    report: any;
  } | null>(null);
  const [actionType, setActionType] = useState<'reviewing' | 'resolved' | 'dismissed'>('reviewing');
  const [isExportingSchema, setIsExportingSchema] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  const handleDatabaseExport = async (exportType: 'schema' | 'data') => {
    const isSchema = exportType === 'schema';
    const setExporting = isSchema ? setIsExportingSchema : setIsExportingData;
    
    try {
      setExporting(true);
      toast.info(isSchema ? 'Schema export indítása...' : 'Data export indítása...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Nincs bejelentkezve');
        setExporting(false);
        return;
      }

      const response = await fetch(
        `https://wdpxmwsxhckazwxufttk.supabase.co/functions/v1/export-full-database?type=${exportType}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error:', errorText);
        toast.error('Export hiba: ' + errorText);
        setExporting(false);
        return;
      }

      const sqlContent = await response.text();
      
      if (!sqlContent || sqlContent.length < 100) {
        console.error('Export error: no data returned from function');
        toast.error('Export hiba: üres válasz érkezett');
        setExporting(false);
        return;
      }

      const blob = new Blob([sqlContent], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `dingleup_${exportType}_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(isSchema ? 'Schema sikeresen exportálva!' : 'Data sikeresen exportálva!');
    } catch (error) {
      console.error('Unexpected export error:', error);
      toast.error('Váratlan hiba történt az export során');
    } finally {
      setExporting(false);
    }
  };

  // Update activeTab when URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') as MenuTab | null;
    if (tabParam) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('dashboard');
    }
  }, [location.search]);

  // Initial load
  useEffect(() => {
    checkAuth();
  }, []);

  // Memoized fetchData to prevent recreation on every render
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('admin.session_expired'));
        setIsRefreshing(false);
        return;
      }
      
      // Use admin edge function with service role to bypass RLS
      const { data: adminData, error: adminError } = await supabase.functions.invoke('admin-all-data', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (adminError) {
        console.error('[Admin] Admin data fetch error:', adminError);
        toast.error(t('admin.error_loading_data'));
        setIsRefreshing(false);
        return;
      }



      // Process users with roles
      if (adminData?.users) {
        const roleMap = new Map((adminData.roles || []).map((r: any) => [r.user_id, r.role]));
        const merged = adminData.users.map((u: any) => ({ ...u, role: roleMap.get(u.id) || 'user' }));
        setAllUsers(merged);
        setTotalUsers(adminData.users.length);
      }

      // Process reports
      if (adminData?.reports) {
        setReports(adminData.reports);
      }

      // Process invitations
      if (adminData?.invitations) {
        setInvitations(adminData.invitations);
      }

      // Calculate total revenue from purchases + booster purchases
      let revenueSum = 0;
      
      // Add regular Stripe purchases (amount_usd field)
      if (adminData?.purchases) {
        revenueSum += adminData.purchases.reduce((sum: number, p: any) => {
          return sum + (p.amount_usd || 0);
        }, 0);
      }

      // Add booster IAP purchases (usd_cents_spent field, converted from cents to dollars)
      if (adminData?.boosterPurchases) {
        revenueSum += adminData.boosterPurchases.reduce((sum: number, p: any) => {
          return sum + ((p.usd_cents_spent || 0) / 100);
        }, 0);
      }

      setTotalRevenue(revenueSum.toFixed(2));

      setIsRefreshing(false);
    } catch (error) {
      console.error('[Admin] Fatal fetch error:', error);
      toast.error(t('admin.error_loading_data'));
      setIsRefreshing(false);
    }
  }, []);

  // REALTIME: Instant background data updates (0 seconds delay)
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invitations'
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports'
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships'
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_results'
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booster_purchases'
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Memoized filterUsers function
  const filterUsers = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allUsers.filter((user) => {
      const id = (user.id ?? '').toLowerCase();
      const username = (user.username ?? '').toLowerCase();
      const email = (user.email ?? '').toLowerCase();
      const role = (user.role ?? '').toLowerCase();
      const lives = (user.lives ?? 0).toString();
      const coins = (user.coins ?? 0).toString();
      const totalCorrect = (user.total_correct_answers ?? 0).toString();
      const createdAt = user.created_at
        ? new Date(user.created_at).toLocaleDateString('hu-HU')
        : '';

      return (
        id.includes(query) ||
        username.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        lives.includes(query) ||
        coins.includes(query) ||
        totalCorrect.includes(query) ||
        createdAt.includes(query)
      );
    });
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/admin/login');
        return;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast.error(t('admin.error_no_admin_permission'));
        navigate('/');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.username);
      }

      // Fetch initial data
      await fetchData();

      setLoading(false);
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/admin/login');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-white/70 text-lg">{t('admin.dashboard.loading')}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[clamp(1rem,3vw,1.5rem)] mb-[clamp(1.5rem,4vw,2rem)]">
          <button
            onClick={() => setActiveTab('users')}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[clamp(0.75rem,2vw,1rem)] lg:rounded-[clamp(1rem,2.5vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)] text-left hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-[clamp(0.75rem,2vw,1rem)]">
              <h3 className="text-white/70 text-[clamp(0.75rem,1.75vw,0.875rem)]">{t('admin.dashboard.total_users')}</h3>
              <Users className="w-[clamp(1.25rem,3vw,1.5rem)] h-[clamp(1.25rem,3vw,1.5rem)] lg:w-[clamp(1.5rem,3.5vw,2rem)] lg:h-[clamp(1.5rem,3.5vw,2rem)] text-purple-400 bg-purple-500/20 p-[clamp(0.25rem,1vw,0.375rem)] lg:p-[clamp(0.375rem,1.5vw,0.5rem)] rounded-[clamp(0.5rem,1.5vw,0.75rem)]" />
            </div>
            <p className="text-[clamp(1.25rem,4vw,1.5rem)] lg:text-[clamp(1.5rem,5vw,1.875rem)] font-bold text-white">{totalUsers.toLocaleString()}</p>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[clamp(0.75rem,2vw,1rem)] lg:rounded-[clamp(1rem,2.5vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)] text-left hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-[clamp(0.75rem,2vw,1rem)]">
              <h3 className="text-white/70 text-[clamp(0.75rem,1.75vw,0.875rem)]">{t('admin.dashboard.total_revenue')}</h3>
              <DollarSign className="w-[clamp(1.25rem,3vw,1.5rem)] h-[clamp(1.25rem,3vw,1.5rem)] lg:w-[clamp(1.5rem,3.5vw,2rem)] lg:h-[clamp(1.5rem,3.5vw,2rem)] text-blue-400 bg-blue-500/20 p-[clamp(0.25rem,1vw,0.375rem)] lg:p-[clamp(0.375rem,1.5vw,0.5rem)] rounded-[clamp(0.5rem,1.5vw,0.75rem)]" />
            </div>
            <p className="text-[clamp(1.25rem,4vw,1.5rem)] lg:text-[clamp(1.5rem,5vw,1.875rem)] font-bold text-white">${totalRevenue}</p>
            <p className="text-white/50 text-[clamp(0.625rem,1.5vw,0.75rem)] mt-[clamp(0.125rem,0.5vw,0.25rem)]">{t('admin.dashboard.revenue_source')}</p>
          </button>

        </div>

        {/* Content based on active tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 lg:space-y-6">
            {/* Database Export Buttons */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-2">Adatbázis export</h3>
                  <p className="text-white/60 text-sm lg:text-base">
                    Töltsd le a teljes adatbázis sémát (CREATE TABLE) és az adatokat (INSERT) külön fájlokba
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleDatabaseExport('schema')}
                    disabled={isExportingSchema || isExportingData}
                    variant="outline"
                    size="lg"
                    className="gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-white"
                  >
                    <Database className="h-5 w-5" />
                    {isExportingSchema ? 'Schema export...' : 'Schema Export (CREATE TABLE)'}
                  </Button>
                  <Button
                    onClick={() => handleDatabaseExport('data')}
                    disabled={isExportingSchema || isExportingData}
                    variant="outline"
                    size="lg"
                    className="gap-2 bg-green-600/20 hover:bg-green-600/30 border-green-500/30 text-white"
                  >
                    <Database className="h-5 w-5" />
                    {isExportingData ? 'Data export...' : 'Data Export (INSERT)'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 lg:mb-6">{t('admin.dashboard.welcome')}</h2>
              <p className="text-white/70 text-sm lg:text-base mb-3 lg:mb-4">
                {t('admin.dashboard.welcome_desc')}
              </p>
              <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 lg:p-4 mt-3 lg:mt-4">
                <p className="text-blue-300 text-xs lg:text-sm">
                  💡 <strong>{t('admin.dashboard.tip_label')}</strong> {t('admin.dashboard.tip_mobile')} <span className="lg:hidden">{t('admin.dashboard.tip_mobile')}</span><span className="hidden lg:inline">{t('admin.dashboard.tip_desktop')}</span>
                </p>
              </div>
            </div>

            <UserGrowthChart />

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
              <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">{t('admin.dashboard.quick_links')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="backdrop-blur-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-3 lg:p-4 text-left transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400 mb-2" />
                  <h4 className="text-white font-semibold text-sm lg:text-base">{t('admin.dashboard.view_users')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.view_users_desc')}</p>
                </button>
                <button
                  onClick={() => setActiveTab('revenue')}
                  className="backdrop-blur-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg p-3 lg:p-4 text-left transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20"
                >
                  <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-green-400 mb-2" />
                  <h4 className="text-white font-semibold text-sm lg:text-base">{t('admin.dashboard.revenue')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.revenue_desc')}</p>
                </button>
              </div>
            </div>

            {/* Analytics Dashboards */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
              <div className="flex items-center gap-3 mb-4 lg:mb-6">
                <Activity className="w-8 h-8 text-purple-400" />
                <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {t('admin.dashboard.advanced_analytics')}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <button
                  onClick={() => navigate('/admin/retention')}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-left transition-all hover:scale-105 shadow-2xl hover:shadow-purple-500/20"
                >
                  <Target className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400 mb-3 lg:mb-4" />
                  <h4 className="text-white font-bold text-lg lg:text-xl mb-2">{t('admin.dashboard.retention_title')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.retention_desc')}</p>
                </button>

                <button
                  onClick={() => navigate('/admin/monetization')}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-left transition-all hover:scale-105 shadow-2xl hover:shadow-green-500/20"
                >
                  <DollarSign className="w-8 h-8 lg:w-10 lg:h-10 text-green-400 mb-3 lg:mb-4" />
                  <h4 className="text-white font-bold text-lg lg:text-xl mb-2">{t('admin.dashboard.monetization_title')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.monetization_desc')}</p>
                </button>

                <button
                  onClick={() => navigate('/admin/performance')}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-left transition-all hover:scale-105 shadow-2xl hover:shadow-purple-500/20"
                >
                  <Zap className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400 mb-3 lg:mb-4" />
                  <h4 className="text-white font-bold text-lg lg:text-xl mb-2">{t('admin.dashboard.performance_title')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.performance_desc')}</p>
                </button>

                <button
                  onClick={() => navigate('/admin/engagement')}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-left transition-all hover:scale-105 shadow-2xl hover:shadow-purple-500/20"
                >
                  <Activity className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400 mb-3 lg:mb-4" />
                  <h4 className="text-white font-bold text-lg lg:text-xl mb-2">{t('admin.dashboard.engagement_title')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.engagement_desc')}</p>
                </button>

                <button
                  onClick={() => navigate('/admin/user-journey')}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-left transition-all hover:scale-105 shadow-2xl hover:shadow-purple-500/20"
                >
                  <MapIcon className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400 mb-3 lg:mb-4" />
                  <h4 className="text-white font-bold text-lg lg:text-xl mb-2">{t('admin.dashboard.user_journey_title')}</h4>
                  <p className="text-white/60 text-xs lg:text-sm">{t('admin.dashboard.user_journey_desc')}</p>
                </button>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'users' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white">{t('admin.dashboard.all_users_count').replace('{count}', String(filteredUsers.length))}</h2>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  type="text"
                  placeholder={t('admin.dashboard.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                />
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 lg:mx-0">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_id')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_username')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_email')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_role')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_lives')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_coins')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_correct_answers')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.table_registration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs font-mono">{user.id.slice(0, 8)}...</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{user.username}</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{user.email}</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{(user as any).role}</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{user.lives}/{user.max_lives}</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{user.coins}</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{user.total_correct_answers}</td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">
                        {new Date(user.created_at).toLocaleDateString('hu-HU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">{t('admin.dashboard.revenue_title')}</h2>
            <div className="overflow-x-auto -mx-4 lg:mx-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.revenue_country')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.revenue_user_count')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.revenue_avg_spend')}</th>
                    <th className="text-left text-white/70 font-medium py-2 lg:py-3 px-2 lg:px-4 text-xs lg:text-sm">{t('admin.dashboard.revenue_flag')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{t('admin.dashboard.country_hungary')}</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">9.783</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">8$</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">🇭🇺</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{t('admin.dashboard.country_england')}</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">2.981</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">7.49$</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">🇬🇧</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">{t('admin.dashboard.country_austria')}</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">2.432</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">7.24$</td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">🇦🇹</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="bg-[#1a1a3e]/50 border border-purple-500/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">{t('admin.dashboard.payouts_title')}</h2>
...
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
            <div className="flex items-start justify-between gap-3 mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                {t('admin.dashboard.invitations_count').replace('{count}', String(invitations.length))}
              </h2>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-white/50 text-xs whitespace-nowrap">
                  {isRefreshing ? t('admin.dashboard.refreshing') : t('admin.dashboard.auto_sync_active')}
                </span>
                <Button
                  onClick={async () => {
                    try {
                      toast.info(t('admin.friendships_sync_starting'));
                      
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        toast.error(t('admin.session_expired'));
                        return;
                      }
                      
                      const { data, error } = await supabase.functions.invoke('backfill-friendships', {
                        headers: { Authorization: `Bearer ${session.access_token}` }
                      });
                      if (error) throw error;
                      toast.success(t('admin.success_friendships_created').replace('{count}', String(data.successful)));
                      await fetchData();
                    } catch (err: any) {
                      toast.error(t('admin.error_unknown').replace('{message}', err.message || t('admin.unknown_error')));
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-sm whitespace-nowrap"
                >
                  {t('admin.dashboard.sync_friendships_manual')}
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-purple-500/30">
                  <tr>
                    <th className="text-left py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm font-semibold">{t('admin.dashboard.inviter')}</th>
                    <th className="text-left py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm font-semibold">{t('admin.dashboard.invited')}</th>
                    <th className="text-left py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm font-semibold">{t('admin.dashboard.code')}</th>
                    <th className="text-left py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm font-semibold">{t('admin.dashboard.status')}</th>
                    <th className="text-left py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm font-semibold">{t('admin.dashboard.created')}</th>
                    <th className="text-left py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm font-semibold">{t('admin.dashboard.activated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation: any) => (
                    <tr key={invitation.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">
                        {invitation.inviter?.username || 'N/A'} 
                        <span className="text-white/50 ml-1">({invitation.inviter?.email || 'N/A'})</span>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white text-xs lg:text-sm">
                        {invitation.invited?.username || t('admin.dashboard.not_registered_yet')} 
                        <span className="text-white/50 ml-1">
                          ({invitation.invited?.email || invitation.invited_email || 'N/A'})
                        </span>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <span className="inline-block px-2 py-1 bg-purple-600/30 text-purple-300 rounded-lg text-xs font-mono">
                          {invitation.invitation_code}
                        </span>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                          invitation.accepted 
                            ? 'bg-green-600/30 text-green-300' 
                            : 'bg-yellow-600/30 text-yellow-300'
                        }`}>
                          {invitation.accepted ? t('admin.dashboard.accepted') : t('admin.dashboard.pending')}
                        </span>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm">
                        {new Date(invitation.created_at).toLocaleDateString('hu-HU', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4 text-white/70 text-xs lg:text-sm">
                        {invitation.accepted_at 
                          ? new Date(invitation.accepted_at).toLocaleDateString('hu-HU', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {invitations.length === 0 && (
                <div className="text-center py-8 text-white/50">
                  {t('admin.dashboard.no_invitations')}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
            <div className="flex items-start justify-between gap-3 mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                {t('admin.dashboard.reports_count').replace('{count}', String(reports.length))}
              </h2>
              <span className="text-white/50 text-xs whitespace-nowrap flex-shrink-0">
                {isRefreshing ? t('admin.dashboard.refreshing') : t('admin.dashboard.auto_sync_active')}
              </span>
            </div>
            
            {/* Sub-tabs for Development and Support */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
              <button
                onClick={() => setReportsSubTab('development')}
                className={`px-4 py-2 rounded-t-lg transition-colors font-semibold ${
                  reportsSubTab === 'development'
                    ? 'bg-orange-600/30 text-orange-400 border-b-2 border-orange-400'
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                {t('admin.dashboard.report_type_development').replace('{count}', String(reports.filter(r => r.report_type === 'bug' && (r.status === 'pending' || r.status === 'reviewing')).length))}
              </button>
              <button
                onClick={() => setReportsSubTab('support')}
                className={`px-4 py-2 rounded-t-lg transition-colors font-semibold ${
                  reportsSubTab === 'support'
                    ? 'bg-red-600/30 text-red-400 border-b-2 border-red-400'
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                {t('admin.dashboard.report_type_support').replace('{count}', String(reports.filter(r => r.report_type === 'user_behavior' && (r.status === 'pending' || r.status === 'reviewing')).length))}
              </button>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {reports.filter(r => 
                reportsSubTab === 'development' ? r.report_type === 'bug' : r.report_type === 'user_behavior'
              ).map((report) => (
                <div
                  key={report.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        report.report_type === 'bug'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {report.report_type === 'bug' ? t('admin.dashboard.report_type_bug') : t('admin.dashboard.report_type_user')}
                      </span>
                      <span className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        report.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : report.status === 'reviewing'
                          ? 'bg-blue-500/20 text-blue-400'
                          : report.status === 'resolved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {report.status === 'pending' 
                          ? t('admin.dashboard.report_status_pending')
                          : report.status === 'reviewing'
                          ? t('admin.dashboard.report_status_reviewing')
                          : report.status === 'resolved' 
                          ? t('admin.dashboard.report_status_resolved')
                          : t('admin.dashboard.report_status_dismissed')}
                      </span>
                    </div>
                    <span className="text-xs text-white/50">
                      {new Date(report.created_at).toLocaleDateString('hu-HU')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-white/70">
                      <strong className="text-white">{t('admin.dashboard.reporter')}</strong>{' '}
                      {report.reporter?.username || t('admin.dashboard.unknown')} ({report.reporter?.email})
                    </p>

                    {report.report_type === 'bug' ? (
                      <>
                        <p className="text-sm text-white/70">
                          <strong className="text-white">{t('admin.dashboard.category')}</strong> {report.bug_category}
                        </p>
                        <p className="text-sm text-white/70">
                          <strong className="text-white">{t('admin.dashboard.description_label')}</strong> {report.bug_description}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-white/70">
                          <strong className="text-white">{t('admin.dashboard.reported_user')}</strong>{' '}
                          {report.reported_user?.username || t('admin.dashboard.unknown')}
                        </p>
                        <p className="text-sm text-white/70">
                          <strong className="text-white">{t('admin.dashboard.violation_type')}</strong> {report.violation_type}
                        </p>
                        <p className="text-sm text-white/70">
                          <strong className="text-white">{t('admin.dashboard.details')}</strong> {report.violation_description}
                        </p>
                      </>
                    )}

                      <div className="mt-3">
                        <strong className="text-white text-sm block mb-2">{t('admin.dashboard.attached_images')} ({report.screenshot_urls.length}):</strong>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {report.screenshot_urls.map((url: string, idx: number) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group relative block overflow-hidden rounded-lg border-2 border-purple-500/30 hover:border-yellow-500 transition-all"
                            >
                              <img 
                                src={url} 
                                alt={`${t('admin.dashboard.screenshot')} ${idx + 1}`}
                                className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  console.error('Image load error:', url);
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" fill="%23999"%3EHiba%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 text-white text-xs bg-black/70 px-2 py-1 rounded">
                                  {t('admin.dashboard.open_image')}
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>

                    {report.admin_notes && (
                      <p className="text-sm text-purple-300 mt-2">
                        <strong>{t('admin.dashboard.admin_note')}</strong> {report.admin_notes}
                      </p>
                    )}
                  </div>

                  {(report.status === 'pending' || report.status === 'reviewing') && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => {
                          setSelectedReport({ id: report.id, reporterId: report.reporter_id, report });
                          setActionType('reviewing');
                          setActionDialogOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        📋 {t('admin.dashboard.action_reviewing')}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport({ id: report.id, reporterId: report.reporter_id, report });
                          setActionType('resolved');
                          setActionDialogOpen(true);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                      >
                        ✅ {t('admin.dashboard.action_resolved')}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport({ id: report.id, reporterId: report.reporter_id, report });
                          setActionType('dismissed');
                          setActionDialogOpen(true);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                      >
                        ❌ {t('admin.dashboard.action_dismissed')}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {reports.filter(r => 
                reportsSubTab === 'development' ? r.report_type === 'bug' : r.report_type === 'user_behavior'
              ).length === 0 && (
                <div className="text-center py-8 text-white/50">
                  {reportsSubTab === 'development' ? t('admin.dashboard.no_dev_reports') : t('admin.dashboard.no_support_reports')}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      
      {/* Action Dialog */}
      {selectedReport && (
        <AdminReportActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          report={selectedReport.report}
          actionType={actionType}
          onSuccess={() => {
            fetchData();
            setSelectedReport(null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
