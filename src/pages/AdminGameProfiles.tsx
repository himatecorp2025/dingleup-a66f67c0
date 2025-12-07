import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAdminGameProfilesQuery } from '@/hooks/queries/useAdminGameProfilesQuery';
import { Brain, Search, Info, RefreshCw } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';

export default function AdminGameProfiles() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { profiles, loading, isRefreshing, error, refetch } = useAdminGameProfilesQuery();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'answered' | 'correctness'>('answered');

  const filteredAndSorted = useMemo(() => {
    let result = [...profiles];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.userId.toLowerCase().includes(searchLower) ||
          p.username.toLowerCase().includes(searchLower)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'answered') return b.totalAnswered - a.totalAnswered;
      if (sortBy === 'correctness') return b.overallCorrectRatio - a.overallCorrectRatio;
      return 0;
    });

    return result;
  }, [profiles, search, sortBy]);

  // Only show full loading on initial load when no data exists
  if (loading && profiles.length === 0) {
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

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto max-w-7xl">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3 mb-2">
              <Brain className="h-8 w-8 text-purple-400" />
              {t('admin.game_profiles.title')}
            </h1>
            <p className="text-white/60">
              {t('admin.game_profiles.subtitle')}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('admin.refresh')}
          </Button>
        </div>

        <Alert className="mb-6 backdrop-blur-xl bg-blue-500/10 border-blue-500/30">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-white/80">
            {t('admin.game_profiles.disclaimer')}
          </AlertDescription>
        </Alert>

        <Card className="mb-6 backdrop-blur-xl bg-white/5 border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">{t('admin.game_profiles.filter_sort')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.game_profiles.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'answered' ? 'default' : 'outline'}
                  onClick={() => setSortBy('answered')}
                >
                  {t('admin.game_profiles.sort_answers')}
                </Button>
                <Button
                  variant={sortBy === 'correctness' ? 'default' : 'outline'}
                  onClick={() => setSortBy('correctness')}
                >
                  {t('admin.game_profiles.sort_correctness')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.game_profiles.players')} ({filteredAndSorted.length})</CardTitle>
            <CardDescription>{t('admin.game_profiles.table_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t('admin.game_profiles.col_user')}</th>
                    <th className="text-right py-3 px-4">{t('admin.game_profiles.col_total_answers')}</th>
                    <th className="text-right py-3 px-4">{t('admin.game_profiles.col_correct_percent')}</th>
                    <th className="text-center py-3 px-4">{t('admin.game_profiles.col_ai_status')}</th>
                    <th className="text-left py-3 px-4">{t('admin.game_profiles.col_top3')}</th>
                    <th className="text-center py-3 px-4">{t('admin.game_profiles.col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((profile) => (
                    <tr key={profile.userId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold">{profile.username}</p>
                          <p className="text-xs text-muted-foreground">{profile.userId.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{profile.totalAnswered}</td>
                      <td className="text-right py-3 px-4">
                        {(profile.overallCorrectRatio * 100).toFixed(1)}%
                      </td>
                      <td className="text-center py-3 px-4">
                        {profile.personalizationActive ? (
                          <Badge variant="default" className="bg-green-500">
                            {t('admin.game_profiles.personalization_active')}
                          </Badge>
                        ) : profile.totalAnswered < 100 ? (
                          <Badge variant="secondary">
                            {t('admin.game_profiles.learning_phase_short')} ({profile.totalAnswered}/100)
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('admin.game_profiles.ai_disabled')}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {profile.topTopics.slice(0, 2).map((topic, idx) => (
                            <span key={topic.topicId} className="text-xs">
                              {idx + 1}. {topic.topicName} ({topic.score.toFixed(1)})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/game-profiles/${profile.userId}`)}
                        >
                          {t('admin.game_profiles.view_details')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
