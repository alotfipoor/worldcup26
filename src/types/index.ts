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
  sideBetPoints: number;
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

export interface SideBetItem {
  id: string;
  question: string;
  answerType: "TEXT" | "CHOICE" | "MULTI_CHOICE";
  options: string[] | null;
  maxPicks: number | null;
  closesAt: string; // ISO string
  correctAnswer: string | null;
  pointsReward: number;
  resolved: boolean;
  createdAt: string;
  myAnswer: string | null;
  myPointsAwarded: number | null;
  predictionCount: number;
  voters: string[]; // names of users who voted, no answers
  voterAnswers: { name: string; answer: string }[] | null; // null while open, populated once closed
}
