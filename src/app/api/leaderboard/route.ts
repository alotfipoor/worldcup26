import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateTournamentPoints } from "@/lib/scoring";
import { getActualTournamentResults } from "@/lib/tournament";
import type { LeaderboardUser, FormResult } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { role: "USER", activatedAt: { not: null } },
    include: {
      predictions: {
        where: { points: { not: null } },
        select: {
          points: true,
          reason: true,
          match: { select: { kickoff: true } },
        },
      },
      tournamentPredictions: {
        select: { champion: true, topScorer: true, topAssist: true, bestGoalkeeper: true, window: true },
      },
      sideBetPredictions: {
        where: { pointsAwarded: { not: null } },
        select: { pointsAwarded: true },
      },
    },
  });

  const {
    champion: actualChampion,
    topScorer: actualTopScorer,
    topAssist: actualTopAssist,
    bestGoalkeeper: actualBestGoalkeeper,
  } = await getActualTournamentResults();

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

      const last5 = [...user.predictions]
        .sort((a, b) => new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime())
        .slice(0, 5)
        .reverse();
      const formGuide: FormResult[] = Array.from({ length: 5 }, (_, i) => {
        const p = last5[i];
        if (!p) return "none";
        return (p.reason as FormResult) ?? "wrong";
      });

      const latestTournament =
        user.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
        user.tournamentPredictions.find((t) => t.window === "INITIAL");

      const tournamentPoints =
        actualChampion && latestTournament
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
              topAssist: actualTopAssist,
              bestGoalkeeper: actualBestGoalkeeper,
            })
          : 0;

      const sideBetPoints = user.sideBetPredictions.reduce(
        (s, p) => s + (p.pointsAwarded ?? 0),
        0
      );

      return {
        id: user.id,
        name: user.name ?? "Unknown",
        rank: 0,
        exactCount,
        winnerGoalsCount,
        winnerOnlyCount,
        matchPoints,
        tournamentPoints,
        sideBetPoints,
        totalPoints: matchPoints + tournamentPoints + sideBetPoints,
        predictionsSubmitted: user.predictions.length,
        predictionsScored: user.predictions.filter((p) => p.points !== null).length,
        formGuide,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  ranked.forEach((u, i) => {
    u.rank = i + 1;
  });

  return NextResponse.json({ users: ranked, lastUpdated: new Date().toISOString() });
}
