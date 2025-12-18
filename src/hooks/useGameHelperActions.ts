import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/game';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

interface UseGameHelperActionsOptions {
  profile: any;
  refreshProfile: () => Promise<void>;
  logHelpUsage: (helpType: 'third' | 'audience' | '2x_answer') => Promise<void>;
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswer: string | null;
  help5050UsageCount: number;
  help2xAnswerUsageCount: number;
  helpAudienceUsageCount: number;
  isHelp5050ActiveThisQuestion: boolean;
  isDoubleAnswerActiveThisQuestion: boolean;
  isAudienceActiveThisQuestion: boolean;
  setRemovedAnswer: (answer: string | null) => void;
  setIsHelp5050ActiveThisQuestion: (active: boolean) => void;
  setHelp5050UsageCount: (count: number) => void;
  setIsDoubleAnswerActiveThisQuestion: (active: boolean) => void;
  setHelp2xAnswerUsageCount: (count: number) => void;
  setFirstAttempt: (attempt: string | null) => void;
  setSecondAttempt: (attempt: string | null) => void;
  setAudienceVotes: (votes: Record<string, number>) => void;
  setIsAudienceActiveThisQuestion: (active: boolean) => void;
  setHelpAudienceUsageCount: (count: number) => void;
  ALL_QUESTIONS: Question[];
}

