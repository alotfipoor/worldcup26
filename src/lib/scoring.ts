export type ScoringReason =
  | "exact_score"
  | "correct_winner_goal_diff"
  | "correct_winner_only"
  | "wrong";

export interface ScoringResult {
  points: number;
  reason: ScoringReason;
}

export const POINTS = {
  exact_score: 6,
  correct_winner_goal_diff: 4,
  correct_winner_only: 2,
  knockout_exact_score: 7,
  knockout_correct_winner_goal_diff: 5,
  knockout_correct_winner_only: 3,
  wrong: 0,
  tournament_champion: 15,
  tournament_top_scorer: 10,
  tournament_top_assist: 10,
  tournament_best_goalkeeper: 10,
} as const;

const GROUP_STAGES = ["GROUP"] as const;

function isKnockout(stage: string): boolean {
  return !GROUP_STAGES.includes(stage as "GROUP");
}

function getWinner(
  home: number,
  away: number
): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function calculateMatchPoints(
  prediction: {
    homeScore: number | null;
    awayScore: number | null;
    predictedWinner: string | null;
  },
  match: { homeScore: number; awayScore: number; stage?: string }
): ScoringResult {
  const knockout = isKnockout(match.stage ?? "GROUP");
  const actualWinner = getWinner(match.homeScore, match.awayScore);
  const hasScores =
    prediction.homeScore !== null && prediction.awayScore !== null;

  if (hasScores) {
    if (
      prediction.homeScore === match.homeScore &&
      prediction.awayScore === match.awayScore
    ) {
      return {
        points: knockout ? POINTS.knockout_exact_score : POINTS.exact_score,
        reason: "exact_score",
      };
    }

    const predictedWinner = getWinner(
      prediction.homeScore!,
      prediction.awayScore!
    );

    if (predictedWinner === actualWinner) {
      const actualDiff = match.homeScore - match.awayScore;
      const predictedDiff = prediction.homeScore! - prediction.awayScore!;
      if (predictedDiff === actualDiff) {
        return {
          points: knockout ? POINTS.knockout_correct_winner_goal_diff : POINTS.correct_winner_goal_diff,
          reason: "correct_winner_goal_diff",
        };
      }
      return {
        points: knockout ? POINTS.knockout_correct_winner_only : POINTS.correct_winner_only,
        reason: "correct_winner_only",
      };
    }

    return { points: 0, reason: "wrong" };
  }

  if (prediction.predictedWinner === actualWinner) {
    return {
      points: knockout ? POINTS.knockout_correct_winner_only : POINTS.correct_winner_only,
      reason: "correct_winner_only",
    };
  }
  return { points: 0, reason: "wrong" };
}

export function calculateTournamentPoints(
  prediction: { champion: string | null; topScorer: string | null; topAssist: string | null; bestGoalkeeper?: string | null },
  actual: { champion: string; topScorer: string; topAssist: string; bestGoalkeeper: string }
): number {
  let points = 0;
  if (
    prediction.champion &&
    prediction.champion.toLowerCase() === actual.champion.toLowerCase()
  ) {
    points += POINTS.tournament_champion;
  }
  if (
    prediction.topScorer &&
    actual.topScorer &&
    prediction.topScorer.toLowerCase() === actual.topScorer.toLowerCase()
  ) {
    points += POINTS.tournament_top_scorer;
  }
  if (
    prediction.topAssist &&
    actual.topAssist &&
    prediction.topAssist.toLowerCase() === actual.topAssist.toLowerCase()
  ) {
    points += POINTS.tournament_top_assist;
  }
  if (
    prediction.bestGoalkeeper &&
    actual.bestGoalkeeper &&
    prediction.bestGoalkeeper.toLowerCase() === actual.bestGoalkeeper.toLowerCase()
  ) {
    points += POINTS.tournament_best_goalkeeper;
  }
  return points;
}

export function isPredictionLocked(kickoff: Date): boolean {
  return new Date() >= new Date(kickoff);
}

export function getLockTime(kickoff: Date): Date {
  return new Date(kickoff);
}
