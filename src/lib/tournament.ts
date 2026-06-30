import { prisma } from "@/lib/prisma";

export type TournamentWindow = "INITIAL" | "POST_GROUP";

export async function getTournamentWindow(): Promise<TournamentWindow> {
  const pendingGroup = await prisma.match.count({
    where: { stage: "GROUP", status: { not: "FINISHED" } },
  });
  return pendingGroup === 0 ? "POST_GROUP" : "INITIAL";
}

export async function isTournamentLocked(): Promise<boolean> {
  // Extended deadline: keep unlocked until 2026-06-30 18:00 BST (17:00 UTC)
  if (new Date() < new Date("2026-06-30T17:00:00Z")) return false;
  const r16 = await prisma.match.count({
    where: {
      stage: { in: ["ROUND_OF_32", "ROUND_OF_16"] },
      status: { in: ["LIVE", "FINISHED"] },
    },
  });
  return r16 > 0;
}

export interface TournamentVoteGroup {
  label: string;
  count: number;
  voters: { userId: string; userName: string }[];
}

export interface TournamentStats {
  totalRespondents: number;
  champion: TournamentVoteGroup[];
  topScorer: TournamentVoteGroup[];
  topAssist: TournamentVoteGroup[];
  bestGoalkeeper: TournamentVoteGroup[];
}

type Field = "champion" | "topScorer" | "topAssist" | "bestGoalkeeper";

export async function getTournamentStats(): Promise<TournamentStats> {
  const predictions = await prisma.tournamentPrediction.findMany({
    include: { user: { select: { id: true, name: true } } },
  });

  // One row per user: POST_GROUP if they have one, else their INITIAL pick.
  const latestByUser = new Map<string, (typeof predictions)[number]>();
  for (const p of predictions.filter((p) => p.window === "INITIAL")) {
    latestByUser.set(p.userId, p);
  }
  for (const p of predictions.filter((p) => p.window === "POST_GROUP")) {
    latestByUser.set(p.userId, p);
  }
  const rows = [...latestByUser.values()];

  function groupField(field: Field): TournamentVoteGroup[] {
    const groups = new Map<string, TournamentVoteGroup>();
    for (const row of rows) {
      const raw = row[field];
      if (!raw || !raw.trim()) continue;
      const key = raw.trim().toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
        existing.voters.push({ userId: row.userId, userName: row.user.name ?? "Unknown" });
      } else {
        groups.set(key, {
          label: raw.trim(),
          count: 1,
          voters: [{ userId: row.userId, userName: row.user.name ?? "Unknown" }],
        });
      }
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }

  return {
    totalRespondents: rows.length,
    champion: groupField("champion"),
    topScorer: groupField("topScorer"),
    topAssist: groupField("topAssist"),
    bestGoalkeeper: groupField("bestGoalkeeper"),
  };
}
