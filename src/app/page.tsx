import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import MatchCard from "@/components/matches/MatchCard";
import MiniLeaderboard from "@/components/leaderboard/MiniLeaderboard";
import AutoRefresh from "@/components/AutoRefresh";
import Link from "next/link";
import { calculateTournamentPoints } from "@/lib/scoring";
import { maybeTriggerBackgroundSync } from "@/lib/sync";
import type { LeaderboardUser, FormResult } from "@/types";

export const revalidate = 30;

async function getLeaderboardData(currentUserId: string): Promise<LeaderboardUser[]> {
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
        formGuide,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  maybeTriggerBackgroundSync();

  const [liveMatches, upcomingMatches, predictions, leaderboard] =
    await Promise.all([
      prisma.match.findMany({
        where: { status: "LIVE" },
        orderBy: { kickoff: "asc" },
      }),
      prisma.match.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { kickoff: "asc" },
        take: 6,
      }),
      prisma.prediction.findMany({
        where: { userId: session.userId },
      }),
      getLeaderboardData(session.userId),
    ]);

  const predMap = new Map(predictions.map((p) => [p.matchId, p]));

  const upcomingWithPreds = upcomingMatches.map((m) => ({
    ...m,
    userPrediction: predMap.get(m.id) ?? null,
  }));

  const liveWithPreds = liveMatches.map((m) => ({
    ...m,
    userPrediction: predMap.get(m.id) ?? null,
  }));

  const unpredictedUpcoming = upcomingWithPreds.filter(
    (m) => !m.userPrediction
  ).length;

  const hasLive = liveMatches.length > 0;

  return (
    <PageWrapper>
      <AutoRefresh intervalMs={hasLive ? 30_000 : 60_000} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">⚽ KickPick</h1>
            <p className="text-xs text-muted-foreground">
              Pick your result before the kick-off.
            </p>
          </div>
          <Link
            href={`/players/${session.userId}`}
            className="text-xs text-primary"
          >
            My stats →
          </Link>
        </div>

        {/* Live matches */}
        {liveMatches.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-semibold">Live Now</h2>
            </div>
            <div className="space-y-2">
              {liveWithPreds.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={m.userPrediction}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming + to predict */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming Matches</h2>
            {unpredictedUpcoming > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {unpredictedUpcoming} to predict
              </span>
            )}
          </div>
          {upcomingWithPreds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming matches
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingWithPreds.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={m.userPrediction}
                />
              ))}
            </div>
          )}
          <Link
            href="/matches"
            className="block text-center text-sm text-primary py-2"
          >
            View all matches →
          </Link>
        </section>

        {/* Mini leaderboard */}
        <MiniLeaderboard users={leaderboard} currentUserId={session.userId} />
      </div>
    </PageWrapper>
  );
}
