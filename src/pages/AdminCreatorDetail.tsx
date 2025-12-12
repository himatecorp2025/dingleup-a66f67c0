import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, User, Video, BarChart3, FileText, Save, ExternalLink, Eye, MousePointer } from 'lucide-react';
import { format } from 'date-fns';

const AdminCreatorDetail = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adminNote, setAdminNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  // Fetch creator profile
  const { data: creator, isLoading: loadingCreator } = useQuery({
    queryKey: ['admin-creator', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creatorId)
        .single();
      if (error) throw error;
      setNewStatus(data.creator_status || 'active');
      return data;
    },
    enabled: !!creatorId,
  });

  // Fetch channels
  const { data: channels, isLoading: loadingChannels } = useQuery({
    queryKey: ['admin-creator-channels', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_channels')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
  });

  // Fetch videos
  const { data: videos, isLoading: loadingVideos } = useQuery({
    queryKey: ['admin-creator-videos', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_videos')
        .select('*')
        .eq('user_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['admin-creator-audit', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_audit_log')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
  });

  // Fetch admin notes
  const { data: notes } = useQuery({
    queryKey: ['admin-creator-notes', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_admin_notes')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creator_status: status })
        .eq('id', creatorId);
      if (updateError) throw updateError;

      // Log audit
      await supabase.from('creator_audit_log').insert({
        creator_id: creatorId,
        admin_id: user?.id,
        action: 'status_change',
        old_value: { status: creator?.creator_status },
        new_value: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['admin-creator-audit', creatorId] });
      toast.success(t('admin.creators.status_updated') || 'Státusz frissítve');
    },
    onError: () => {
      toast.error(t('common.error') || 'Hiba történt');
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('creator_admin_notes').insert({
        creator_id: creatorId,
        admin_id: user?.id,
        note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator-notes', creatorId] });
      setAdminNote('');
      toast.success(t('admin.creators.note_added') || 'Megjegyzés hozzáadva');
    },
  });

  // Toggle video status mutation
  const toggleVideoMutation = useMutation({
    mutationFn: async ({ videoId, isActive }: { videoId: string; isActive: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('creator_videos')
        .update({ is_active: isActive, status: isActive ? 'active' : 'inactive' })
        .eq('id', videoId);
      if (error) throw error;

      await supabase.from('creator_audit_log').insert({
        creator_id: creatorId,
        admin_id: user?.id,
        action: isActive ? 'video_activated' : 'video_deactivated',
        new_value: { video_id: videoId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creator-videos', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['admin-creator-audit', creatorId] });
      toast.success(t('admin.creators.video_updated') || 'Videó frissítve');
    },
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-yellow-500/20 text-yellow-400',
      suspended: 'bg-red-500/20 text-red-400',
      pending: 'bg-blue-500/20 text-blue-400',
      rejected: 'bg-red-500/20 text-red-400',
    };
    return <Badge className={colors[status] || 'bg-gray-500/20 text-gray-400'}>{status}</Badge>;
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      tiktok: '🎵',
      youtube: '▶️',
      instagram: '📷',
      facebook: '📘',
    };
    return icons[platform] || '🎬';
  };

  // Calculate analytics
  const analytics = {
    totalImpressions: videos?.reduce((sum, v) => sum + (v.total_impressions || 0), 0) || 0,
    totalCompletions: videos?.reduce((sum, v) => sum + (v.total_video_completions || 0), 0) || 0,
    totalRelevant: videos?.reduce((sum, v) => sum + (v.total_relevant_hits || 0), 0) || 0,
    totalClicks: videos?.reduce((sum, v) => sum + (v.total_clickthrough || 0), 0) || 0,
  };

  if (loadingCreator) {
    return (
      <AdminLayout title={t('admin.creators.detail') || 'Tartalomgyártó részletek'}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={creator?.username || t('admin.creators.detail') || 'Tartalomgyártó részletek'}>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/admin/creators')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back') || 'Vissza'}
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white">
              {creator?.username?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{creator?.username}</h2>
              <p className="text-muted-foreground font-mono text-sm">{creator?.id}</p>
            </div>
          </div>
          {getStatusBadge(creator?.creator_status || 'active')}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {t('admin.creators.tab_profile') || 'Profil'}
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t('admin.creators.tab_channels') || 'Csatornák'}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="h-4 w-4" />
              {t('admin.creators.tab_videos') || 'Videók'}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('admin.creators.tab_analytics') || 'Analitika'}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('admin.creators.tab_audit') || 'Napló'}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.creators.basic_info') || 'Alapadatok'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">{t('admin.creators.username') || 'Felhasználónév'}</label>
                    <p className="font-medium">{creator?.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t('admin.creators.created') || 'Regisztráció'}</label>
                    <p className="font-medium">{creator?.created_at ? format(new Date(creator.created_at), 'yyyy.MM.dd HH:mm') : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t('admin.creators.country') || 'Ország'}</label>
                    <p className="font-medium">{creator?.country_code || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t('admin.creators.subscription') || 'Előfizetés'}</label>
                    <p className="font-medium">{creator?.creator_subscription_status || '-'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <label className="text-sm text-muted-foreground">{t('admin.creators.status') || 'Státusz'}</label>
                  <div className="flex items-center gap-4 mt-2">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('common.active') || 'Aktív'}</SelectItem>
                        <SelectItem value="inactive">{t('common.inactive') || 'Inaktív'}</SelectItem>
                        <SelectItem value="suspended">{t('admin.creators.suspended') || 'Felfüggesztett'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => updateStatusMutation.mutate(newStatus)}
                      disabled={newStatus === creator?.creator_status || updateStatusMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save') || 'Mentés'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.creators.admin_notes') || 'Admin megjegyzések'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t('admin.creators.add_note') || 'Új megjegyzés...'}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => addNoteMutation.mutate(adminNote)}
                    disabled={!adminNote.trim() || addNoteMutation.isPending}
                  >
                    {t('common.add') || 'Hozzáadás'}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {notes?.map((note) => (
                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(note.created_at), 'yyyy.MM.dd HH:mm')}
                      </p>
                    </div>
                  ))}
                  {(!notes || notes.length === 0) && (
                    <p className="text-muted-foreground text-sm">{t('admin.creators.no_notes') || 'Nincs megjegyzés'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-0">
                {loadingChannels ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.creators.platform') || 'Platform'}</TableHead>
                        <TableHead>{t('admin.creators.channel_handle') || 'Handle'}</TableHead>
                        <TableHead>{t('admin.creators.channel_url') || 'URL'}</TableHead>
                        <TableHead>{t('admin.creators.verified') || 'Ellenőrzött'}</TableHead>
                        <TableHead>{t('common.active') || 'Aktív'}</TableHead>
                        <TableHead>{t('admin.creators.created') || 'Létrehozva'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels?.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell>
                            <span className="mr-2">{getPlatformIcon(channel.platform)}</span>
                            {channel.platform}
                          </TableCell>
                          <TableCell className="font-mono">{channel.channel_handle || '-'}</TableCell>
                          <TableCell>
                            {channel.channel_url ? (
                              <a href={channel.channel_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                {channel.channel_url.slice(0, 40)}...
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{channel.is_verified ? '✓' : '-'}</TableCell>
                          <TableCell>{channel.is_active ? <Badge className="bg-green-500/20 text-green-400">Aktív</Badge> : <Badge className="bg-red-500/20 text-red-400">Inaktív</Badge>}</TableCell>
                          <TableCell>{format(new Date(channel.created_at), 'yyyy.MM.dd')}</TableCell>
                        </TableRow>
                      ))}
                      {(!channels || channels.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t('admin.creators.no_channels') || 'Nincs csatorna'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-0">
                {loadingVideos ? (
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video ID</TableHead>
                        <TableHead>{t('admin.creators.platform') || 'Platform'}</TableHead>
                        <TableHead>{t('admin.creators.title') || 'Cím'}</TableHead>
                        <TableHead>{t('admin.creators.status') || 'Státusz'}</TableHead>
                        <TableHead className="text-center">{t('admin.creators.impressions') || 'Megjelenítések'}</TableHead>
                        <TableHead>{t('admin.creators.created') || 'Létrehozva'}</TableHead>
                        <TableHead>{t('common.actions') || 'Műveletek'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos?.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-mono text-xs">{video.id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <span className="mr-2">{getPlatformIcon(video.platform)}</span>
                            {video.platform}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{video.title || video.video_url}</TableCell>
                          <TableCell>{getStatusBadge(video.status)}</TableCell>
                          <TableCell className="text-center">{video.total_impressions?.toLocaleString() || 0}</TableCell>
                          <TableCell>{format(new Date(video.created_at), 'yyyy.MM.dd')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleVideoMutation.mutate({ videoId: video.id, isActive: !video.is_active })}
                              >
                                {video.is_active ? t('admin.creators.deactivate') || 'Deaktiválás' : t('admin.creators.activate') || 'Aktiválás'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/creator-videos/${video.id}`)}
                              >
                                {t('common.details') || 'Részletek'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!videos || videos.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {t('admin.creators.no_videos') || 'Nincs videó'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t('admin.creators.impressions') || 'Megjelenítések'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalImpressions.toLocaleString()}</div>
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
                  <div className="text-2xl font-bold">{analytics.totalCompletions.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('admin.creators.relevant_hits') || 'Releváns nézők'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalRelevant.toLocaleString()}</div>
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
                  <div className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    CTR: {analytics.totalImpressions > 0 ? ((analytics.totalClicks / analytics.totalImpressions) * 100).toFixed(2) : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Per-video breakdown */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.creators.video_breakdown') || 'Videónkénti bontás'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.creators.video') || 'Videó'}</TableHead>
                      <TableHead>{t('admin.creators.platform') || 'Platform'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.impressions') || 'Megjelenítések'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.completions') || 'Befejezések'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.relevant_hits') || 'Releváns'}</TableHead>
                      <TableHead className="text-right">{t('admin.creators.clicks') || 'Kattintások'}</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos?.map((video) => (
                      <TableRow key={video.id}>
                        <TableCell className="max-w-[200px] truncate">{video.title || video.id.slice(0, 8)}</TableCell>
                        <TableCell>{getPlatformIcon(video.platform)} {video.platform}</TableCell>
                        <TableCell className="text-right">{video.total_impressions?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">{video.total_video_completions?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">{video.total_relevant_hits?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">{video.total_clickthrough?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">
                          {video.total_impressions > 0 
                            ? ((video.total_clickthrough / video.total_impressions) * 100).toFixed(2) 
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t('admin.creators.audit_log') || 'Admin napló'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {auditLog?.map((entry) => (
                    <div key={entry.id} className="p-3 bg-muted/30 rounded-lg flex items-start justify-between">
                      <div>
                        <p className="font-medium">{entry.action}</p>
                        {entry.old_value && (
                          <p className="text-xs text-muted-foreground">
                            Előző: {JSON.stringify(entry.old_value)}
                          </p>
                        )}
                        {entry.new_value && (
                          <p className="text-xs text-muted-foreground">
                            Új: {JSON.stringify(entry.new_value)}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'yyyy.MM.dd HH:mm')}
                      </p>
                    </div>
                  ))}
                  {(!auditLog || auditLog.length === 0) && (
                    <p className="text-muted-foreground text-center py-8">{t('admin.creators.no_audit') || 'Nincs bejegyzés'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminCreatorDetail;
