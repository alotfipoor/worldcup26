import type { Match, Prediction, User, TournamentPrediction } from "@prisma/client";

export type { Match, Prediction, User, TournamentPrediction };

export interface MatchWithPrediction extends Match {
  userPrediction?: Prediction | null;
}

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
}

export interface SessionUser {
  id: string;
  name: string | null;
  role: string;
  inviteCode: string;
}
