import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw, Database, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

interface PoolInfo {
  id: string;
  pool_order: number;
  question_count: number;
}

export default function AdminQuestionPools() {
  const { t } = useI18n();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadPoolStats();
  }, []);

  const loadPoolStats = async () => {
    setLoading(true);
    try {
      // Get all pools
      const { data: poolsData, error: poolsError } = await supabase
        .from('question_pools')
        .select('id, pool_order, question_count')
        .order('pool_order');

      if (poolsError) throw poolsError;

      setPools(poolsData || []);

      // Get total question count
      const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      setTotalQuestions(count || 0);
    } catch (error) {
      console.error('Error loading pool stats:', error);
      toast.error(t('admin.error_loading_pool_stats'));
    } finally {
      setLoading(false);
    }
  };

  const regenerateAllPools = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-question-pools', {
        body: {},
      });

      if (error) throw error;

      toast.success(t('admin.pools.created').replace('{count}', String(data.pools_created)), {
        description: t('admin.pools.created_desc')
          .replace('{topics}', String(data.topics_count))
          .replace('{questions}', String(data.questions_per_topic_per_pool)),
      });
      await loadPoolStats();
    } catch (error) {
      console.error('Error regenerating pools:', error);
      toast.error(t('admin.pools.error').replace('{message}', error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRegenerating(false);
    }
  };

  const avgQuestionsPerPool = pools.length > 0
    ? Math.round(pools.reduce((sum, p) => sum + p.question_count, 0) / pools.length)
    : 0;

  const minQuestions = pools.length > 0 ? Math.min(...pools.map(p => p.question_count)) : 0;
  const maxQuestions = pools.length > 0 ? Math.max(...pools.map(p => p.question_count)) : 0;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.pools.main_title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.pools.subtitle')}
            </p>
          </div>
          <Button 
            onClick={regenerateAllPools}
            disabled={regenerating}
            size="lg"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
            {t('admin.pools.regenerate')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('admin.pools.card_title')}
            </CardTitle>
            <CardDescription>
              {t('admin.pools.card_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{pools.length}</div>
                <div className="text-sm text-muted-foreground">{t('admin.pools.stat_active')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{totalQuestions}</div>
                <div className="text-sm text-muted-foreground">{t('admin.pools.stat_total_questions')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{avgQuestionsPerPool}</div>
                <div className="text-sm text-muted-foreground">{t('admin.pools.stat_avg_per_pool')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{minQuestions}</div>
                <div className="text-sm text-muted-foreground">{t('admin.pools.stat_min_per_pool')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{maxQuestions}</div>
                <div className="text-sm text-muted-foreground">{t('admin.pools.stat_max_per_pool')}</div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.pools.loading')}
              </div>
            ) : pools.length === 0 ? (
              <div className="text-center py-8">
                <Badge variant="destructive" className="mb-4">
                  {t('admin.pools.no_pools')}
                </Badge>
                <p className="text-muted-foreground">
                  {t('admin.pools.no_pools_desc')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-8 md:grid-cols-10 gap-2">
                {pools.map(pool => (
                  <div
                    key={pool.id}
                    className={`
                      text-center p-3 rounded-lg border-2 transition-colors
                      ${pool.question_count >= 15 
                        ? 'border-primary bg-primary/10 hover:bg-primary/20' 
                        : 'border-destructive bg-destructive/10'
                      }
                    `}
                  >
                    <div className="text-lg font-bold">{pool.pool_order}</div>
                    <div className="text-xs text-muted-foreground">{pool.question_count}</div>
                  </div>
                ))}
              </div>
            )}

            {pools.length > 0 && minQuestions < 15 && (
              <Badge variant="outline" className="mt-4 border-yellow-500 text-yellow-600">
                {t('admin.pools.warning_low_questions')}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              {t('admin.pools.optimized_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{t('admin.pools.feature_1')}</p>
            <p>{t('admin.pools.feature_2')}</p>
            <p>{t('admin.pools.feature_3')}</p>
            <p>{t('admin.pools.feature_4')}</p>
            <p>{t('admin.pools.feature_5')}</p>
            <p>{t('admin.pools.feature_6')}</p>
            <p>{t('admin.pools.feature_7')}</p>
            <p>{t('admin.pools.feature_8')}</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
