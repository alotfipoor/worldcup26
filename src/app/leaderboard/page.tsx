import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import AutoRefresh from "@/components/AutoRefresh";
import { calculateTournamentPoints } from "@/lib/scoring";
import type { LeaderboardUser } from "@/types";

export const revalidate = 30;

async function getLeaderboard(): Promise<LeaderboardUser[]> {
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

  return users
    .map((user) => {
      const exactCount = user.predictions.filter((p) => p.reason === "exact_score").length;
      const winnerGoalsCount = user.predictions.filter((p) => p.reason === "correct_winner_goal_diff").length;
      const winnerOnlyCount = user.predictions.filter((p) => p.reason === "correct_winner_only").length;
      const matchPoints = user.predictions.reduce((sum, p) => sum + (p.points ?? 0), 0);

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
        predictionsScored: user.predictions.filter((p) => p.points !== null).length,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const users = await getLeaderboard();

  return (
    <PageWrapper>
      <AutoRefresh intervalMs={60_000} />
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Standings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap a player to see their predictions
          </p>
        </div>
        <LeaderboardTable users={users} currentUserId={session.userId} />
      </div>
    </PageWrapper>
  );
}
