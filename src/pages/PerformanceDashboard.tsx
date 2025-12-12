import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePerformanceAnalytics } from "@/hooks/usePerformanceAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { MetricInfo } from "@/components/admin/MetricInfo";
import { useI18n } from '@/i18n';

const PerformanceDashboard = () => {
  const { analytics, loading, error, refetch } = usePerformanceAnalytics();
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
          <p className="text-lg text-red-400">{error || t('performance.error_loading')}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                {t('admin.performance.dashboard_title')}
              </h1>
              <p className="text-white/60 text-sm mt-1">{t('admin.performance.dashboard_subtitle')}</p>
            </div>
          </div>
          <Button onClick={() => refetch()} disabled={loading} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.performance.refresh_button')}
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="backdrop-blur-xl bg-white/5 border border-white/10 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white text-white/60">
              {t('admin.performance.tab_overview')}
            </TabsTrigger>
            <TabsTrigger value="pages" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white text-white/60">
              {t('admin.performance.tab_pages')}
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white text-white/60">
              {t('admin.performance.tab_devices')}
            </TabsTrigger>
            <TabsTrigger value="errors" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white text-white/60">
              {t('admin.performance.tab_errors')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center">
                    {t('admin.performance.avg_load_time')}
                    <MetricInfo 
                      title={t('admin.performance.load_time_title')}
                      description={t('admin.performance.load_time_desc')}
                      interpretation={t('admin.performance.load_time_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{analytics.overallMetrics.avgLoadTime}ms</p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center">
                    {t('admin.performance.avg_ttfb')}
                    <MetricInfo 
                      title={t('admin.performance.ttfb_title')}
                      description={t('admin.performance.ttfb_desc')}
                      interpretation={t('admin.performance.ttfb_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{analytics.overallMetrics.avgTTFB}ms</p>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base sm:text-lg flex items-center">
                    {t('admin.performance.avg_lcp')}
                    <MetricInfo 
                      title={t('admin.performance.lcp_title')}
                      description={t('admin.performance.lcp_desc')}
                      interpretation={t('admin.performance.lcp_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{analytics.overallMetrics.avgLCP}ms</p>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base sm:text-lg flex items-center">
                    {t('admin.performance.avg_cls')}
                    <MetricInfo 
                      title={t('admin.performance.cls_title')}
                      description={t('admin.performance.cls_desc')}
                      interpretation={t('admin.performance.cls_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{analytics.overallMetrics.avgCLS}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pages" className="space-y-6">
            <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  {t('admin.performance.by_page_title')}
                  <MetricInfo 
                    title={t('admin.performance.by_page_metric_title')}
                    description={t('admin.performance.by_page_desc')}
                    interpretation={t('admin.performance.by_page_interpretation')}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.performanceByPage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="page_route" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="avg_load_time_ms" fill="hsl(var(--primary))" name={t('admin.performance.avg_load_time_ms')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    {t('admin.performance.by_device_title')}
                    <MetricInfo 
                      title={t('admin.performance.by_device_metric_title')}
                      description={t('admin.performance.by_device_desc')}
                      interpretation={t('admin.performance.by_device_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.performanceByDevice}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="device_type" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="avg_load_time" fill="hsl(var(--primary))" name={t('admin.performance.avg_load_time_ms')} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    {t('admin.performance.by_browser_title')}
                    <MetricInfo 
                      title={t('admin.performance.by_browser_metric_title')}
                      description={t('admin.performance.by_browser_desc')}
                      interpretation={t('admin.performance.by_browser_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.performanceByBrowser}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="browser" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid #6b7280', color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="avg_load_time" fill="hsl(var(--secondary))" name={t('admin.performance.avg_load_time_ms')} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    {t('performance.errors_by_page')}
                    <MetricInfo 
                      title={t('performance.errors_by_page_title')}
                      description={t('performance.errors_by_page_desc')}
                      interpretation={t('performance.errors_by_page_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.errorsByPage.length > 0 ? analytics.errorsByPage.map((error, index) => (
                      <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                        <div>
                          <p className="font-medium text-white">{error.page_route}</p>
                          <p className="text-sm text-white/70">{error.error_type}</p>
                        </div>
                        <span className="text-sm font-bold text-white">{error.error_count} {t('performance.error_count')}</span>
                      </div>
                    )) : (
                      <p className="text-white/60 text-center py-8">{t('performance.no_errors_page')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a3e]/50 border border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    {t('performance.top_errors')}
                    <MetricInfo 
                      title={t('performance.top_errors_title')}
                      description={t('performance.top_errors_desc')}
                      interpretation={t('performance.top_errors_interpretation')}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topErrors.length > 0 ? analytics.topErrors.map((error, index) => (
                      <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-purple-500/20 rounded bg-[#0a0a2e]/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white">{error.error_type}</p>
                          <p className="text-sm text-white/70 truncate">{error.error_message.slice(0, 50)}...</p>
                        </div>
                        <span className="text-sm font-bold text-white whitespace-nowrap">{error.count}x</span>
                      </div>
                    )) : (
                      <p className="text-white/60 text-center py-8">{t('performance.no_errors')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default PerformanceDashboard;
