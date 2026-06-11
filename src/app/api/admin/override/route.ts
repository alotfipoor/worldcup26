import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { scoreUnscoredPredictions } from "@/lib/sync";
import type { MatchStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, homeScore, awayScore } = await req.json();

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: parseInt(homeScore),
      awayScore: parseInt(awayScore),
      status: "FINISHED" as MatchStatus,
      syncedAt: new Date(),
    },
  });

  await prisma.prediction.updateMany({
    where: { matchId, points: { not: null } },
    data: { points: null, reason: null },
  });

  const scored = await scoreUnscoredPredictions();

  return NextResponse.json({ status: "ok", scored });
}
