import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRetentionAnalytics } from "@/hooks/useRetentionAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';

const RetentionDashboard = () => {
  const { analytics, loading, error, refetch } = useRetentionAnalytics();
  const { t } = useI18n();

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              {t('admin.retention.title')}
            </h1>
          </div>
          <Button onClick={() => refetch()} disabled={loading} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.refresh')}
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-primary-dark/50 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.retention.tab_overview')}
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.retention.tab_cohorts')}
            </TabsTrigger>
            <TabsTrigger value="churn" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
              {t('admin.retention.tab_churn')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Card className="bg-primary-dark/50 border border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground text-base sm:text-lg">{t('admin.retention.daily_active')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl sm:text-4xl font-bold text-foreground">{analytics.dailyActiveUsers}</p>
                </CardContent>
              </Card>

              <Card className="bg-primary-dark/50 border border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground text-base sm:text-lg">{t('admin.retention.weekly_active')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl sm:text-4xl font-bold text-foreground">{analytics.weeklyActiveUsers}</p>
                </CardContent>
              </Card>

              <Card className="bg-primary-dark/50 border border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground text-base sm:text-lg">{t('admin.retention.monthly_active')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{analytics.monthlyActiveUsers}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white">{t('admin.retention.retention_rates')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: t('admin.retention.day_1'), rate: analytics.retentionRates.day1 },
                    { name: t('admin.retention.day_7'), rate: analytics.retentionRates.day7 },
                    { name: t('admin.retention.day_30'), rate: analytics.retentionRates.day30 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cohorts" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white">{t('admin.retention.cohort_analysis')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.cohortData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="cohort" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="day1" stroke="hsl(var(--primary))" name="1. Nap" />
                    <Line type="monotone" dataKey="day7" stroke="hsl(var(--secondary))" name="7. Nap" />
                    <Line type="monotone" dataKey="day30" stroke="hsl(var(--accent))" name="30. Nap" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white">{t('admin.retention.inactive_users')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.churningUsers.slice(0, 10).map(user => (
                    <div key={user.user_id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                      <span className="font-medium text-white">{user.username}</span>
                      <span className="text-sm text-white/70">
                        {user.days_inactive} {t('admin.retention.days_inactive_label')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RetentionDashboard;
