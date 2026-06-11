import { prisma } from "@/lib/prisma";
import type { TimelineData } from "@/app/api/stats/timeline/route";

export async function getTimelineData(): Promise<TimelineData> {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      predictions: { some: { points: { not: null } } },
    },
    select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
    orderBy: { kickoff: "asc" },
  });

  if (matches.length === 0) return { matches: [], players: [] };

  const users = await prisma.user.findMany({
    where: { role: "USER", activatedAt: { not: null } },
    select: {
      id: true,
      name: true,
      predictions: {
        where: { points: { not: null }, matchId: { in: matches.map((m) => m.id) } },
        select: { matchId: true, points: true },
      },
    },
  });

  const matchList = matches.map((m) => ({
    id: m.id,
    label: `${m.homeTeam} v ${m.awayTeam}`,
    kickoff: m.kickoff.toISOString(),
  }));

  const players = users.map((user) => {
    const ptMap = new Map(user.predictions.map((p) => [p.matchId, p.points ?? 0]));
    let cum = 0;
    return {
      id: user.id,
      name: user.name ?? "Unknown",
      cumulative: matches.map((m) => {
        cum += ptMap.get(m.id) ?? 0;
        return cum;
      }),
    };
  });

  return { matches: matchList, players };
}
