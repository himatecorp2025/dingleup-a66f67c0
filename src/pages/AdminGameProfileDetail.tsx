import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAdminGameProfileDetail } from '@/hooks/useAdminGameProfiles';
import { Brain, TrendingUp, Clock, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';

export default function AdminGameProfileDetail() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { loading, error, profile } = useAdminGameProfileDetail(userId);

  if (loading) {
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

  if (error || !profile) {
    return (
      <AdminLayout>
        <div className="container mx-auto max-w-7xl">
          <Alert variant="destructive">
            <AlertDescription>{error || t('admin.error_loading_data')}</AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/game-profiles')}
            className="mb-4 text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.game_profile.back_to_list')}
          </Button>
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-400" />
            {profile.username}
          </h1>
          <p className="text-white/60">{t('admin.game_profile.detailed_data')}</p>
        </div>

        {/* Status Alert */}
        {profile.personalizationActive ? (
          <Alert className="mb-6 bg-green-500/10 border-green-500/30">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>{t('admin.game_profile_detail.personalization_active')}</strong> {t('admin.game_profile_detail.personalization_active_desc')}
            </AlertDescription>
          </Alert>
        ) : profile.personalizationReady ? (
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <AlertDescription>
              <strong>{t('admin.game_profile_detail.ai_disabled')}</strong> {t('admin.game_profile_detail.ai_disabled_desc')}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
            <AlertDescription>
              <strong>{t('admin.game_profile.learning_phase')}</strong> {profile.totalAnswered} / 100 {t('admin.game_profile.questions_answered')}
            </AlertDescription>
          </Alert>
        )}

        {/* Statisztikai kártyák */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('admin.game_profile.total_answers')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{profile.totalAnswered}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('admin.game_profile.correct_answers')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{profile.totalCorrect}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('admin.game_profile.correct_ratio')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {(profile.overallCorrectRatio * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('admin.game_profile.metadata')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.game_profile.user_id')}</p>
                <p className="font-mono text-sm">{profile.userId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.game_profile.registration')}</p>
                <p className="text-sm">{new Date(profile.createdAt).toLocaleString('hu-HU')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.game_profile.last_activity')}</p>
                <p className="text-sm">
                  {profile.lastSeenAt
                    ? new Date(profile.lastSeenAt).toLocaleString('hu-HU')
                    : t('admin.game_profile.no_data')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOP3 témák */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              {t('admin.game_profile.top_3_topics')}
            </CardTitle>
            <CardDescription>{t('admin.game_profile.highest_score_topics')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.topTopics.map((topic, idx) => (
                <div key={topic.topicId} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-yellow-500">#{idx + 1}</span>
                    <div>
                      <p className="font-semibold">{topic.topicName}</p>
                      <p className="text-sm text-muted-foreground">
                        {topic.answeredCount} {t('admin.game_profile.answer')} • {(topic.correctRatio * 100).toFixed(1)}% {t('admin.game_profile.correct')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{t('admin.game_profile.score')} {topic.score.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Kérdéselosztás */}
        {profile.personalizationReady && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('admin.game_profile.question_distribution')}</CardTitle>
              <CardDescription>
                {profile.aiPersonalizedQuestionsEnabled
                  ? t('admin.game_profile.active_personalized')
                  : t('admin.game_profile.if_enabled')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>{t('admin.game_profile.favorite_topics')}</span>
                    <span className="font-semibold">70%</span>
                  </div>
                  <Progress value={70} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>{t('admin.game_profile.new_questions')}</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <Progress value={20} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>{t('admin.game_profile.dislike_topics')}</span>
                    <span className="font-semibold">10%</span>
                  </div>
                  <Progress value={10} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Összes téma táblázat */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.game_profile.all_topics')}</CardTitle>
            <CardDescription>{t('admin.game_profile.full_stats_by_topic')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t('admin.game_profile.table.topic')}</th>
                    <th className="text-right py-2 px-4">{t('admin.game_profile.table.answers')}</th>
                    <th className="text-right py-2 px-4">{t('admin.game_profile.table.correct_percent')}</th>
                    <th className="text-right py-2 px-4">{t('admin.game_profile.table.avg_time')}</th>
                    <th className="text-right py-2 px-4">{t('admin.game_profile.table.score')}</th>
                    <th className="text-center py-2 px-4">{t('admin.game_profile.table.top3')}</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.allTopics.map((topic) => (
                    <tr key={topic.topicId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{topic.topicName}</td>
                      <td className="text-right py-3 px-4">{topic.answeredCount}</td>
                      <td className="text-right py-3 px-4">
                        {(topic.correctRatio * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-4">
                        {topic.avgResponseMs ? `${topic.avgResponseMs}ms` : '-'}
                      </td>
                      <td className="text-right py-3 px-4">{topic.score.toFixed(2)}</td>
                      <td className="text-center py-3 px-4">
                        {topic.isInTop3 && (
                          <Badge variant="default" className="bg-yellow-500">★</Badge>
                        )}
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
