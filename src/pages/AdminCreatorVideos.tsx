import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { Search, Download, Video, Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getPlatformIcon, getPlatformColor, TikTokIcon, YouTubeIcon, InstagramIcon, FacebookIcon } from '@/components/admin/PlatformIcons';

const AdminCreatorVideos = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: videos, isLoading } = useQuery({
    queryKey: ['admin-videos', search, platformFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('creator_videos')
        .select(`
          *,
          profiles:user_id (id, username)
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,video_url.ilike.%${search}%,id.eq.${search}`);
      }

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });

  const toggleVideoMutation = useMutation({
    mutationFn: async ({ videoId, isActive }: { videoId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('creator_videos')
        .update({ is_active: isActive, status: isActive ? 'active' : 'inactive' })
        .eq('id', videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      toast.success(t('admin.creators.video_updated'));
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-yellow-500/20 text-yellow-400',
      pending: 'bg-blue-500/20 text-blue-400',
      rejected: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
      active: t('common.active'),
      inactive: t('common.inactive'),
      pending: t('admin.videos.pending'),
      rejected: t('admin.videos.rejected'),
    };
    return <Badge className={colors[status] || 'bg-gray-500/20 text-gray-400'}>{labels[status] || status}</Badge>;
  };

  const handleExportCSV = () => {
    if (!videos || videos.length === 0) return;

    const headers = ['Video ID', 'Creator', 'Platform', 'Title', 'Status', 'Impressions', 'Completions', 'Clicks', 'Created'];
    const rows = videos.map(v => [
      v.id,
      v.profiles?.username || '',
      v.platform,
      v.title || '',
      v.status,
      v.total_impressions || 0,
      v.total_video_completions || 0,
      v.total_clickthrough || 0,
      format(new Date(v.created_at), 'yyyy-MM-dd'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `videos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const stats = {
    total: videos?.length || 0,
    active: videos?.filter(v => v.status === 'active').length || 0,
    totalImpressions: videos?.reduce((sum, v) => sum + (v.total_impressions || 0), 0) || 0,
    totalCompletions: videos?.reduce((sum, v) => sum + (v.total_video_completions || 0), 0) || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Video className="h-4 w-4" />
                {t('admin.videos.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
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
                <Eye className="h-4 w-4" />
                {t('admin.creators.impressions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalImpressions.toLocaleString()}</div>
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
              <div className="text-2xl font-bold">{stats.totalCompletions.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.videos.search')}
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
              <SelectItem value="pending">{t('admin.videos.pending')}</SelectItem>
              <SelectItem value="rejected">{t('admin.videos.rejected')}</SelectItem>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video ID</TableHead>
                    <TableHead>{t('admin.channels.creator')}</TableHead>
                    <TableHead>{t('admin.creators.platform')}</TableHead>
                    <TableHead>{t('admin.creators.title')}</TableHead>
                    <TableHead>{t('admin.creators.status')}</TableHead>
                    <TableHead className="text-center">{t('admin.creators.impressions')}</TableHead>
                    <TableHead className="text-center">{t('admin.creators.completions')}</TableHead>
                    <TableHead className="text-center">{t('admin.creators.clicks')}</TableHead>
                    <TableHead>{t('admin.creators.created')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos?.map((video) => (
                    <TableRow key={video.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{video.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => navigate(`/admin/creators/${video.user_id}`)}
                        >
                          {video.profiles?.username || video.user_id.slice(0, 8)}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-2 ${getPlatformColor(video.platform)}`}>
                          {getPlatformIcon(video.platform, "w-5 h-5")}
                          {video.platform}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{video.title || video.video_url}</TableCell>
                      <TableCell>{getStatusBadge(video.status)}</TableCell>
                      <TableCell className="text-center">{video.total_impressions?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-center">{video.total_video_completions?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-center">{video.total_clickthrough?.toLocaleString() || 0}</TableCell>
                      <TableCell>{format(new Date(video.created_at), 'yyyy.MM.dd')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVideoMutation.mutate({ videoId: video.id, isActive: !video.is_active })}
                            title={video.is_active ? t('admin.creators.deactivate') : t('admin.creators.activate')}
                          >
                            {video.is_active ? <XCircle className="h-4 w-4 text-red-400" /> : <CheckCircle className="h-4 w-4 text-green-400" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/creator-videos/${video.id}`)}
                          >
                            {t('common.details')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {videos?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {t('admin.videos.no_videos')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCreatorVideos;