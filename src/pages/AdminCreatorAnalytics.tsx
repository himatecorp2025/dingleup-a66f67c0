import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Eye, Video, MousePointer, Users, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AdminCreatorAnalytics = () => {
  const { t } = useI18n();
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Fetch aggregated analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-creator-analytics', platformFilter, dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));

      // Get all videos with stats
      let videosQuery = supabase
        .from('creator_videos')
        .select('id, user_id, platform, title, is_active, total_impressions, total_video_completions, total_relevant_hits, total_clickthrough, created_at');

      if (platformFilter !== 'all') {
        videosQuery = videosQuery.eq('platform', platformFilter);
      }

      const { data: videos, error: videosError } = await videosQuery;
      if (videosError) throw videosError;

      // Get daily analytics
      let dailyQuery = supabase
        .from('creator_analytics_daily')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (platformFilter !== 'all') {
        dailyQuery = dailyQuery.eq('platform', platformFilter);
      }

      const { data: daily, error: dailyError } = await dailyQuery;
      if (dailyError) throw dailyError;

      // Aggregate totals
      const totals = {
        impressions: videos?.reduce((sum, v) => sum + (v.total_impressions || 0), 0) || 0,
        completions: videos?.reduce((sum, v) => sum + (v.total_video_completions || 0), 0) || 0,
        relevantHits: videos?.reduce((sum, v) => sum + (v.total_relevant_hits || 0), 0) || 0,
        clicks: videos?.reduce((sum, v) => sum + (v.total_clickthrough || 0), 0) || 0,
        totalVideos: videos?.length || 0,
        activeVideos: videos?.filter(v => v.is_active).length || 0,
      };

      // Group daily by date
      const dailyAggregated = daily?.reduce((acc, d) => {
        const existing = acc.find(a => a.date === d.date);
        if (existing) {
          existing.impressions += d.impressions;
          existing.completions += d.video_completions;
          existing.relevantHits += d.relevant_hits;
          existing.clicks += d.clickthroughs;
        } else {
          acc.push({
            date: d.date,
            impressions: d.impressions,
            completions: d.video_completions,
            relevantHits: d.relevant_hits,
            clicks: d.clickthroughs,
          });
        }
        return acc;
      }, [] as any[]) || [];

      // Platform breakdown
      const platformBreakdown = videos?.reduce((acc, v) => {
        const existing = acc.find(a => a.platform === v.platform);
        if (existing) {
          existing.impressions += v.total_impressions || 0;
          existing.completions += v.total_video_completions || 0;
          existing.clicks += v.total_clickthrough || 0;
          existing.videos += 1;
        } else {
          acc.push({
            platform: v.platform,
            impressions: v.total_impressions || 0,
            completions: v.total_video_completions || 0,
            clicks: v.total_clickthrough || 0,
            videos: 1,
          });
        }
        return acc;
      }, [] as any[]) || [];

      // Top videos
      const topVideos = [...(videos || [])].sort((a, b) => (b.total_impressions || 0) - (a.total_impressions || 0)).slice(0, 10);

      // Hourly heatmap (if available)
      const hourlyData = daily?.reduce((acc, d) => {
        if (d.hour_of_day !== null) {
          const existing = acc.find(a => a.hour === d.hour_of_day);
          if (existing) {
            existing.impressions += d.impressions;
          } else {
            acc.push({ hour: d.hour_of_day, impressions: d.impressions });
          }
        }
        return acc;
      }, [] as any[]) || [];

      return {
        totals,
        daily: dailyAggregated,
        platformBreakdown,
        topVideos,
        hourlyData: hourlyData.sort((a, b) => a.hour - b.hour),
      };
    },
    staleTime: 0,
  });

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      tiktok: '🎵',
      youtube: '▶️',
      instagram: '📷',
      facebook: '📘',
    };
    return icons[platform] || '🎬';
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    const headers = ['Date', 'Impressions', 'Completions', 'Relevant Hits', 'Clicks'];
    const rows = analytics.daily.map(d => [
      d.date,
      d.impressions,
      d.completions,
      d.relevantHits,
      d.clicks,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue placeholder={t('admin.creators.platform') || 'Platform'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all') || 'Összes'}</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('admin.analytics.last_7_days') || 'Utolsó 7 nap'}</SelectItem>
              <SelectItem value="14">{t('admin.analytics.last_14_days') || 'Utolsó 14 nap'}</SelectItem>
              <SelectItem value="30">{t('admin.analytics.last_30_days') || 'Utolsó 30 nap'}</SelectItem>
              <SelectItem value="90">{t('admin.analytics.last_90_days') || 'Utolsó 90 nap'}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV Export
          </Button>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t('admin.creators.impressions') || 'Megjelenítések'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totals.impressions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  {t('admin.creators.completions') || 'Befejezések'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totals.completions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('admin.creators.relevant_hits') || 'Releváns nézők'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totals.relevantHits.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  {t('admin.creators.clicks') || 'Átkattintások'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totals.clicks.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  CTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totals.impressions > 0 
                    ? ((analytics?.totals.clicks / analytics?.totals.impressions) * 100).toFixed(2) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  {t('admin.videos.active') || 'Aktív videók'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {analytics?.totals.activeVideos} / {analytics?.totals.totalVideos}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="overview">{t('admin.analytics.overview') || 'Összesített'}</TabsTrigger>
            <TabsTrigger value="platform">{t('admin.analytics.by_platform') || 'Platformonként'}</TabsTrigger>
            <TabsTrigger value="videos">{t('admin.analytics.by_video') || 'Videónként'}</TabsTrigger>
            <TabsTrigger value="time">{t('admin.analytics.by_time') || 'Időben'}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.daily_trend') || 'Napi trend'}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.daily && analytics.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="impressions" stroke="#8884d8" strokeWidth={2} name="Megjelenítések" />
                      <Line type="monotone" dataKey="completions" stroke="#82ca9d" strokeWidth={2} name="Befejezések" />
                      <Line type="monotone" dataKey="clicks" stroke="#ffc658" strokeWidth={2} name="Kattintások" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_data') || 'Nincs adat'}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Tab */}
          <TabsContent value="platform">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.platform_breakdown') || 'Platform bontás'}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.platformBreakdown && analytics.platformBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.platformBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="platform" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="impressions" fill="#8884d8" name="Megjelenítések" />
                        <Bar dataKey="completions" fill="#82ca9d" name="Befejezések" />
                        <Bar dataKey="clicks" fill="#ffc658" name="Kattintások" />
                      </BarChart>
                    </ResponsiveContainer>
                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.creators.platform') || 'Platform'}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.videos') || 'Videók'}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.impressions') || 'Megjelenítések'}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.completions') || 'Befejezések'}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.clicks') || 'Kattintások'}</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.platformBreakdown.map((p) => (
                          <TableRow key={p.platform}>
                            <TableCell>{getPlatformIcon(p.platform)} {p.platform}</TableCell>
                            <TableCell className="text-right">{p.videos}</TableCell>
                            <TableCell className="text-right">{p.impressions.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{p.completions.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{p.clicks.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_data') || 'Nincs adat'}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.top_videos') || 'Top videók'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('admin.creators.video') || 'Videó'}</TableHead>
                      <TableHead>{t('admin.creators.platform') || 'Platform'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.impressions') || 'Megjelenítések'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.completions') || 'Befejezések'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.clicks') || 'Kattintások'}</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topVideos?.map((video, index) => (
                      <TableRow key={video.id}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{video.title || video.id.slice(0, 8)}</TableCell>
                        <TableCell>{getPlatformIcon(video.platform)} {video.platform}</TableCell>
                        <TableCell className="text-right">{video.total_impressions?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">{video.total_video_completions?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">{video.total_clickthrough?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">
                          {video.total_impressions > 0 
                            ? ((video.total_clickthrough / video.total_impressions) * 100).toFixed(2) 
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!analytics?.topVideos || analytics.topVideos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('admin.analytics.no_data') || 'Nincs adat'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Tab */}
          <TabsContent value="time">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.hourly_distribution') || 'Óránkénti eloszlás'}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.hourlyData && analytics.hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="hour" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickFormatter={(h) => `${h}:00`}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(h) => `${h}:00`}
                      />
                      <Bar dataKey="impressions" fill="#8884d8" name="Megjelenítések" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_hourly_data') || 'Nincs óránkénti adat'}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminCreatorAnalytics;
