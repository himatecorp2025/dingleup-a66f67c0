import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Languages, Loader2, CheckCircle, XCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

interface LanguageStats {
  total: number;
  translated: number;
  percentage: number;
}

interface InitialStats {
  totalKeys: number;
  languages: {
    en: LanguageStats;
  };
}

export const TranslationSeeder = () => {
  const { t } = useI18n();
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [stats, setStats] = useState<{
    total: number;
    success: number;
    errors: number;
  } | null>(null);
  const [initialStats, setInitialStats] = useState<InitialStats | null>(null);
  const [hasUntranslated, setHasUntranslated] = useState<boolean | null>(null);
  const [isCheckingContent, setIsCheckingContent] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load initial statistics with per-language breakdown
  useEffect(() => {
    const loadInitialStats = async () => {
      try {
        setIsCheckingContent(true);

        const TARGET_LANGUAGES = ['en'] as const;
        
        // Get total keys count
        const { count: totalKeys, error: countError } = await supabase
          .from('translations')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          logger.error('[TranslationSeeder] Error fetching total keys:', countError);
          return;
        }

        // Get per-language statistics using batched queries
        const languageStats: Partial<InitialStats['languages']> = {};
        let hasAnyUntranslated = false;

        for (const lang of TARGET_LANGUAGES) {
          const { count: translatedCount, error } = await supabase
            .from('translations')
            .select('*', { count: 'exact', head: true })
            .not(lang, 'is', null);

          if (error) {
            logger.error(`[TranslationSeeder] Error fetching ${lang} stats:`, error);
            continue;
          }

          const translated = translatedCount || 0;
          const total = totalKeys || 0;
          const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;

          languageStats[lang] = {
            total,
            translated,
            percentage
          };

          if (translated < total) {
            hasAnyUntranslated = true;
          }
        }

        setInitialStats({
          totalKeys: totalKeys || 0,
          languages: languageStats as InitialStats['languages']
        });

        setHasUntranslated(hasAnyUntranslated);

      } catch (error) {
        logger.error('[TranslationSeeder] Exception loading stats:', error);
        setHasUntranslated(false);
      } finally {
        setIsCheckingContent(false);
      }
    };

    loadInitialStats();
  }, []);

  // Subscribe to real-time progress updates
  useEffect(() => {
    if (!isTranslating) return;

    const channel = supabase.channel('ui-translation-progress');
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'progress' }, (payload: any) => {
        logger.log('[TranslationSeeder] Progress update:', payload);
        const newProgress = payload.payload.progress || 0;
        const newStatus = payload.payload.status || '';
        setProgress(newProgress);
        setStatus(newStatus);
        
        // Ha befejezett, állítsuk le a loading állapotot
        if (newProgress === 100 || newStatus.includes('befejezve')) {
          setIsTranslating(false);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [isTranslating]);

  const startTranslation = async () => {
    try {
      setIsTranslating(true);
      setProgress(0);
      setStatus('UI fordítás indítása...');
      setStats(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('admin.session_expired'));
        setIsTranslating(false);
        return;
      }

      logger.log('[TranslationSeeder] Starting chunked translation process');

      let offset = 0;
      let hasMore = true;
      let totalSuccess = 0;
      let totalErrors = 0;
      let totalProcessed = 0;

      while (hasMore) {
        setStatus(`Fordítás folyamatban... ${totalProcessed} kulcs feldolgozva`);

        const { data, error } = await supabase.functions.invoke('auto-translate-all', {
          body: { offset, limit: 300 },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) {
          logger.error('[TranslationSeeder] Translation error:', error);
          toast.error(t('admin.translation_error_generic'));
          setStatus(t('admin.error_occurred'));
          setIsTranslating(false);
          return;
        }

        if (data?.stats) {
          totalSuccess += data.stats.success || 0;
          totalErrors += data.stats.errors || 0;
          totalProcessed = data.nextOffset || offset;

          const progressPercent = data.progress || 0;
          setProgress(progressPercent);
          setStatus(`Fordítás: ${progressPercent}% (${totalProcessed}/${data.totalCount} kulcs)`);
        }

        hasMore = data?.hasMore || false;
        offset = data?.nextOffset || (offset + 300);

        logger.log(`[TranslationSeeder] Chunk complete - hasMore: ${hasMore}, nextOffset: ${offset}`);
      }

      setProgress(100);
      setStatus('Fordítás befejezve!');
      setStats({
        total: totalSuccess + totalErrors,
        success: totalSuccess,
        errors: totalErrors
      });

      toast.success(t('admin.translation_success').replace('{count}', totalSuccess.toString()));

      if (totalErrors > 0) {
        toast.warning(t('admin.translation_errors_occurred').replace('{count}', totalErrors.toString()));
      }

    } catch (error) {
      logger.error('[TranslationSeeder] Exception:', error);
      toast.error(t('admin.unexpected_error'));
      setStatus(t('admin.unexpected_error'));
    } finally {
      setIsTranslating(false);
    }
  };

  const LANGUAGE_NAMES: Record<string, string> = {
    en: t('language.english')
  };

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Languages className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">{t('admin.ui_translations.title')}</h3>
      </div>

      <p className="text-sm text-white/60 mb-4">
        {t('admin.ui_translations.description')}
      </p>

      {/* Initial Statistics Display */}
      {initialStats && (
        <div className="mb-4 space-y-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{t('admin.ui_translations.total_keys')}:</span>
              <span className="text-lg font-bold text-blue-400">{initialStats.totalKeys}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {Object.entries(initialStats.languages).map(([lang, langStats]) => (
              <div key={lang} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{LANGUAGE_NAMES[lang]}:</span>
                  <span className="text-sm font-bold text-blue-400">{langStats.percentage}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{langStats.translated} / {langStats.total} lefordítva</span>
                  <span>{langStats.total - langStats.translated} hátra</span>
                </div>
                <Progress value={langStats.percentage} className="h-1.5 mt-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {status && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <p className="text-sm text-white/80">{status}</p>
        </div>
      )}

      {isTranslating && (
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/50">{t('admin.ui_translations.progress')}:</p>
            <p className="text-sm font-semibold text-blue-400">{progress}%</p>
          </div>
        </div>
      )}

      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Languages className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/60">{t('admin.ui_translations.total')}</span>
            </div>
            <p className="text-xl font-bold text-blue-400">{stats.total}</p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-white/60">{t('admin.ui_translations.successful')}</span>
            </div>
            <p className="text-xl font-bold text-green-400">{stats.success}</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-white/60">{t('admin.ui_translations.errors')}</span>
            </div>
            <p className="text-xl font-bold text-red-400">{stats.errors}</p>
          </div>
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                onClick={startTranslation}
                disabled={isTranslating || isCheckingContent || !hasUntranslated}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingContent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('translation_seeder.checking_content')}
                  </>
                ) : isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('translation_seeder.translating')}
                  </>
                ) : !hasUntranslated ? (
                  <>
                    <Info className="w-4 h-4 mr-2" />
                    {t('translation_seeder.no_untranslated')}
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4 mr-2" />
                    {t('translation_seeder.translate_ui')}
                  </>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          {!hasUntranslated && !isCheckingContent && (
            <TooltipContent>
              <p>{t('translation_seeder.all_translated')}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
