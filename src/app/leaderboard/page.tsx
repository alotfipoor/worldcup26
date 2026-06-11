import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import TimelineChart from "@/components/leaderboard/TimelineChart";
import AutoRefresh from "@/components/AutoRefresh";
import { calculateTournamentPoints } from "@/lib/scoring";
import type { LeaderboardUser, FormResult } from "@/types";
import type { TimelineData } from "@/app/api/stats/timeline/route";

export const revalidate = 30;

async function getLeaderboard(): Promise<LeaderboardUser[]> {
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

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [users, timelineData] = await Promise.all([
    getLeaderboard(),
    (async (): Promise<TimelineData> => {
      const matches = await prisma.match.findMany({
        where: {
          status: "FINISHED",
          predictions: { some: { points: { not: null } } },
        },
        select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
        orderBy: { kickoff: "asc" },
      });
      if (matches.length === 0) return { matches: [], players: [] };
      const allUsers = await prisma.user.findMany({
        where: { role: "USER", activatedAt: { not: null } },
        select: {
          id: true,
          name: true,
          predictions: {
            where: { points: { not: null } },
            select: { matchId: true, points: true },
          },
        },
      });
      const matchList = matches.map((m) => ({
        id: m.id,
        label: `${m.homeTeam} v ${m.awayTeam}`,
        kickoff: m.kickoff.toISOString(),
      }));
      const players = allUsers.map((user) => {
        const ptMap = new Map(user.predictions.map((p) => [p.matchId, p.points ?? 0]));
        let cum = 0;
        return {
          id: user.id,
          name: user.name ?? "Unknown",
          cumulative: matches.map((m) => { cum += ptMap.get(m.id) ?? 0; return cum; }),
        };
      });
      return { matches: matchList, players };
    })(),
  ]);

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
        {timelineData.matches.length >= 3 && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Points over time</h2>
            <TimelineChart data={timelineData} currentUserId={session.userId} />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