export const useGameHelperActions = (options: UseGameHelperActionsOptions) => {
  const { t } = useI18n();
  const {
    profile,
    refreshProfile,
    logHelpUsage,
    questions,
    currentQuestionIndex,
    selectedAnswer,
    help5050UsageCount,
    help2xAnswerUsageCount,
    helpAudienceUsageCount,
    isHelp5050ActiveThisQuestion,
    isDoubleAnswerActiveThisQuestion,
    isAudienceActiveThisQuestion,
    setRemovedAnswer,
    setIsHelp5050ActiveThisQuestion,
    setHelp5050UsageCount,
    setIsDoubleAnswerActiveThisQuestion,
    setHelp2xAnswerUsageCount,
    setFirstAttempt,
    setSecondAttempt,
    setAudienceVotes,
    setIsAudienceActiveThisQuestion,
    setHelpAudienceUsageCount,
    ALL_QUESTIONS,
  } = options;

  const useHelp5050 = useCallback(async () => {
    if (selectedAnswer || isHelp5050ActiveThisQuestion) return;
    
    if (help5050UsageCount >= 2) return;
    
    const cost = help5050UsageCount === 0 ? 0 : 15;
    
    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      // CRITICAL: Always calculate dynamically - NEVER remove the correct answer
      // Find all incorrect answers and pick one randomly
      const incorrectAnswers = currentQuestion.answers.filter(a => !a.correct);
      
      if (incorrectAnswers.length === 0) {
        logger.error('[useHelp5050] No incorrect answers found - this should never happen');
        return;
      }
      
      // Pick a random incorrect answer to remove
      const randomIndex = Math.floor(Math.random() * incorrectAnswers.length);
      const answerToRemove = incorrectAnswers[randomIndex].key;
      
      logger.log('[useHelp5050] Removing incorrect answer:', answerToRemove, 
        'Correct answer is:', currentQuestion.answers.find(a => a.correct)?.key);
      
      if (help5050UsageCount === 0 && profile?.help_third_active) {
        setRemovedAnswer(answerToRemove);
        setIsHelp5050ActiveThisQuestion(true);
        setHelp5050UsageCount(1);
        
        await supabase.rpc('use_help', { p_help_type: 'third' });
        await refreshProfile();
        await logHelpUsage('third');
        return;
      }
      
      if (help5050UsageCount === 1) {
        if (!profile || profile.coins < cost) {
          toast.error(`${t('game.not_enough_gold')} ${cost} ${t('game.gold_needed')}`);
          return;
        }
        
        const { data: success } = await supabase.rpc('spend_coins', { amount: cost });
        if (success) {
          await refreshProfile();
          setRemovedAnswer(answerToRemove);
          setIsHelp5050ActiveThisQuestion(true);
          setHelp5050UsageCount(2);
          await logHelpUsage('third');
        }
      }
    } catch (error) {
      logger.error('[useGameHelperActions] Error in useHelp5050:', error);
      toast.error(t('game.help_activation_error'));
    }
  }, [
    selectedAnswer, isHelp5050ActiveThisQuestion, help5050UsageCount, profile,
    questions, currentQuestionIndex, setRemovedAnswer, setIsHelp5050ActiveThisQuestion,
    setHelp5050UsageCount, refreshProfile, logHelpUsage, t
  ]);

  const useHelp2xAnswer = useCallback(async () => {
    if (selectedAnswer || isDoubleAnswerActiveThisQuestion) return;
    
    if (help2xAnswerUsageCount >= 2) return;
    
    const cost = help2xAnswerUsageCount === 0 ? 0 : 20;
    
    try {
      if (help2xAnswerUsageCount === 0 && profile?.help_2x_answer_active) {
        setIsDoubleAnswerActiveThisQuestion(true);
        setHelp2xAnswerUsageCount(1);
        setFirstAttempt(null);
        setSecondAttempt(null);
        
        await supabase.rpc('use_help', { p_help_type: '2x_answer' });
        await refreshProfile();
        await logHelpUsage('2x_answer');
        return;
      }
      
      if (help2xAnswerUsageCount === 1) {
        if (!profile || profile.coins < cost) {
          toast.error(`${t('game.not_enough_gold')} ${cost} ${t('game.gold_needed')}`);
          return;
        }
        
        const { data: success } = await supabase.rpc('spend_coins', { amount: cost });
        if (success) {
          await refreshProfile();
          setIsDoubleAnswerActiveThisQuestion(true);
          setHelp2xAnswerUsageCount(2);
          setFirstAttempt(null);
          setSecondAttempt(null);
          await logHelpUsage('2x_answer');
        }
      }
    } catch (error) {
      logger.error('[useGameHelperActions] Error in useHelp2xAnswer:', error);
      toast.error(t('game.help_activation_error'));
    }
  }, [
    selectedAnswer, isDoubleAnswerActiveThisQuestion, help2xAnswerUsageCount,
    profile, setIsDoubleAnswerActiveThisQuestion, setHelp2xAnswerUsageCount,
    setFirstAttempt, setSecondAttempt, refreshProfile, logHelpUsage
  ]);

  const useHelpAudience = useCallback(async () => {
    if (selectedAnswer || isAudienceActiveThisQuestion) return;
    
    if (helpAudienceUsageCount >= 2) return;
    
    const cost = helpAudienceUsageCount === 0 ? 0 : 25;
    
    try {
      const currentQuestion = questions[currentQuestionIndex];
      const correctKey = currentQuestion.answers.find(a => a.correct)?.key || 'A';
      
      const correctVote = 65 + Math.floor(Math.random() * 20);
      const remaining = 100 - correctVote;
      
      const wrongKeys = currentQuestion.answers.filter(a => !a.correct).map(a => a.key);
      const votes: Record<string, number> = {};
      
      if (wrongKeys.length === 2) {
        const first = Math.floor(Math.random() * (remaining - 1)) + 1;
        const second = remaining - first;
        votes[wrongKeys[0]] = Math.min(first, second);
        votes[wrongKeys[1]] = Math.max(first, second);
      }
      votes[correctKey] = correctVote;
      
      if (helpAudienceUsageCount === 0 && profile?.help_audience_active) {
        setAudienceVotes(votes);
        setIsAudienceActiveThisQuestion(true);
        setHelpAudienceUsageCount(1);
        
        await supabase.rpc('use_help', { p_help_type: 'audience' });
        await refreshProfile();
        await logHelpUsage('audience');
        return;
      }
      
      if (helpAudienceUsageCount === 1) {
        if (!profile || profile.coins < cost) {
          toast.error(`${t('game.not_enough_gold')} ${cost} ${t('game.gold_needed')}`);
          return;
        }
        
        const { data: success } = await supabase.rpc('spend_coins', { amount: cost });
        if (success) {
          await refreshProfile();
          setAudienceVotes(votes);
          setIsAudienceActiveThisQuestion(true);
          setHelpAudienceUsageCount(2);
          await logHelpUsage('audience');
        }
      }
    } catch (error) {
      logger.error('[useGameHelperActions] Error in useHelpAudience:', error);
      toast.error(t('game.help_activation_error'));
    }
  }, [
    selectedAnswer, isAudienceActiveThisQuestion, helpAudienceUsageCount,
    profile, questions, currentQuestionIndex, setAudienceVotes,
    setIsAudienceActiveThisQuestion, setHelpAudienceUsageCount,
    refreshProfile, logHelpUsage
  ]);

  return {
    useHelp5050,
    useHelp2xAnswer,
    useHelpAudience,
  };
};
