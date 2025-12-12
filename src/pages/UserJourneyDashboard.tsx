import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserJourneyAnalytics } from "@/hooks/useUserJourneyAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { MetricInfo } from '@/components/admin/MetricInfo';
import { useI18n } from '@/i18n';

const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24'];

const UserJourneyDashboard = () => {
  const { analytics, loading, error, refetch } = useUserJourneyAnalytics();
  const { t } = useI18n();

  const getFunnelLabel = (raw: string): string => {
    switch (raw) {
      case 'Regisztráció':
      case 'Registration':
        return t('journey.funnel.registration');
      case 'Dashboard látogatás':
      case 'Dashboard Visit':
        return t('journey.funnel.dashboard_visit');
      case 'Első játék':
      case 'First Game':
        return t('journey.funnel.first_game');
      case 'Első vásárlás':
      case 'First Purchase':
        return t('journey.funnel.first_purchase');
      case 'Termék megtekintés':
      case 'Product View':
        return t('journey.funnel.product_view');
      case 'Kosárba helyezés':
      case 'Add to Cart':
        return t('journey.funnel.add_to_cart');
      case 'Vásárlás':
      case 'Purchase':
        return t('journey.funnel.purchase');
      case 'Játék kezdés':
      case 'Game Start':
        return t('journey.funnel.game_start');
      case '5. kérdés elérése':
      case 'Question 5 Reached':
        return t('journey.funnel.question_5');
      case '10. kérdés elérése':
      case 'Question 10 Reached':
        return t('journey.funnel.question_10');
      case 'Játék befejezés':
      case 'Game Complete':
        return t('journey.funnel.game_complete');
      default:
        return raw;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-lg text-white/70">{t('admin.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !analytics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-red-400">{error || t('admin.error_loading')}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              {t('admin.journey.title')}
            </h1>
          </div>
          <Button onClick={() => refetch()} disabled={loading} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.refresh')}
          </Button>
        </div>

        <Card className="bg-primary-dark/30 border border-primary/20">
          <CardContent className="pt-6">
            <p className="text-foreground/80 leading-relaxed">
              {t('admin.journey.description')}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="onboarding" className="space-y-6">
          <TabsList className="bg-primary-dark/50 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.journey.tab_onboarding')}
            </TabsTrigger>
            <TabsTrigger value="purchase" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.journey.tab_purchase')}
            </TabsTrigger>
            <TabsTrigger value="game" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.journey.tab_game')}
            </TabsTrigger>
            <TabsTrigger value="paths" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.journey.tab_paths')}
            </TabsTrigger>
            <TabsTrigger value="exits" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.journey.tab_exits')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="space-y-6">
            <Card className="bg-primary-dark/50 border border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-foreground">{t('admin.journey.onboarding_funnel')}</CardTitle>
                  <MetricInfo
                    title={t('admin.journey.onboarding_funnel')}
                    description={t('admin.journey.onboarding_funnel_desc')}
                    interpretation={t('admin.journey.onboarding_funnel_interpretation')}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.onboardingFunnel.map(step => ({ ...step, stepLabel: getFunnelLabel(step.step) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--foreground))" />
                    <YAxis dataKey="stepLabel" type="category" width={150} stroke="hsl(var(--foreground))" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--primary-dark))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="users" name={t('admin.journey.users')}>
                      {analytics.onboardingFunnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.onboardingFunnel.map((step, index) => {
                    const label = getFunnelLabel(step.step);
                    return (
                      <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                        <span className="font-medium text-white">{label}</span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{step.users} {t('admin.journey.user')}</p>
                          {step.dropoffRate > 0 && (
                            <p className="text-xs text-red-400">
                              {step.dropoffRate.toFixed(1)}% {t('admin.journey.dropoff')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white">{t('admin.journey.purchase_funnel')}</CardTitle>
                  <MetricInfo
                    title={t('admin.journey.purchase_funnel')}
                    description={t('admin.journey.purchase_funnel_desc')}
                    interpretation={t('admin.journey.purchase_funnel_interpretation')}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.purchaseFunnel.map(step => ({ ...step, stepLabel: getFunnelLabel(step.step) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#fff" />
                    <YAxis dataKey="stepLabel" type="category" width={150} stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="users" name={t('admin.journey.users')}>
                      {analytics.purchaseFunnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.purchaseFunnel.map((step, index) => {
                    const label = getFunnelLabel(step.step);
                    return (
                      <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                        <span className="font-medium text-white">{label}</span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{step.users} {t('admin.journey.user')}</p>
                          {step.dropoffRate > 0 && (
                            <p className="text-xs text-red-400">
                              {step.dropoffRate.toFixed(1)}% {t('admin.journey.dropoff')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="game" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white">{t('admin.journey.game_funnel')}</CardTitle>
                  <MetricInfo
                    title={t('admin.journey.game_funnel')}
                    description={t('admin.journey.game_funnel_desc')}
                    interpretation={t('admin.journey.game_funnel_interpretation')}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.gameFunnel.map(step => ({ ...step, stepLabel: getFunnelLabel(step.step) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#fff" />
                    <YAxis dataKey="stepLabel" type="category" width={150} stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="users" name={t('admin.journey.users')}>
                      {analytics.gameFunnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.gameFunnel.map((step, index) => {
                    const label = getFunnelLabel(step.step);
                    return (
                      <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                        <span className="font-medium text-white">{label}</span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{step.users} {t('admin.journey.user')}</p>
                          {step.dropoffRate > 0 && (
                            <p className="text-xs text-red-400">
                              {step.dropoffRate.toFixed(1)}% {t('admin.journey.dropoff')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paths" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white">{t('admin.journey.common_paths')}</CardTitle>
                  <MetricInfo
                    title={t('admin.journey.common_paths')}
                    description={t('admin.journey.common_paths_desc')}
                    interpretation={t('admin.journey.common_paths_interpretation')}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.commonPaths.map((path, index) => (
                    <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                      <span className="font-mono text-sm text-white break-all">{path.path}</span>
                      <span className="font-bold text-white whitespace-nowrap">{path.count} {t('admin.journey.occurrences')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exits" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white">{t('admin.journey.exit_points')}</CardTitle>
                  <MetricInfo
                    title={t('admin.journey.exit_points')}
                    description={t('admin.journey.exit_points_desc')}
                    interpretation={t('admin.journey.exit_points_interpretation')}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.exitPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="page" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="exits" fill="hsl(var(--destructive))" name={t('admin.journey.exits')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default UserJourneyDashboard;
