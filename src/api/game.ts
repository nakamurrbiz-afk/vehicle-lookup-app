const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export type GameType = 'riddle' | 'trivia' | 'word';

export interface RiddleGame {
  question: string;
  answer: string;
  hint: string;
}

export interface TriviaGame {
  question: string;
  options: string[];   // ["A. ...", "B. ...", "C. ...", "D. ..."]
  answer: string;      // "A" | "B" | "C" | "D"
  explanation: string;
}

export interface WordGame {
  theme: string;
  hints: string[];     // 3 hints, easiest last
}

export type GameData = RiddleGame | TriviaGame | WordGame;

export interface GameResponse {
  gameType: GameType;
  game: GameData;
}

export async function fetchGame(params: {
  plate: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  gameType: GameType;
  language: 'en' | 'ja';
}): Promise<GameResponse> {
  const res = await fetch(`${API_URL}/v1/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error('FETCH_ERROR');
  return res.json() as Promise<GameResponse>;
}
