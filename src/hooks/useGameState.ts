import { useState, useCallback, useRef } from 'react';
import { GameCategory, Question } from '@/types/game';

type GameState = 'playing' | 'finished' | 'out-of-lives';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>('playing');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  // Track per-question correct/wrong for accurate analytics
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);
  
  // Prevent race conditions with state update guards
  const isUpdatingRef = useRef(false);

  const incrementCorrectAnswers = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setCorrectAnswers(prev => {
      const newValue = prev + 1;
      isUpdatingRef.current = false;
      return newValue;
    });
  }, []);

  const recordAnswerResult = useCallback((wasCorrect: boolean) => {
    setAnswerResults(prev => [...prev, wasCorrect]);
  }, []);

  const addResponseTime = useCallback((time: number) => {
    if (time < 0 || time > 60) {
      console.warn('[useGameState] Invalid response time:', time);
      return;
    }
    setResponseTimes(prev => [...prev, time]);
  }, []);

  const addCoins = useCallback((amount: number) => {
    if (amount < 0 || amount > 10000) {
      console.warn('[useGameState] Invalid coin amount:', amount);
      return;
    }
    setCoinsEarned(prev => {
      const newValue = prev + amount;
      console.log(`[useGameState] Coins earned updated: ${prev} + ${amount} = ${newValue}`);
      return newValue;
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => {
      const newIndex = prev + 1;
      console.log(`[useGameState] Next question: ${prev} -> ${newIndex}`);
      return newIndex;
    });
  }, []);

  const resetGameState = useCallback(() => {
    console.log('[useGameState] Resetting game state');
    isUpdatingRef.current = false;
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setCorrectAnswers(0);
    setCoinsEarned(0);
    setResponseTimes([]);
    setAnswerResults([]);
    setSelectedAnswer(null); // Clear selected answer on reset
  }, []);

  return {
    gameState,
    setGameState,
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    selectedAnswer,
    setSelectedAnswer,
    correctAnswers,
    coinsEarned,
    responseTimes,
    answerResults,
    incrementCorrectAnswers,
    recordAnswerResult,
    addResponseTime,
    addCoins,
    nextQuestion,
    resetGameState,
  };
};
