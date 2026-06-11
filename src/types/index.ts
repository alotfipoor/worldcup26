import type { Match, Prediction, User, TournamentPrediction } from "@prisma/client";
import type { ScoringReason } from "@/lib/scoring";

export type { Match, Prediction, User, TournamentPrediction };

export interface MatchWithPrediction extends Match {
  userPrediction?: Prediction | null;
}

export type FormResult = ScoringReason | "none";

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
