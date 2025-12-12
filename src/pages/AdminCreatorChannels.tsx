import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n/useI18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { getPlatformIcon, getPlatformColor, TikTokIcon, YouTubeIcon, InstagramIcon, FacebookIcon } from '@/components/admin/PlatformIcons';
import DualScrollTable from '@/components/admin/DualScrollTable';

const AdminCreatorChannels = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Aggregate channels from creator_videos (since creator_channels table may be empty)
  const { data: channels, isLoading } = useQuery({
    queryKey: ['admin-channels', search, platformFilter, statusFilter],
    queryFn: async () => {
      // Get all videos with creator info
      const { data: videos, error: videosError } = await supabase
        .from('creator_videos')
        .select(`
          id,
          user_id,
          platform,
          is_active,
          total_impressions,
          total_video_completions,
          created_at,
          profiles:user_id (id, username)
        `)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Group by user_id + platform to create virtual channels
      const channelMap = new Map<string, {
        id: string;
        creator_id: string;
        platform: string;
        channel_handle: string | null;
        channel_url: string | null;
        is_active: boolean;
        created_at: string;
        profiles: { id: string; username: string } | null;
        videos_count: number;
        total_impressions: number;
      }>();

      (videos || []).forEach(video => {
        const key = `${video.user_id}-${video.platform}`;
        const existing = channelMap.get(key);
        
        if (existing) {
          existing.videos_count += 1;
          existing.total_impressions += video.total_impressions || 0;
          // Channel is active if any video is active
          if (video.is_active) existing.is_active = true;
          // Use earliest created_at
          if (video.created_at < existing.created_at) existing.created_at = video.created_at;
        } else {
          channelMap.set(key, {
            id: key,
            creator_id: video.user_id,
            platform: video.platform,
            channel_handle: (video.profiles as any)?.username || null,
            channel_url: null,
            is_active: video.is_active,
            created_at: video.created_at,
            profiles: video.profiles as any,
            videos_count: 1,
            total_impressions: video.total_impressions || 0,
          });
        }
      });

      let result = Array.from(channelMap.values());

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(c => 
          c.channel_handle?.toLowerCase().includes(searchLower) ||
          c.profiles?.username?.toLowerCase().includes(searchLower)
        );
      }

      if (platformFilter !== 'all') {
        result = result.filter(c => c.platform === platformFilter);
      }

      if (statusFilter !== 'all') {
        result = result.filter(c => c.is_active === (statusFilter === 'active'));
      }

      // Sort by created_at descending
      result.sort((a, b) => b.created_at.localeCompare(a.created_at));

      return result;
    },
    staleTime: 0,
  });

  const handleExportCSV = () => {
    if (!channels || channels.length === 0) return;

    const headers = ['Channel ID', 'Creator', 'Platform', 'Handle', 'URL', 'Active', 'Videos', 'Impressions', 'Created'];
    const rows = channels.map(c => [
      c.id,
      c.profiles?.username || '',
      c.platform,
      c.channel_handle || '',
      c.channel_url || '',
      c.is_active ? 'Yes' : 'No',
      c.videos_count,
      c.total_impressions,
      format(new Date(c.created_at), 'yyyy-MM-dd'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channels_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const stats = {
    total: channels?.length || 0,
    active: channels?.filter(c => c.is_active).length || 0,
    tiktok: channels?.filter(c => c.platform === 'tiktok').length || 0,
    youtube: channels?.filter(c => c.platform === 'youtube').length || 0,
    instagram: channels?.filter(c => c.platform === 'instagram').length || 0,
    facebook: channels?.filter(c => c.platform === 'facebook').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('common.all')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-400">
                {t('common.active')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TikTokIcon className="w-4 h-4 text-pink-500" /> TikTok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tiktok}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <YouTubeIcon className="w-4 h-4 text-red-500" /> YouTube
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.youtube}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <InstagramIcon className="w-4 h-4 text-purple-500" /> Instagram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.instagram}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FacebookIcon className="w-4 h-4 text-blue-500" /> Facebook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.facebook}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.channels.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue placeholder={t('admin.creators.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('common.active')}</SelectItem>
              <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            {t('admin.creators.export_csv')}
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DualScrollTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.platform')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.channel_handle')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.channels.creator')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('common.active')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('admin.creators.videos')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('admin.creators.impressions')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.created')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels?.map((channel) => (
                      <TableRow key={channel.id} className="hover:bg-muted/50">
                        <TableCell>
                          <span className={`flex items-center gap-2 ${getPlatformColor(channel.platform)}`}>
                            {getPlatformIcon(channel.platform, "w-5 h-5")}
                            <span className="capitalize">{channel.platform}</span>
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{channel.channel_handle || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/admin/creators/${channel.creator_id}`)}
                          >
                            {channel.profiles?.username || channel.creator_id.slice(0, 8)}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {channel.is_active 
                            ? <Badge className="bg-green-500/20 text-green-400">{t('common.active')}</Badge>
                            : <Badge className="bg-red-500/20 text-red-400">{t('common.inactive')}</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-center">{channel.videos_count}</TableCell>
                        <TableCell className="text-center">{channel.total_impressions.toLocaleString()}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(channel.created_at), 'yyyy.MM.dd')}</TableCell>
                        <TableCell>
                          {channel.channel_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(channel.channel_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {channels?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t('admin.channels.no_channels')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DualScrollTable>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCreatorChannels;