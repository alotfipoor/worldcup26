import { prisma } from "./prisma";
import {
  fetchAllMatches,
  mapApiStage,
  mapApiStatus,
} from "./football-api";
import { calculateMatchPoints } from "./scoring";
import type { Stage, MatchStatus } from "@prisma/client";

export async function syncMatches(): Promise<{ synced: number; scored: number }> {
  const apiMatches = await fetchAllMatches();
  let synced = 0;

  for (const m of apiMatches) {
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
