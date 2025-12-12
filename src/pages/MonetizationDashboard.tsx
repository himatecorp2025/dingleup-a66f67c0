import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMonetizationAnalyticsQuery } from '@/hooks/queries/useMonetizationAnalyticsQuery';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useI18n } from '@/i18n';

const MonetizationDashboard = () => {
  const navigate = useNavigate();
  const { analytics, loading, error, refetch } = useMonetizationAnalyticsQuery();
  const { t } = useI18n();

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <Card className="backdrop-blur-xl bg-red-500/10 border-red-500/20">
            <CardContent className="p-8 text-center">
              <p className="text-red-400 mb-4">{t('admin.error_loading')}</p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('admin.retry')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-[clamp(1.5rem,4vw,2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-[clamp(0.75rem,2vw,1rem)] flex-wrap">
          <div className="flex items-center gap-[clamp(0.75rem,2vw,1rem)]">
            <div>
              <h1 className="text-[clamp(2rem,5vw,2.5rem)] font-black bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
                {t('admin.monetization.title')}
              </h1>
              <p className="text-white/60 mt-[clamp(0.125rem,0.5vw,0.25rem)] text-[clamp(0.75rem,1.75vw,0.875rem)]">{t('admin.monetization.subtitle')}</p>
            </div>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-[clamp(0.875rem,2vw,1rem)] h-[clamp(0.875rem,2vw,1rem)] mr-[clamp(0.25rem,1vw,0.5rem)]" />
            {t('admin.refresh')}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[clamp(1rem,3vw,1.5rem)]">
          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader className="pb-[clamp(0.5rem,1.5vw,0.75rem)]">
              <CardTitle className="text-[clamp(0.75rem,1.75vw,0.875rem)] font-medium text-white/60 flex items-center gap-[clamp(0.25rem,1vw,0.5rem)]">
                <DollarSign className="w-[clamp(0.875rem,2vw,1rem)] h-[clamp(0.875rem,2vw,1rem)]" />
                {t('admin.monetization.total_revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold text-white">
                {analytics?.totalRevenue?.toLocaleString('hu-HU')} Ft
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                <Users className="w-4 h-4" />
                ARPU
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.arpu?.toFixed(0) || 0} Ft
              </div>
              <p className="text-xs text-white/40 mt-1">{t('admin.monetization.arpu_desc')}</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                ARPPU
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.arppu?.toFixed(0) || 0} Ft
              </div>
              <p className="text-xs text-white/40 mt-1">{t('admin.monetization.arppu_desc')}</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {t('admin.monetization.conversion_rate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.conversionRate?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-white/40 mt-1">{analytics?.payingUsers || 0} / {analytics?.totalUsers || 0} {t('admin.monetization.paying_users')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Over Time */}
        {analytics?.revenueOverTime && analytics.revenueOverTime.length > 0 && (
          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">{t('admin.monetization.revenue_over_time')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={t('admin.monetization.revenue_chart')} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Product */}
        {analytics?.revenueByProduct && analytics.revenueByProduct.length > 0 && (
          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">{t('admin.monetization.revenue_by_product')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.revenueByProduct}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="product" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name={t('admin.monetization.revenue_chart')} />
                  <Bar dataKey="count" fill="#3b82f6" name={t('admin.monetization.purchase_count')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {(!analytics?.revenueOverTime || analytics.revenueOverTime.length === 0) && (
          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-white/60">{t('admin.monetization.no_data')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default MonetizationDashboard;
