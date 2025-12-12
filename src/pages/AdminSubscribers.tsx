import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Calendar, Globe, Zap } from 'lucide-react';
import { format } from 'date-fns';

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  source: string;
  created_at: string;
};

type CreatorSubscription = {
  id: string;
  user_id: string;
  package_type: string;
  status: string;
  max_videos: number;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  created_at: string;
  profiles?: {
    username: string | null;
    email: string | null;
  };
};

export default function AdminSubscribers() {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState('all');

  // Fetch newsletter subscribers
  const { data: subscribers = [], isLoading: loadingSubscribers } = useQuery({
    queryKey: ['admin-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Subscriber[];
    },
  });

  // Fetch creator subscriptions
  const { data: creatorSubscriptions = [], isLoading: loadingCreators } = useQuery({
    queryKey: ['admin-creator-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_subscriptions')
        .select(`
          *,
          profiles:user_id (username, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CreatorSubscription[];
    },
  });

  const landingSubscribers = subscribers.filter(s => s.source === 'landing' || !s.source);
  const creatorsLandingSubscribers = subscribers.filter(s => s.source === 'creators_landing');

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      trialing: 'bg-blue-500/20 text-blue-400',
      inactive: 'bg-gray-500/20 text-gray-400',
      canceled: 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy.MM.dd HH:mm');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">
            {lang === 'hu' ? 'Feliratkozások' : 'Subscriptions'}
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {lang === 'hu' ? 'Összes feliratkozó' : 'Total Subscribers'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{subscribers.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {lang === 'hu' ? 'Landing Page' : 'Landing Page'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-400">{landingSubscribers.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {lang === 'hu' ? 'Creators Landing' : 'Creators Landing'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-400">{creatorsLandingSubscribers.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {lang === 'hu' ? 'Aktív Creators' : 'Active Creators'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">
                {creatorSubscriptions.filter(c => c.status === 'active' || c.status === 'trialing').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              {lang === 'hu' ? 'Összes' : 'All'} ({subscribers.length})
            </TabsTrigger>
            <TabsTrigger value="landing" className="data-[state=active]:bg-purple-600">
              Landing Page ({landingSubscribers.length})
            </TabsTrigger>
            <TabsTrigger value="creators_landing" className="data-[state=active]:bg-purple-600">
              Creators Landing ({creatorsLandingSubscribers.length})
            </TabsTrigger>
            <TabsTrigger value="creators" className="data-[state=active]:bg-purple-600">
              Creators ({creatorSubscriptions.length})
            </TabsTrigger>
          </TabsList>

          {/* Newsletter Subscribers Tables */}
          <TabsContent value="all">
            <SubscribersTable 
              subscribers={subscribers} 
              loading={loadingSubscribers} 
              lang={lang} 
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="landing">
            <SubscribersTable 
              subscribers={landingSubscribers} 
              loading={loadingSubscribers} 
              lang={lang}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="creators_landing">
            <SubscribersTable 
              subscribers={creatorsLandingSubscribers} 
              loading={loadingSubscribers} 
              lang={lang}
              formatDate={formatDate}
            />
          </TabsContent>

          {/* Creator Subscriptions Table */}
          <TabsContent value="creators">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {loadingCreators ? (
                  <div className="p-8 text-center text-white/60">
                    {lang === 'hu' ? 'Betöltés...' : 'Loading...'}
                  </div>
                ) : creatorSubscriptions.length === 0 ? (
                  <div className="p-8 text-center text-white/60">
                    {lang === 'hu' ? 'Nincs creator előfizetés' : 'No creator subscriptions'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-white/60">{lang === 'hu' ? 'Felhasználó' : 'User'}</TableHead>
                        <TableHead className="text-white/60">Email</TableHead>
                        <TableHead className="text-white/60">{lang === 'hu' ? 'Csomag' : 'Package'}</TableHead>
                        <TableHead className="text-white/60">{lang === 'hu' ? 'Státusz' : 'Status'}</TableHead>
                        <TableHead className="text-white/60">{lang === 'hu' ? 'Max videók' : 'Max Videos'}</TableHead>
                        <TableHead className="text-white/60">{lang === 'hu' ? 'Próbaidő vége' : 'Trial Ends'}</TableHead>
                        <TableHead className="text-white/60">{lang === 'hu' ? 'Feliratkozás' : 'Subscribed'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creatorSubscriptions.map((sub) => (
                        <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white font-medium">
                            {sub.profiles?.username || '-'}
                          </TableCell>
                          <TableCell className="text-white/80">
                            {sub.profiles?.email || '-'}
                          </TableCell>
                          <TableCell className="text-white/80 capitalize">
                            {sub.package_type}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(sub.status)}>
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/80">
                            {sub.max_videos}
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {formatDate(sub.trial_ends_at)}
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {formatDate(sub.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Reusable table component for newsletter subscribers
function SubscribersTable({ 
  subscribers, 
  loading, 
  lang,
  formatDate
}: { 
  subscribers: Subscriber[]; 
  loading: boolean; 
  lang: string;
  formatDate: (date: string | null) => string;
}) {
  const getSourceBadge = (source: string) => {
    if (source === 'creators_landing') {
      return <Badge className="bg-purple-500/20 text-purple-400">Creators Landing</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-400">Landing Page</Badge>;
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-white/60">
            {lang === 'hu' ? 'Betöltés...' : 'Loading...'}
          </div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            {lang === 'hu' ? 'Nincs feliratkozó' : 'No subscribers'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/60">Email</TableHead>
                <TableHead className="text-white/60">{lang === 'hu' ? 'Név' : 'Name'}</TableHead>
                <TableHead className="text-white/60">{lang === 'hu' ? 'Forrás' : 'Source'}</TableHead>
                <TableHead className="text-white/60">{lang === 'hu' ? 'Feliratkozás' : 'Subscribed'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub) => (
                <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{sub.email}</TableCell>
                  <TableCell className="text-white/80">{sub.name || '-'}</TableCell>
                  <TableCell>{getSourceBadge(sub.source || 'landing')}</TableCell>
                  <TableCell className="text-white/60 text-sm">
                    {formatDate(sub.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
