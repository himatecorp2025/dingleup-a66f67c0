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
  totalQuestions: number;
  totalAnswers: number;
  languages: {
    en: LanguageStats;
  };
}

export const QuestionTranslationManager = () => {
  const { t } = useI18n();
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<string>('');
  const [currentBatch, setCurrentBatch] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [stats, setStats] = useState<{
    total: number;
    success: number;
    errors: number;
  } | null>(null);
  const [initialStats, setInitialStats] = useState<InitialStats | null>(null);
  const [isCheckingContent, setIsCheckingContent] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load initial statistics with per-language breakdown
  useEffect(() => {
    const loadInitialStats = async () => {
      try {
        setIsCheckingContent(true);

        const TARGET_LANGUAGES = ['en'] as const;
        
        // Get total questions count
        const { count: totalQuestions, error: questionsError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true });

        if (questionsError || !totalQuestions) {
          logger.error('[QuestionTranslationManager] Error fetching questions:', questionsError);
          return;
        }

        // Total answers = total questions * 3 (A, B, C)
        const totalAnswers = totalQuestions * 3;

        // Get per-language statistics
        const languageStats: Partial<InitialStats['languages']> = {};

        for (const lang of TARGET_LANGUAGES) {
          const { count: translatedCount, error } = await supabase
            .from('question_translations')
            .select('*', { count: 'exact', head: true })
            .eq('lang', lang);

          if (error) {
            logger.error(`[QuestionTranslationManager] Error fetching ${lang} stats:`, error);
            continue;
          }

          const translated = translatedCount || 0;
          const total = totalQuestions;
          const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;

          languageStats[lang] = {
            total,
            translated,
            percentage
          };
        }

        setInitialStats({
          totalQuestions,
          totalAnswers,
          languages: languageStats as InitialStats['languages']
        });

      } catch (error) {
        logger.error('[QuestionTranslationManager] Exception loading stats:', error);
      } finally {
        setIsCheckingContent(false);
      }
    };

    loadInitialStats();
  }, []);

  const startTranslation = async () => {
    try {
      setIsTranslating(true);
      setProgress(0);
      setStatus(t('admin.searching_truncated_translations'));
      setCurrentLanguage('');
      setCurrentBatch(0);
      setTotalBatches(0);
      setStats(null);

      // CRITICAL: Refresh session to ensure valid JWT token
      let { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        logger.error('[QuestionTranslationManager] Session refresh failed:', sessionError);
        toast.error(t('admin.session_expired'));
        setIsTranslating(false);
        return;
      }

      logger.log('[QuestionTranslationManager] Starting truncated translations scan and re-translation');

      // Subscribe to real-time progress updates
      const progressChannel = supabase.channel('question-translation-progress');
      
      progressChannel.on('broadcast', { event: 'translation-progress' }, (payload: any) => {
        const data = payload.payload;
        logger.log('[QuestionTranslationManager] Progress update:', data);
        
        if (data.phase === 'language-start') {
          setCurrentLanguage(data.languageName);
          setStatus(t('admin.translating_to_language').replace('{language}', data.languageName));
          setCurrentBatch(0);
          setTotalBatches(Math.ceil(data.totalQuestions / 10));
        } else if (data.phase === 'batch-complete' || data.phase === 'batch-skipped') {
          setCurrentBatch(data.currentBatch);
          setTotalBatches(data.totalBatches);
          const percentComplete = Math.round((data.questionsProcessed / data.totalQuestions) * 100);
          setProgress(percentComplete);
          setStatus(`${data.languageName}: ${data.currentBatch}/${data.totalBatches} batch (${data.successCount} ${t('admin.successful')}, ${data.errorCount} ${t('admin.error')})`);
        }
      });

      await progressChannel.subscribe();
      channelRef.current = progressChannel;

      // Single invocation - scans ALL question_translations, finds truncated, deletes, and re-translates
      setStatus(t('admin.deleting_retranslating_truncated'));
      setProgress(5);

      const { data, error } = await supabase.functions.invoke('generate-question-translations', {
        body: {}, // No parameters needed - scans entire table
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        logger.error('[QuestionTranslationManager] Translation error:', error);
        toast.error(t('admin.translation_error'));
        setStatus(t('admin.error_occurred'));
        setIsTranslating(false);
        return;
      }

      logger.log('[QuestionTranslationManager] Translation response:', data);

      if (data?.phase === 'scan' && data?.stats?.totalTruncated === 0) {
        setProgress(100);
        setStatus(t('admin.no_truncated_translations'));
        toast.success(t('admin.all_translations_complete'));
        setStats({
          total: 0,
          success: 0,
          errors: 0
        });
        setIsTranslating(false);
        return;
      }

      setProgress(50);

      if (data?.stats) {
        const totalSuccess = data.stats.retranslated || 0;
        const totalErrors = data.stats.errors || 0;
        const totalTruncated = data.stats.totalTruncated || 0;

        setProgress(100);
        setStatus(t('admin.translation_complete'));
        setStats({
          total: totalTruncated,
          success: totalSuccess,
          errors: totalErrors
        });

        if (totalTruncated > 0) {
          toast.success(t('admin.translations_retranslated').replace('{count}', totalTruncated.toString()).replace('{success}', totalSuccess.toString()));
        }

        if (totalErrors > 0) {
          toast.warning(t('admin.translation_errors_count').replace('{count}', totalErrors.toString()));
        }
      } else {
        setProgress(100);
        setStatus(t('admin.unknown_result'));
        toast.warning(t('admin.translation_result_unknown'));
      }

    } catch (error) {
      logger.error('[QuestionTranslationManager] Exception:', error);
      toast.error(t('admin.unexpected_error'));
      setStatus(t('admin.unexpected_error'));
    } finally {
      // Unsubscribe from real-time channel
      if (channelRef.current) {
        await channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsTranslating(false);
    }
  };

  const LANGUAGE_NAMES: Record<string, string> = {
    en: t('language.english')
  };

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Languages className="w-5 h-5 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">{t('admin.question_translations.title')}</h3>
      </div>

      <p className="text-sm text-white/60 mb-4">
        {t('admin.question_translations.description')}
      </p>

      {/* Initial Statistics Display */}
      {initialStats && (
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{t('admin.question_translations.total_questions')}:</span>
                <span className="text-lg font-bold text-purple-400">{initialStats.totalQuestions}</span>
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{t('admin.question_translations.total_answers')}:</span>
                <span className="text-lg font-bold text-purple-400">{initialStats.totalAnswers}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {Object.entries(initialStats.languages).map(([lang, langStats]) => (
              <div key={lang} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{LANGUAGE_NAMES[lang]}:</span>
                  <span className="text-sm font-bold text-purple-400">{langStats.percentage}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{langStats.translated} / {langStats.total} kérdés lefordítva</span>
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
          {currentLanguage && (
            <div className="mt-2 flex items-center gap-2">
              <Languages className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-white/60">
                {t('admin.question_translations.current_language')}: <span className="font-semibold text-purple-400">{currentLanguage}</span>
              </p>
            </div>
          )}
          {totalBatches > 0 && (
            <p className="mt-1 text-xs text-white/60">
              {t('admin.batch')}: <span className="font-semibold text-purple-400">{currentBatch}/{totalBatches}</span>
            </p>
          )}
        </div>
      )}

      {isTranslating && (
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/50">{t('admin.question_translations.progress')}:</p>
            <p className="text-sm font-semibold text-purple-400">{progress}%</p>
          </div>
        </div>
      )}

      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Languages className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-white/60">{t('admin.question_translations.total')}</span>
            </div>
            <p className="text-xl font-bold text-purple-400">{stats.total}</p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-white/60">{t('admin.successful')}</span>
            </div>
            <p className="text-xl font-bold text-green-400">{stats.success}</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-white/60">{t('admin.question_translations.errors')}</span>
            </div>
            <p className="text-xl font-bold text-red-400">{stats.errors}</p>
          </div>
        </div>
      )}

      <Button
        onClick={startTranslation}
        disabled={isTranslating || isCheckingContent}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCheckingContent ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('admin.question_translations.checking_content')}
          </>
        ) : isTranslating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('admin.question_translations.translating')}
          </>
        ) : (
          <>
            <Languages className="w-4 h-4 mr-2" />
            {t('admin.question_translations.generate_missing')}
          </>
        )}
      </Button>
    </div>
  );
};