export interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

export interface Game {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  currentQuestionIndex: number;
  questionIds: string[];
  startTime?: number; // Timestamp when the current question started
}

export interface Player {
  id: string;
  gameId: string;
  name: string;
  score: number;
}

export interface Answer {
  id: string;
  playerId: string;
  gameId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  responseTime: number;
}
