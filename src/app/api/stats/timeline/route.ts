import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface TimelineMatch {
  id: string;
  label: string;
  kickoff: string;
}

export interface TimelinePlayer {
  id: string;
  name: string;
  cumulative: number[]; // cumulative[i] = total points after match[i]
}

export interface TimelineData {
  matches: TimelineMatch[];
  players: TimelinePlayer[];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // All FINISHED matches that have at least one scored prediction, sorted by kickoff
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      predictions: { some: { points: { not: null } } },
    },
    select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
    orderBy: { kickoff: "asc" },
  });

  if (matches.length === 0) {
    return NextResponse.json({ matches: [], players: [] } satisfies TimelineData);
  }

  // All activated users
  const users = await prisma.user.findMany({
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

  const matchList: TimelineMatch[] = matches.map((m) => ({
    id: m.id,
    label: `${m.homeTeam} v ${m.awayTeam}`,
    kickoff: m.kickoff.toISOString(),
  }));

  const players: TimelinePlayer[] = users.map((user) => {
    const pointsByMatch = new Map(
      user.predictions.map((p) => [p.matchId, p.points ?? 0])
    );

    let cumulative = 0;
    const data = matches.map((m) => {
      cumulative += pointsByMatch.get(m.id) ?? 0;
      return cumulative;
    });

    return {
      id: user.id,
      name: user.name ?? "Unknown",
      cumulative: data,
    };
  });

  return NextResponse.json({ matches: matchList, players } satisfies TimelineData);
}
