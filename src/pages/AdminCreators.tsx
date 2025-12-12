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
import { Search, Users, Video, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { getPlatformIcon, getPlatformColor, TikTokIcon, YouTubeIcon, InstagramIcon, FacebookIcon } from '@/components/admin/PlatformIcons';
import DualScrollTable from '@/components/admin/DualScrollTable';

interface CreatorData {
  id: string;
  username: string;
  creator_status: string;
  is_creator: boolean;
  created_at: string;
  channels_count: number;
  videos_count: number;
  active_videos_count: number;
  last_video_at: string | null;
  total_impressions: number;
}

const AdminCreators = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const { data: creators, isLoading } = useQuery({
    queryKey: ['admin-creators', search, statusFilter, platformFilter],
    queryFn: async () => {
      // First get all creators (users with is_creator = true)
      let query = supabase
        .from('profiles')
        .select('id, username, creator_status, is_creator, created_at')
        .eq('is_creator', true);

      if (search) {
        query = query.or(`username.ilike.%${search}%,id.eq.${search}`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('creator_status', statusFilter);
      }

      const { data: profiles, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      // Get video stats for each creator
      const creatorIds = profiles.map(p => p.id);
      
      const { data: videos } = await supabase
        .from('creator_videos')
        .select('id, user_id, is_active, created_at, total_impressions, platform')
        .in('user_id', creatorIds);

      const { data: channels } = await supabase
        .from('creator_channels')
        .select('id, creator_id, platform')
        .in('creator_id', creatorIds);

      // Aggregate stats
      const creatorsWithStats: CreatorData[] = profiles.map(profile => {
        const creatorVideos = videos?.filter(v => v.user_id === profile.id) || [];
        const creatorChannels = channels?.filter(c => c.creator_id === profile.id) || [];
        
        // Apply platform filter
        let filteredVideos = creatorVideos;
        if (platformFilter !== 'all') {
          filteredVideos = creatorVideos.filter(v => v.platform === platformFilter);
        }

        const activeVideos = filteredVideos.filter(v => v.is_active);
        const lastVideo = filteredVideos.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const totalImpressions = filteredVideos.reduce((sum, v) => sum + (v.total_impressions || 0), 0);

        return {
          id: profile.id,
          username: profile.username || 'N/A',
          creator_status: profile.creator_status || 'active',
          is_creator: profile.is_creator,
          created_at: profile.created_at,
          channels_count: creatorChannels.length,
          videos_count: filteredVideos.length,
          active_videos_count: activeVideos.length,
          last_video_at: lastVideo?.created_at || null,
          total_impressions: totalImpressions,
        };
      });

      // Filter out creators with no videos if platform filter is active
      if (platformFilter !== 'all') {
        return creatorsWithStats.filter(c => c.videos_count > 0);
      }

      return creatorsWithStats;
    },
    staleTime: 0,
  });

  const handleExportCSV = () => {
    if (!creators || creators.length === 0) return;

    const headers = ['Creator ID', 'Username', 'Status', 'Channels', 'Videos', 'Active Videos', 'Impressions', 'Last Video', 'Created'];
    const rows = creators.map(c => [
      c.id,
      c.username,
      c.creator_status,
      c.channels_count,
      c.videos_count,
      c.active_videos_count,
      c.total_impressions,
      c.last_video_at ? format(new Date(c.last_video_at), 'yyyy-MM-dd') : '',
      format(new Date(c.created_at), 'yyyy-MM-dd'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-yellow-500/20 text-yellow-400',
      suspended: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
      active: t('common.active'),
      inactive: t('common.inactive'),
      suspended: t('admin.creators.suspended'),
    };
    return <Badge className={colors[status] || 'bg-gray-500/20 text-gray-400'}>{labels[status] || status}</Badge>;
  };

  const stats = {
    total: creators?.length || 0,
    active: creators?.filter(c => c.creator_status === 'active').length || 0,
    totalVideos: creators?.reduce((sum, c) => sum + c.videos_count, 0) || 0,
    totalImpressions: creators?.reduce((sum, c) => sum + c.total_impressions, 0) || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('admin.creators.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-green-400" />
                {t('admin.creators.active')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Video className="h-4 w-4" />
                {t('admin.creators.total_videos')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t('admin.creators.total_impressions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalImpressions.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.creators.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue placeholder={t('admin.creators.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('common.active')}</SelectItem>
              <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              <SelectItem value="suspended">{t('admin.creators.suspended')}</SelectItem>
            </SelectContent>
          </Select>
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
                      <TableHead className="whitespace-nowrap">Creator ID</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.username')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.status')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('admin.creators.channels')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('admin.creators.videos')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('admin.creators.active_videos')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('admin.creators.impressions')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.last_video')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('admin.creators.created')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators?.map((creator) => (
                      <TableRow key={creator.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{creator.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-medium">{creator.username}</TableCell>
                        <TableCell>{getStatusBadge(creator.creator_status)}</TableCell>
                        <TableCell className="text-center">{creator.channels_count}</TableCell>
                        <TableCell className="text-center">{creator.videos_count}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-400">{creator.active_videos_count}</span>
                        </TableCell>
                        <TableCell className="text-center">{creator.total_impressions.toLocaleString()}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creator.last_video_at 
                            ? format(new Date(creator.last_video_at), 'yyyy.MM.dd')
                            : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(creator.created_at), 'yyyy.MM.dd')}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/creators/${creator.id}`)}
                          >
                            {t('common.open')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {creators?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          {t('admin.creators.no_creators')}
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

export default AdminCreators;