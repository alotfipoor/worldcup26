import type { Match, Prediction, User, TournamentPrediction } from "@prisma/client";

export type { Match, Prediction, User, TournamentPrediction };

export interface MatchWithPrediction extends Match {
  userPrediction?: Prediction | null;
}

export type FormResult = "exact_score" | "correct_winner_goal_diff" | "correct_winner_only" | "wrong" | "none";

export interface LeaderboardUser {
  id: string;
  name: string;
  rank: number;
  exactCount: number;
  winnerGoalsCount: number;
  winnerOnlyCount: number;
  matchPoints: number;
  tournamentPoints: number;
  totalPoints: number;
  predictionsSubmitted: number;
  predictionsScored: number;
  formGuide: FormResult[]; // last 5 scored predictions, oldest→newest, padded with "none"
}

export interface SessionUser {
  id: string;
  name: string | null;
  role: string;
  inviteCode: string;
}
