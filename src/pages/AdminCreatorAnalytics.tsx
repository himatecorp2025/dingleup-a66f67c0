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
import { getPlatformIcon, getPlatformColor, TikTokIcon, YouTubeIcon, InstagramIcon, FacebookIcon } from '@/components/admin/PlatformIcons';

const AdminCreatorAnalytics = () => {
  const { t } = useI18n();
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Fetch aggregated analytics using real-time impressions (no dependency on creator_analytics_daily)
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-creator-analytics', platformFilter, dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);

      // Get all videos with basic stats
      let videosQuery = supabase
        .from('creator_videos')
        .select('id, user_id, platform, title, is_active, total_impressions, total_video_completions, total_relevant_hits, total_clickthrough, created_at');

      if (platformFilter !== 'all') {
        videosQuery = videosQuery.eq('platform', platformFilter);
      }

      const { data: videos, error: videosError } = await videosQuery;
      if (videosError) throw videosError;

      const videoIds = (videos || []).map((v) => v.id);

      // Get impressions for these videos in the selected date range (real-time source of truth)
      let impressions: Array<{
        creator_video_id: string;
        watched_full_15s: boolean | null;
        is_relevant_viewer: boolean | null;
        created_at: string;
      }> = [];

      if (videoIds.length > 0) {
        const { data: impData, error: impError } = await supabase
          .from('creator_video_impressions')
          .select('creator_video_id, watched_full_15s, is_relevant_viewer, created_at')
          .in('creator_video_id', videoIds)
          .gte('created_at', startDate.toISOString());

        if (impError) throw impError;
        impressions = impData || [];
      }

      // Totals (impressions/completions/relevantHits from real-time impressions, clicks from videos table)
      const totals = {
        impressions: impressions.length,
        completions: impressions.filter((i) => i.watched_full_15s).length,
        relevantHits: impressions.filter((i) => i.is_relevant_viewer).length,
        clicks:
          videos?.reduce((sum, v) => sum + (v.total_clickthrough || 0), 0) || 0,
        totalVideos: videos?.length || 0,
        activeVideos: videos?.filter((v) => v.is_active).length || 0,
      };

      // Daily aggregation for charts
      const dailyMap: Record<string, { impressions: number; completions: number; relevantHits: number; clicks: number }> = {};

      // Initialize all days in range to 0 so charts always have a continuous line
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap[dateStr] = { impressions: 0, completions: 0, relevantHits: 0, clicks: 0 };
      }

      impressions.forEach((imp) => {
        const dateStr = imp.created_at.split('T')[0];
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { impressions: 0, completions: 0, relevantHits: 0, clicks: 0 };
        }
        dailyMap[dateStr].impressions += 1;
        if (imp.watched_full_15s) dailyMap[dateStr].completions += 1;
        if (imp.is_relevant_viewer) dailyMap[dateStr].relevantHits += 1;
      });

      const daily = Object.entries(dailyMap)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Platform breakdown (videos + real-time impressions per platform)
      const platformBreakdownMap: Record<string, { platform: string; impressions: number; completions: number; clicks: number; videos: number }> = {};
      const videoPlatformById: Record<string, string> = {};

      (videos || []).forEach((v) => {
        const platform = v.platform || 'unknown';
        videoPlatformById[v.id] = platform;
        if (!platformBreakdownMap[platform]) {
          platformBreakdownMap[platform] = {
            platform,
            impressions: 0,
            completions: 0,
            clicks: 0,
            videos: 0,
          };
        }
        platformBreakdownMap[platform].videos += 1;
        platformBreakdownMap[platform].clicks += v.total_clickthrough || 0;
      });

      impressions.forEach((imp) => {
        const platform = videoPlatformById[imp.creator_video_id];
        if (!platform) return;
        if (!platformBreakdownMap[platform]) {
          platformBreakdownMap[platform] = {
            platform,
            impressions: 0,
            completions: 0,
            clicks: 0,
            videos: 0,
          };
        }
        platformBreakdownMap[platform].impressions += 1;
        if (imp.watched_full_15s) platformBreakdownMap[platform].completions += 1;
      });

      const platformBreakdown = Object.values(platformBreakdownMap);

      // Top videos: keep existing logic (sorted by total_impressions)
      const topVideos = [...(videos || [])]
        .sort((a, b) => (b.total_impressions || 0) - (a.total_impressions || 0))
        .slice(0, 10);

      // Hourly distribution (for time tab) from real-time impressions
      const hourlyMap: Record<number, number> = {};
      impressions.forEach((imp) => {
        const hour = new Date(imp.created_at).getHours();
        hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
      });

      const hourlyData = Object.entries(hourlyMap)
        .map(([hour, count]) => ({ hour: Number(hour), impressions: count as number }))
        .sort((a, b) => a.hour - b.hour);

      return {
        totals,
        daily,
        platformBreakdown,
        topVideos,
        hourlyData,
      };
    },
    staleTime: 0,
  });

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
              <SelectValue placeholder={t('admin.creators.platform')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="tiktok">
                <span className="flex items-center gap-2"><TikTokIcon className="w-4 h-4" /> TikTok</span>
              </SelectItem>
              <SelectItem value="youtube">
                <span className="flex items-center gap-2"><YouTubeIcon className="w-4 h-4" /> YouTube</span>
              </SelectItem>
              <SelectItem value="instagram">
                <span className="flex items-center gap-2"><InstagramIcon className="w-4 h-4" /> Instagram</span>
              </SelectItem>
              <SelectItem value="facebook">
                <span className="flex items-center gap-2"><FacebookIcon className="w-4 h-4" /> Facebook</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('admin.analytics.last_7_days')}</SelectItem>
              <SelectItem value="14">{t('admin.analytics.last_14_days')}</SelectItem>
              <SelectItem value="30">{t('admin.analytics.last_30_days')}</SelectItem>
              <SelectItem value="90">{t('admin.analytics.last_90_days')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            {t('admin.creators.export_csv')}
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
                  {t('admin.creators.impressions')}
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
                  {t('admin.creators.completions')}
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
                  {t('admin.creators.relevant_hits')}
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
                  {t('admin.creators.clicks')}
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
                  {t('admin.videos.active')}
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
            <TabsTrigger value="overview">{t('admin.analytics.overview')}</TabsTrigger>
            <TabsTrigger value="platform">{t('admin.analytics.by_platform')}</TabsTrigger>
            <TabsTrigger value="videos">{t('admin.analytics.by_video')}</TabsTrigger>
            <TabsTrigger value="time">{t('admin.analytics.by_time')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.daily_trend')}</CardTitle>
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
                      <Line type="monotone" dataKey="impressions" stroke="#8884d8" strokeWidth={2} name={t('admin.creators.impressions')} />
                      <Line type="monotone" dataKey="completions" stroke="#82ca9d" strokeWidth={2} name={t('admin.creators.completions')} />
                      <Line type="monotone" dataKey="clicks" stroke="#ffc658" strokeWidth={2} name={t('admin.creators.clicks')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_data')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Tab */}
          <TabsContent value="platform">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.platform_breakdown')}</CardTitle>
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
                        <Bar dataKey="impressions" fill="#8884d8" name={t('admin.creators.impressions')} />
                        <Bar dataKey="completions" fill="#82ca9d" name={t('admin.creators.completions')} />
                        <Bar dataKey="clicks" fill="#ffc658" name={t('admin.creators.clicks')} />
                      </BarChart>
                    </ResponsiveContainer>
                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.creators.platform')}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.videos')}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.impressions')}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.completions')}</TableHead>
                          <TableHead className="text-right">{t('admin.creators.clicks')}</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.platformBreakdown.map((p) => (
                          <TableRow key={p.platform}>
                            <TableCell>
                              <span className={`flex items-center gap-2 ${getPlatformColor(p.platform)}`}>
                                {getPlatformIcon(p.platform, "w-5 h-5")}
                                {p.platform}
                              </span>
                            </TableCell>
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
                  <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_data')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.analytics.top_videos')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('admin.creators.video')}</TableHead>
                      <TableHead>{t('admin.creators.platform')}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.impressions')}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.completions')}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.clicks')}</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topVideos?.map((video, idx) => (
                      <TableRow key={video.id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{video.title || video.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-2 ${getPlatformColor(video.platform)}`}>
                            {getPlatformIcon(video.platform, "w-5 h-5")}
                            {video.platform}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{(video.total_impressions || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(video.total_video_completions || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(video.total_clickthrough || 0).toLocaleString()}</TableCell>
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
                          {t('admin.analytics.no_data')}
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
                <CardTitle>{t('admin.analytics.hourly_distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.hourlyData && analytics.hourlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(h) => `${h}:00`} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(h) => `${h}:00`}
                      />
                      <Bar dataKey="impressions" fill="#8884d8" name={t('admin.creators.impressions')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_data')}</p>
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