import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isPredictionLocked } from "@/lib/scoring";
import { scoreUnscoredPredictions } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, matchId, homeScore, awayScore } = await req.json();

  if (!userId || !matchId) {
    return NextResponse.json({ error: "userId and matchId required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (!isPredictionLocked(match.kickoff)) {
    return NextResponse.json(
      { error: "Match hasn't locked yet — ask the user to submit their own prediction" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId, matchId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This user already has a prediction for this match" },
      { status: 409 }
    );
  }

  if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
    return NextResponse.json({ error: "Provide home and away scores" }, { status: 400 });
  }

  const h = parseInt(homeScore);
  const a = parseInt(awayScore);
  if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const derivedWinner = h > a ? "home" : a > h ? "away" : "draw";

  const prediction = await prisma.prediction.create({
    data: {
      userId,
      matchId,
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
      setByAdmin: true,
    },
  });

  const scored = await scoreUnscoredPredictions();

  return NextResponse.json({ prediction, scored });
}
