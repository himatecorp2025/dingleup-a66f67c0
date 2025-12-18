export type GameCategory = 'mixed';

export interface Answer {
  key: 'A' | 'B' | 'C';
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  question: string;
  answers: Answer[];
  audience?: { A: number; B: number; C: number };
  third?: string;
  topic: string;
  topic_id?: string; // Topic ID for analytics
}

export interface ShuffledQuestion extends Question {
  shuffledAnswers: string[];
  correctIndex: number;
}

export type GameState = 'idle' | 'category-select' | 'playing' | 'won' | 'lost' | 'out-of-lives' | 'timeout';

export interface GameResult {
  id?: string;
  user_id: string;
  category: GameCategory;
  correct_answers: number;
  total_questions: number;
  coins_earned: number;
  average_response_time: number;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  birth_date: string | null;
  coins: number;
  lives: number;
  max_lives: number;
  lives_regeneration_rate: number;
  last_life_regeneration: string;
  last_username_change: string | null;
  help_third_active: boolean;
  help_2x_answer_active: boolean;
  help_audience_active: boolean;
  daily_gift_streak: number;
  daily_gift_last_claimed: string | null;
  invitation_code: string;
  avatar_url: string | null;
  welcome_bonus_claimed: boolean;
  question_swaps_available: number;
  total_correct_answers: number;
  country_code: string | null;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
  age_verified: boolean | null;
  age_consent: boolean | null;
  terms_accepted_at: string | null;
}

export interface WeeklyRanking {
  id: string;
  user_id: string;
  category: GameCategory;
  week_start: string;
  total_correct_answers: number;
  average_response_time: number;
  rank: number | null;
  username?: string;
}

// Játék indításkor 1 arany jutalom
export const START_GAME_REWARD = 1;

// Progresszív arany jutalom rendszer (0-indexed kérdések)
// 1-4. kérdés (index 0-3): 1-1-1-1 = 4 érme
// 5-9. kérdés (index 4-8): 3-3-3-3-3 = 15 érme
// 10-14. kérdés (index 9-13): 5-5-5-5-5 = 25 érme
// 15. kérdés (index 14): 55 érme
// Összesen: 1 (start) + 4 + 15 + 25 + 55 = 100 érme
export const getCoinsForQuestion = (questionIndex: number): number => {
  if (questionIndex >= 0 && questionIndex <= 3) return 1;  // 1-4. kérdés
  if (questionIndex >= 4 && questionIndex <= 8) return 3;  // 5-9. kérdés
  if (questionIndex >= 9 && questionIndex <= 13) return 5; // 10-14. kérdés
  if (questionIndex === 14) return 55; // 15. kérdés
  return 0; // fallback
};

export const HELP_REACTIVATION_COSTS = {
  'third': 15,
  '2x_answer': 20,
  'audience': 30
};

export const CONTINUE_AFTER_WRONG_COST = 5;
export const TIMEOUT_CONTINUE_COST = 15;
export const EXTRA_LIFE_COST = 100;
export const INITIAL_LIVES = 15;
export const LIVES_REGEN_MINUTES = 12;