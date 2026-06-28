import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import type { Stage, MatchStatus } from "@prisma/client";
import { calculateMatchPoints } from "./scoring";
import {
  fetchAllMatches,
  fetchMatch,
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

export async function syncMatches(): Promise<{ synced: number; scored: number }> {
  const apiMatches = await fetchAllMatches();

  // Pre-load which finished matches already have goals so we don't re-fetch them
  const finishedInDb = await prisma.match.findMany({
    where: { status: "FINISHED" },
    select: { externalId: true, goals: true },
  });
  const externalIdsWithGoals = new Set(
    finishedInDb
      .filter((m) => Array.isArray(m.goals) && (m.goals as unknown[]).length > 0)
      .map((m) => m.externalId)
  );

  let synced = 0;

  for (const m of apiMatches) {
    // Skip placeholder matches where teams aren't determined yet
    if (!m.homeTeam?.name || !m.awayTeam?.name) continue;

    const stage = mapApiStage(m.stage) as Stage;
    let status = mapApiStatus(m.status) as MatchStatus;
    // Use extraTime score for ET/penalty matches so draws-after-penalties score correctly
    const et = m.score.extraTime;
    const usesExtraTime = et && (et.home !== null || et.away !== null);
    let homeScore = usesExtraTime ? et.home : m.score.fullTime.home;
    let awayScore = usesExtraTime ? et.away : m.score.fullTime.away;
    let goals = m.goals;

    // The competition list endpoint never includes the goals array, and
    // sometimes marks a match FINISHED before populating fullTime scores.
    // Fetch the individual endpoint when: scores are missing, OR the match
    // is finished but we haven't stored goals for it yet.
    const needsDetail =
      status === "FINISHED" &&
      (homeScore === null || awayScore === null || !externalIdsWithGoals.has(m.id));

    if (needsDetail) {
      try {
        const detail = await fetchMatch(m.id);
        homeScore = detail.score.fullTime.home;
        awayScore = detail.score.fullTime.away;
        status = mapApiStatus(detail.status) as MatchStatus;
        if (detail.goals?.length) goals = detail.goals;
      } catch {
        // keep whatever the list endpoint returned
      }
    }

    const goalsJson: Prisma.InputJsonArray | undefined =
      goals && goals.length > 0
        ? (goals as unknown as Prisma.InputJsonArray)
        : undefined;

    // For updates, never overwrite an existing score with null — if the API
    // temporarily returns null for a finished match, keep what's in the DB.
    const scoreForCreate = status === "FINISHED" ? homeScore : null;
    const scoreUpdate =
      status !== "FINISHED"
        ? { homeScore: null, awayScore: null }
        : {
            ...(homeScore !== null ? { homeScore } : {}),
            ...(awayScore !== null ? { awayScore } : {}),
          };

    await prisma.match.upsert({
      where: { externalId: m.id },
      create: {
        externalId: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: scoreForCreate,
        awayScore: status === "FINISHED" ? awayScore : null,
        status,
        kickoff: new Date(m.utcDate),
        stage,
        groupName: m.group ?? null,
        syncedAt: new Date(),
        goals: goalsJson ?? ([] as unknown as Prisma.InputJsonArray),
      },
      update: {
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        ...scoreUpdate,
        status,
        kickoff: new Date(m.utcDate),
        stage,
        groupName: m.group ?? null,
        syncedAt: new Date(),
        ...(goalsJson !== undefined ? { goals: goalsJson } : {}),
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
        stage: match.stage,
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
