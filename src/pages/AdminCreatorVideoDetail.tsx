import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Video, MousePointer, Play, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPlatformIcon, getPlatformColor } from '@/components/admin/PlatformIcons';

const AdminCreatorVideoDetail = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moderationNote, setModerationNote] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Fetch video details
  const { data: video, isLoading } = useQuery({
    queryKey: ['admin-video-detail', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_videos')
        .select(`
          *,
          profiles:user_id (id, username)
        `)
        .eq('id', videoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  // Fetch daily analytics for this video
  const { data: dailyAnalytics } = useQuery({
    queryKey: ['admin-video-daily', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_analytics_daily')
        .select('*')
        .eq('video_id', videoId)
        .order('date', { ascending: true })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  // Fetch video topics
  const { data: topics } = useQuery({
    queryKey: ['admin-video-topics', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_video_topics')
        .select(`
          *,
          topics:topic_id (id, name)
        `)
        .eq('creator_video_id', videoId);
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  // Toggle video status
  const toggleVideoMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from('creator_videos')
        .update({ 
          is_active: isActive, 
          status: isActive ? 'active' : 'inactive' 
        })
        .eq('id', videoId);
      if (error) throw error;

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('creator_audit_log').insert({
        creator_id: video?.user_id,
        admin_id: user?.id,
        action: isActive ? 'video_activated' : 'video_deactivated',
        new_value: { video_id: videoId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-video-detail', videoId] });
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!video) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">{t('admin.videos.not_found')}</p>
      </AdminLayout>
    );
  }

  const ctr = video.total_impressions > 0 
    ? ((video.total_clickthrough / video.total_impressions) * 100).toFixed(2) 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={getPlatformColor(video.platform)}>
                {getPlatformIcon(video.platform, "w-8 h-8")}
              </span>
              <h2 className="text-2xl font-bold">{video.title || t('admin.videos.untitled')}</h2>
              {getStatusBadge(video.status)}
            </div>
            <p className="text-muted-foreground font-mono text-sm">{video.id}</p>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate(`/admin/creators/${video.user_id}`)}
            >
              {t('admin.channels.creator')}: {video.profiles?.username || video.user_id.slice(0, 8)}
            </Button>
          </div>
          <div className="flex gap-2">
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Play className="h-4 w-4" />
                  {t('admin.videos.preview')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{t('admin.videos.preview')}</DialogTitle>
                </DialogHeader>
                <div className="aspect-video w-full">
                  {video.embed_url ? (
                    <iframe
                      src={video.embed_url}
                      className="w-full h-full rounded-lg"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
                      <p className="text-muted-foreground">{t('admin.videos.no_embed')}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant={video.is_active ? 'destructive' : 'default'}
              onClick={() => toggleVideoMutation.mutate(!video.is_active)}
              disabled={toggleVideoMutation.isPending}
              className="gap-2"
            >
              {video.is_active ? (
                <>
                  <XCircle className="h-4 w-4" />
                  {t('admin.creators.deactivate')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {t('admin.creators.activate')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t('admin.creators.impressions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{video.total_impressions?.toLocaleString() || 0}</div>
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
              <div className="text-2xl font-bold">{video.total_video_completions?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('admin.creators.relevant_hits')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{video.total_relevant_hits?.toLocaleString() || 0}</div>
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
              <div className="text-2xl font-bold">{video.total_clickthrough?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ctr}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Info */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>{t('admin.videos.info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">{t('admin.creators.platform')}</label>
                  <p className={`font-medium flex items-center gap-2 ${getPlatformColor(video.platform)}`}>
                    {getPlatformIcon(video.platform, "w-5 h-5")}
                    {video.platform}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{t('admin.creators.status')}</label>
                  <p className="font-medium">{video.status}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{t('admin.creators.created')}</label>
                  <p className="font-medium">{format(new Date(video.created_at), 'yyyy.MM.dd HH:mm')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{t('admin.videos.activated')}</label>
                  <p className="font-medium">
                    {video.first_activated_at 
                      ? format(new Date(video.first_activated_at), 'yyyy.MM.dd HH:mm')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{t('admin.videos.expires')}</label>
                  <p className="font-medium">
                    {video.expires_at 
                      ? format(new Date(video.expires_at), 'yyyy.MM.dd HH:mm')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">{t('admin.videos.duration')}</label>
                  <p className="font-medium">{video.duration_seconds ? `${video.duration_seconds}s` : '-'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <label className="text-sm text-muted-foreground">Original URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-sm truncate flex-1">{video.video_url}</p>
                  <Button variant="ghost" size="icon" onClick={() => window.open(video.video_url, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Embed URL</label>
                <p className="font-mono text-sm truncate">{video.embed_url || '-'}</p>
              </div>

              {/* Topics */}
              {topics && topics.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <label className="text-sm text-muted-foreground">{t('admin.videos.topics')}</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {topics.map((topic) => (
                      <Badge key={topic.id} variant="outline">{topic.topics?.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Moderation */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>{t('admin.videos.moderation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">{t('admin.videos.moderation_note')}</label>
                <Textarea
                  placeholder={t('admin.videos.add_moderation_note')}
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button disabled={!moderationNote.trim()}>
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Daily Analytics Chart */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>{t('admin.analytics.daily_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyAnalytics && dailyAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyAnalytics}>
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
                  <Line type="monotone" dataKey="video_completions" stroke="#82ca9d" strokeWidth={2} name={t('admin.creators.completions')} />
                  <Line type="monotone" dataKey="clickthroughs" stroke="#ffc658" strokeWidth={2} name={t('admin.creators.clicks')} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('admin.analytics.no_data')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCreatorVideoDetail;