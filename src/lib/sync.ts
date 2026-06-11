import { prisma } from "./prisma";
import {
  fetchAllMatches,
  mapApiStage,
  mapApiStatus,
} from "./football-api";

/**
 * Trigger a sync in the background if data is stale (>3 min since last sync
 * and there are live or recently-started matches). Fire-and-forget — never
 * awaited, never throws into the caller.
 */
export function maybeTriggerBackgroundSync() {
  const secret = process.env.SYNC_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || !appUrl) return;

  prisma.match
    .findFirst({ orderBy: { syncedAt: "desc" }, select: { syncedAt: true } })
    .then((last) => {
      const staleMs = 3 * 60 * 1000;
      const age = last?.syncedAt ? Date.now() - last.syncedAt.getTime() : Infinity;
      if (age < staleMs) return;
      const base = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
      fetch(`${base}/api/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => {});
    })
    .catch(() => {});
}
import { calculateMatchPoints } from "./scoring";
import type { Stage, MatchStatus } from "@prisma/client";

export async function syncMatches(): Promise<{ synced: number; scored: number }> {
  const apiMatches = await fetchAllMatches();
  let synced = 0;

  for (const m of apiMatches) {
    // Skip placeholder matches where teams aren't determined yet
    if (!m.homeTeam?.name || !m.awayTeam?.name) continue;

    const stage = mapApiStage(m.stage) as Stage;
    const status = mapApiStatus(m.status) as MatchStatus;
    const homeScore = m.score.fullTime.home;
    const awayScore = m.score.fullTime.away;

    await prisma.match.upsert({
      where: { externalId: m.id },
      create: {
        externalId: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: status === "FINISHED" ? homeScore : null,
        awayScore: status === "FINISHED" ? awayScore : null,
        status,
        kickoff: new Date(m.utcDate),
        stage,
        groupName: m.group ?? null,
        syncedAt: new Date(),
      },
      update: {
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: status === "FINISHED" ? homeScore : null,
        awayScore: status === "FINISHED" ? awayScore : null,
        status,
        kickoff: new Date(m.utcDate),
        stage,
        groupName: m.group ?? null,
        syncedAt: new Date(),
      },
    });
    synced++;
  }

  const scored = await scoreUnscoredPredictions();
  return { synced, scored };
}

export async function scoreUnscoredPredictions(): Promise<number> {
  const finishedMatches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: {
        some: { points: null },
      },
    },
    include: {
      predictions: { where: { points: null } },
    },
  });

  let scored = 0;

  for (const match of finishedMatches) {
    for (const prediction of match.predictions) {
      const result = calculateMatchPoints(prediction, {
        homeScore: match.homeScore!,
        awayScore: match.awayScore!,
      });

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { points: result.points, reason: result.reason },
      });
      scored++;
    }
  }

  return scored;
}
