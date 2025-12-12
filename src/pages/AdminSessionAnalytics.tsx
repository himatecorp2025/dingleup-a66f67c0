import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Users, Activity, Smartphone, Clock, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSessionAnalytics } from '@/hooks/useSessionAnalytics';
import { useI18n } from '@/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const EVENT_TYPE_COLORS: Record<string, string> = {
  app_opened: 'bg-green-500/20 text-green-400 border-green-500/30',
  app_closed: 'bg-red-500/20 text-red-400 border-red-500/30',
  tab_hidden: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  tab_visible: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  app_installed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  app_launched_standalone: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  install_prompt_shown: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const DAYS = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminSessionAnalytics() {
  const { t, lang } = useI18n();
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  
  const { data, loading, error, refetch } = useSessionAnalytics({
    eventType: eventFilter,
    page,
    limit: 50,
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(lang === 'hu' ? 'hu-HU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getHeatmapColor = (value: number, max: number) => {
    if (value === 0) return 'bg-white/5';
    const intensity = Math.min(value / max, 1);
    if (intensity < 0.25) return 'bg-purple-500/20';
    if (intensity < 0.5) return 'bg-purple-500/40';
    if (intensity < 0.75) return 'bg-purple-500/60';
    return 'bg-purple-500/80';
  };

  const dayLabels = lang === 'hu' ? DAYS : DAYS_EN;

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="p-[clamp(1rem,3vw,2rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-[clamp(1rem,3vw,2rem)]">
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-6">
              <p className="text-red-400">{error}</p>
              <Button onClick={refetch} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('common.retry')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const maxHeatmapValue = Math.max(...(data?.hourlyHeatmap?.flat() || [1]));

  return (
    <AdminLayout>
      <div className="p-[clamp(1rem,3vw,2rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white">
              {t('admin.session_analytics.title')}
            </h1>
            <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-white/60">
              {t('admin.session_analytics.description')}
            </p>
          </div>
          <Button
            onClick={refetch}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-[clamp(0.5rem,2vw,1rem)]">
          <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30">
            <CardContent className="p-[clamp(0.75rem,2vw,1.25rem)]">
              <div className="flex items-center gap-3">
                <Activity className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] text-purple-400" />
                <div>
                  <p className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-white/60">{t('admin.session_analytics.total_events')}</p>
                  <p className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white">
                    {data?.summary.totalEvents.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30">
            <CardContent className="p-[clamp(0.75rem,2vw,1.25rem)]">
              <div className="flex items-center gap-3">
                <Users className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] text-green-400" />
                <div>
                  <p className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-white/60">{t('admin.session_analytics.unique_users')}</p>
                  <p className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white">
                    {data?.summary.uniqueUsers.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30">
            <CardContent className="p-[clamp(0.75rem,2vw,1.25rem)]">
              <div className="flex items-center gap-3">
                <Clock className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] text-blue-400" />
                <div>
                  <p className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-white/60">{t('admin.session_analytics.avg_duration')}</p>
                  <p className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white">
                    {formatDuration(data?.summary.avgSessionDuration || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600/20 to-yellow-600/20 border-orange-500/30">
            <CardContent className="p-[clamp(0.75rem,2vw,1.25rem)]">
              <div className="flex items-center gap-3">
                <Smartphone className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] text-orange-400" />
                <div>
                  <p className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-white/60">{t('admin.session_analytics.pwa_installs')}</p>
                  <p className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white">
                    {data?.summary.pwaInstalls.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-600/20 to-slate-600/20 border-gray-500/30">
            <CardContent className="p-[clamp(0.75rem,2vw,1.25rem)]">
              <div className="flex items-center gap-3">
                <Archive className="w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)] text-gray-400" />
                <div>
                  <p className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-white/60">{t('admin.session_analytics.archived')}</p>
                  <p className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white">
                    {data?.summary.archivedEvents.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[clamp(0.5rem,2vw,1rem)]">
          {/* Event Breakdown */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[clamp(0.875rem,2vw,1rem)] text-white">
                {t('admin.session_analytics.event_breakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.eventBreakdown || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="event_type" 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={10}
                    width={120}
                    tickFormatter={(value) => value.replace(/_/g, ' ')}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[clamp(0.875rem,2vw,1rem)] text-white">
                {t('admin.session_analytics.daily_trend')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={10}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Heatmap */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[clamp(0.875rem,2vw,1rem)] text-white">
              {t('admin.session_analytics.hourly_heatmap')}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex gap-1 mb-1 pl-12">
                {[...Array(24)].map((_, h) => (
                  <div key={h} className="w-6 text-center text-[10px] text-white/40">
                    {h}
                  </div>
                ))}
              </div>
              {data?.hourlyHeatmap?.map((dayData, dayIndex) => (
                <div key={dayIndex} className="flex gap-1 items-center">
                  <div className="w-10 text-right text-[10px] text-white/60 pr-2">
                    {dayLabels[dayIndex]}
                  </div>
                  {dayData.map((value, hourIndex) => (
                    <div
                      key={hourIndex}
                      className={`w-6 h-6 rounded-sm ${getHeatmapColor(value, maxHeatmapValue)} flex items-center justify-center`}
                      title={`${dayLabels[dayIndex]} ${hourIndex}:00 - ${value} events`}
                    >
                      {value > 0 && (
                        <span className="text-[8px] text-white/80">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-[clamp(0.875rem,2vw,1rem)] text-white">
                {t('admin.session_analytics.recent_events')}
              </CardTitle>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder={t('admin.session_analytics.filter_by_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="app_opened">{t('admin.session_analytics.event_app_opened')}</SelectItem>
                  <SelectItem value="app_closed">{t('admin.session_analytics.event_app_closed')}</SelectItem>
                  <SelectItem value="tab_hidden">{t('admin.session_analytics.event_tab_hidden')}</SelectItem>
                  <SelectItem value="tab_visible">{t('admin.session_analytics.event_tab_visible')}</SelectItem>
                  <SelectItem value="app_installed">{t('admin.session_analytics.event_app_installed')}</SelectItem>
                  <SelectItem value="app_launched_standalone">{t('admin.session_analytics.event_standalone_launch')}</SelectItem>
                  <SelectItem value="install_prompt_shown">{t('admin.session_analytics.event_install_prompt')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60">{t('admin.session_analytics.user')}</TableHead>
                  <TableHead className="text-white/60">{t('admin.session_analytics.event')}</TableHead>
                  <TableHead className="text-white/60">{t('admin.session_analytics.duration')}</TableHead>
                  <TableHead className="text-white/60">{t('admin.session_analytics.device')}</TableHead>
                  <TableHead className="text-white/60">{t('admin.session_analytics.location')}</TableHead>
                  <TableHead className="text-white/60">{t('admin.session_analytics.time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.events?.map((event) => (
                  <TableRow key={event.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-white font-medium">
                      {event.username}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500/20 text-gray-400'} border text-[10px]`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/80">
                      {formatDuration(event.session_duration_seconds)}
                    </TableCell>
                    <TableCell className="text-white/60 text-[clamp(0.625rem,1.5vw,0.75rem)]">
                      {event.browser || '-'}
                      {event.screen_size && <span className="block text-white/40">{event.screen_size}</span>}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {event.country_code || '-'}
                      {event.city && <span className="block text-white/40">{event.city}</span>}
                    </TableCell>
                    <TableCell className="text-white/60 text-[clamp(0.625rem,1.5vw,0.75rem)]">
                      {formatDate(event.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('common.previous')}
              </Button>
              <span className="text-white/60 text-sm">
                {t('common.page')} {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data?.pagination?.hasMore}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {t('common.next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
