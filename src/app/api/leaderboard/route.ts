import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTournamentPoints } from "@/lib/scoring";
import type { LeaderboardUser } from "@/types";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: "USER", activatedAt: { not: null } },
    include: {
      predictions: {
        where: { points: { not: null } },
        select: { points: true, reason: true },
      },
      tournamentPredictions: {
        select: { champion: true, topScorer: true, window: true },
      },
    },
  });

  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";

  const ranked: LeaderboardUser[] = users
    .map((user) => {
      const exactCount = user.predictions.filter(
        (p) => p.reason === "exact_score"
      ).length;
      const winnerGoalsCount = user.predictions.filter(
        (p) => p.reason === "correct_winner_with_goals"
      ).length;
      const winnerOnlyCount = user.predictions.filter(
        (p) => p.reason === "correct_winner_only"
      ).length;
      const matchPoints = user.predictions.reduce(
        (sum, p) => sum + (p.points ?? 0),
        0
      );

      const latestTournament =
        user.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
        user.tournamentPredictions.find((t) => t.window === "INITIAL");

      const tournamentPoints =
        actualChampion && latestTournament
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
            })
          : 0;

      return {
        id: user.id,
        name: user.name ?? "Unknown",
        rank: 0,
        exactCount,
        winnerGoalsCount,
        winnerOnlyCount,
        matchPoints,
        tournamentPoints,
        totalPoints: matchPoints + tournamentPoints,
        predictionsSubmitted: user.predictions.length,
        predictionsScored: user.predictions.filter((p) => p.points !== null)
          .length,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  ranked.forEach((u, i) => {
    u.rank = i + 1;
  });

  return NextResponse.json({ users: ranked, lastUpdated: new Date().toISOString() });
}
