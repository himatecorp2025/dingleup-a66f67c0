import { useState, useRef, useEffect } from "react";
import { Users } from "lucide-react";
import { MillionaireQuestion } from "./MillionaireQuestion";
import { MillionaireAnswer } from "./MillionaireAnswer";
import { Question, getSkipCost } from "@/types/game";
import { GameHeader } from "./game/GameHeader";
import { GameTimer } from "./game/GameTimer";
import { GameLifelines } from "./game/GameLifelines";
import { CoinRewardAnimation } from "./CoinRewardAnimation";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  timeLeft: number;
  selectedAnswer: string | null;
  firstAttempt: string | null;
  secondAttempt: string | null;
  removedAnswer: string | null;
  audienceVotes: Record<string, number>;
  help5050UsageCount: number;
  help2xAnswerUsageCount: number;
  helpAudienceUsageCount: number;
  isHelp5050ActiveThisQuestion: boolean;
  isDoubleAnswerActiveThisQuestion: boolean;
  isAudienceActiveThisQuestion: boolean;
  usedQuestionSwap: boolean;
  lives: number;
  maxLives: number;
  coins: number;
  coinRewardAmount?: number;
  coinRewardTrigger?: number;
  onAnswerSelect: (answerId: string) => void;
  onUseHelp5050: () => void;
  onUseHelp2xAnswer: () => void;
  onUseHelpAudience: () => void;
  onUseQuestionSwap: () => void;
  onExit: () => void;
  disabled?: boolean;
  className?: string;
}

export const QuestionCard = ({
  question,
  questionNumber,
  timeLeft,
  selectedAnswer,
  firstAttempt,
  secondAttempt,
  removedAnswer,
  audienceVotes,
  help5050UsageCount,
  help2xAnswerUsageCount,
  helpAudienceUsageCount,
  isHelp5050ActiveThisQuestion,
  isDoubleAnswerActiveThisQuestion,
  isAudienceActiveThisQuestion,
  usedQuestionSwap,
  lives,
  maxLives,
  coins,
  coinRewardAmount = 0,
  coinRewardTrigger = 0,
  onAnswerSelect,
  onUseHelp5050,
  onUseHelp2xAnswer,
  onUseHelpAudience,
  onUseQuestionSwap,
  onExit,
  disabled = false,
  className = ""
}: QuestionCardProps) => {
  const answers = Array.isArray(question.answers) ? question.answers : [];
  const correctAnswerKey = answers.find(a => a.correct)?.key || "";
  const skipCost = getSkipCost(questionNumber - 1); // Convert to 0-indexed

  return (
    <div className={`relative w-full min-h-screen`}>
      <div className={`relative w-full h-full flex flex-col pt-0 px-2 sm:px-3 md:px-4 pb-2 gap-0 ${className}`}>
      {/* Top section: Exit button, Lives, Coins */}
      <GameHeader
        lives={lives}
        maxLives={maxLives}
        coins={coins}
        onExit={onExit}
      />

      {/* Coin animation - positioned below header at 75% horizontal width */}
      <div className="absolute z-20" style={{ top: '12%', left: '75%', transform: 'translateX(-50%)' }}>
        <CoinRewardAnimation 
          amount={coinRewardAmount} 
          trigger={coinRewardTrigger}
        />
      </div>

    {/* Wrapper for Timer + Question + Answers + Help - Vertically centered */}
    <div className="flex-grow flex flex-col justify-center space-y-3 sm:space-y-4">
      {/* Timer */}
      <GameTimer timeLeft={timeLeft} maxTime={10} />

      {/* Middle section: Question and Answers */}
      <div className="relative flex">
        {/* Question and Answers */}
        <div className="flex-1 flex flex-col space-y-1 sm:space-y-2">
          <MillionaireQuestion questionNumber={questionNumber}>
            {question.question}
          </MillionaireQuestion>

          {/* Answers */}
          <div className="space-y-3 sm:space-y-4">
            {question.answers.map((answer) => {
              const isRemoved = removedAnswer === answer.key;
              const isSelected = selectedAnswer === answer.key;
              const isCorrect = answer.key === correctAnswerKey;
              const isSelectedCorrect = isSelected && isCorrect;
              const isFirstAttempt = firstAttempt === answer.key;
              const isSecondAttempt = secondAttempt === answer.key;
              
              // Timeout case: selectedAnswer === '__timeout__'
              const isTimeout = selectedAnswer === '__timeout__';
              
              // Wrong answer logic:
              // 1. User selected this wrong answer directly
              // 2. In double answer mode: first attempt was wrong AND we have a final answer (both wrong)
              const isSelectedWrong = (isSelected && !isCorrect) || 
                (isDoubleAnswerActiveThisQuestion && isFirstAttempt && !isCorrect && selectedAnswer !== null);
              
              // Orange for attempts in double answer mode BEFORE final selection
              // First attempt shows orange until second attempt is made
              // Second attempt shows orange briefly, then both show red when final answer is set
              const isDoubleChoiceActive = isDoubleAnswerActiveThisQuestion && 
                (isFirstAttempt || isSecondAttempt) && 
                !selectedAnswer;
              
              // Show correct answer (green pulse) when:
              // 1. User selected wrong answer (reveal correct)
              // 2. Timeout happened (reveal correct)
              const showCorrectPulse = (selectedAnswer && selectedAnswer !== '__timeout__' && !isSelected && isCorrect) ||
                (isTimeout && isCorrect);

              return (
                <div key={answer.key} className="relative">
                  <MillionaireAnswer
                    letter={answer.key as 'A' | 'B' | 'C'}
                    onClick={() => !disabled && onAnswerSelect(answer.key)}
                    isSelected={isSelected}
                    isCorrect={isSelectedCorrect}
                    isWrong={isSelectedWrong}
                    disabled={disabled || isRemoved}
                    isRemoved={isRemoved}
                    isDoubleChoiceActive={isDoubleChoiceActive}
                    showCorrectPulse={showCorrectPulse}
                  >
                    {answer.text}
                  </MillionaireAnswer>
                  
                  {/* Audience percentage */}
                  {isAudienceActiveThisQuestion && audienceVotes[answer.key] && (
                    <div className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-purple-600/90 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full">
                      <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {audienceVotes[answer.key]}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Spacer to ensure distance between C answer and lifeline buttons */}
            <div className="h-4 sm:h-5 md:h-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Bottom section: Help buttons - below answers with spacing */}
      <div className="flex justify-center mt-6">
        <GameLifelines
          help5050UsageCount={help5050UsageCount}
          help2xAnswerUsageCount={help2xAnswerUsageCount}
          helpAudienceUsageCount={helpAudienceUsageCount}
          isHelp5050ActiveThisQuestion={isHelp5050ActiveThisQuestion}
          isDoubleAnswerActiveThisQuestion={isDoubleAnswerActiveThisQuestion}
          isAudienceActiveThisQuestion={isAudienceActiveThisQuestion}
          usedQuestionSwap={usedQuestionSwap}
          skipCost={skipCost}
          coins={coins}
          onUseHelp5050={onUseHelp5050}
          onUseHelp2xAnswer={onUseHelp2xAnswer}
          onUseHelpAudience={onUseHelpAudience}
          onUseQuestionSwap={onUseQuestionSwap}
        />
      </div>
      </div>
    </div>
    </div>
  );
};
