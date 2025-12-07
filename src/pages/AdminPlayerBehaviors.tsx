import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Gamepad2, Target, Clock, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

interface HelpUsage {
  third: number;
  skip: number;
  audience: number;
  '2x_answer': number;
}

interface CategoryStats {
  category: string;
  uniquePlayers: number;
  totalGames: number;
  completedGames: number;
  abandonedGames: number;
  completionRate: number;
  avgCorrectAnswers: number;
  avgResponseTime: number;
  helpUsage: HelpUsage;
}

const AdminPlayerBehaviors = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const isInitialLoad = useRef(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        navigate('/dashboard');
        return;
      }

      setAuthChecked(true);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/admin/login');
    }
  }, [navigate]);

  const fetchData = useCallback(async (isBackground = false) => {
    try {
      // Only show loading on initial load
      if (!isBackground && isInitialLoad.current) {
        setLoading(true);
      }
      // Show refresh indicator for manual refresh
      if (!isBackground && !isInitialLoad.current) {
        setIsRefreshing(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('admin-player-behaviors', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Error fetching player behaviors:', response.error);
        return;
      }

      setStats(response.data?.stats || []);
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error fetching player behaviors:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  // Background refresh (silent)
  const backgroundRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authChecked) {
      fetchData(false);
    }
  }, [authChecked, fetchData]);

  // Real-time subscriptions - silent background updates
  useEffect(() => {
    if (!authChecked) return;

    const channel = supabase
      .channel('player-behaviors-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        () => {
          backgroundRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_help_usage' },
        () => {
          backgroundRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_exit_events' },
        () => {
          backgroundRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecked, backgroundRefresh]);

  if (!authChecked) {
    return (
      <div className="min-h-dvh min-h-svh relative overflow-hidden bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#0f0a1f] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="relative z-10">
          <p className="text-white/70 text-lg">{t('admin.loading')}</p>
        </div>
      </div>
    );
  }

  const mixedStats = stats.find(s => s.category === 'mixed');

  // Only show full loading screen on initial load
  if (loading && !mixedStats) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('admin.player_behaviors.title')}</h1>
              <p className="text-white/60">{t('admin.player_behaviors.description')}</p>
            </div>
          </div>
          <div className="text-white/60 text-center py-8">{t('admin.loading')}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('admin.player_behaviors.title')}</h1>
            <p className="text-white/60">{t('admin.player_behaviors.description')}</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('admin.refresh')}
          </Button>
        </div>

        {!mixedStats ? (
          <div className="text-white/60 text-center py-8">{t('admin.no_data')}</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                  <span className="text-white/60 text-sm">{t('admin.player_behaviors.unique_players')}</span>
                </div>
                <p className="text-3xl font-bold text-white">{mixedStats.uniquePlayers.toLocaleString()}</p>
              </Card>

              <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-white/60 text-sm">{t('admin.player_behaviors.total_games')}</span>
                </div>
                <p className="text-3xl font-bold text-white">{mixedStats.totalGames.toLocaleString()}</p>
                <p className="text-sm text-white/40 mt-1">
                  {t('admin.player_behaviors.completed')}: {mixedStats.completedGames.toLocaleString()} ({mixedStats.completionRate}%)
                </p>
              </Card>

              <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="text-white/60 text-sm">{t('admin.player_behaviors.avg_correct')}</span>
                </div>
                <p className="text-3xl font-bold text-white">{mixedStats.avgCorrectAnswers}</p>
                <p className="text-sm text-white/40 mt-1">{t('admin.player_behaviors.per_game')}</p>
              </Card>

              <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span className="text-white/60 text-sm">{t('admin.player_behaviors.avg_response_time')}</span>
                </div>
                <p className="text-3xl font-bold text-white">{mixedStats.avgResponseTime}s</p>
                <p className="text-sm text-white/40 mt-1">{t('admin.player_behaviors.per_question')}</p>
              </Card>
            </div>

            {/* Help Usage Stats */}
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">{t('admin.player_behaviors.help_usage')}</h2>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-white/70">{t('admin.player_behaviors.help_type')}</TableHead>
                      <TableHead className="text-white/70">{t('admin.player_behaviors.times_used')}</TableHead>
                      <TableHead className="text-white/70">{t('admin.player_behaviors.percentage')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(mixedStats.helpUsage).map(([type, count]) => {
                      const totalHelps = Object.values(mixedStats.helpUsage).reduce((a, b) => a + b, 0);
                      const percentage = totalHelps > 0 ? ((count / totalHelps) * 100).toFixed(1) : '0';
                      return (
                        <TableRow key={type} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white font-medium">
                            {type === 'third' && t('admin.player_behaviors.help_third')}
                            {type === 'skip' && t('admin.player_behaviors.help_skip')}
                            {type === 'audience' && t('admin.player_behaviors.help_audience')}
                            {type === '2x_answer' && t('admin.player_behaviors.help_2x')}
                          </TableCell>
                          <TableCell className="text-white/80">{count.toLocaleString()}</TableCell>
                          <TableCell className="text-purple-400 font-medium">{percentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Game Completion Stats */}
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Gamepad2 className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold text-white">{t('admin.player_behaviors.game_completion')}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">{t('admin.player_behaviors.completed_games')}</p>
                  <p className="text-2xl font-bold text-green-400">{mixedStats.completedGames.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">{t('admin.player_behaviors.abandoned_games')}</p>
                  <p className="text-2xl font-bold text-red-400">{mixedStats.abandonedGames.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">{t('admin.player_behaviors.completion_rate')}</p>
                  <p className="text-2xl font-bold text-purple-400">{mixedStats.completionRate}%</p>
                </div>
              </div>

              {/* Completion Rate Bar */}
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: `${mixedStats.completionRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-white/40 mt-2">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlayerBehaviors;
