import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isPredictionLocked } from "@/lib/scoring";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;

  const prediction = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: session.userId, matchId } },
  });

  return NextResponse.json({ prediction });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (isPredictionLocked(match.kickoff)) {
    return NextResponse.json({ error: "Predictions are locked for this match" }, { status: 423 });
  }

  const body = await req.json();
  const { homeScore, awayScore } = body;

  if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
    return NextResponse.json({ error: "Provide home and away scores" }, { status: 400 });
  }

  const h = parseInt(homeScore);
  const a = parseInt(awayScore);
  if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const derivedWinner = h > a ? "home" : a > h ? "away" : "draw";

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.userId, matchId } },
    create: {
      userId: session.userId,
      matchId,
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
    },
    update: {
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
      points: null,
      reason: null,
    },
  });

  return NextResponse.json({ prediction });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (isPredictionLocked(match.kickoff)) {
    return NextResponse.json({ error: "Locked" }, { status: 423 });
  }

  await prisma.prediction
    .delete({
      where: { userId_matchId: { userId: session.userId, matchId } },
    })
    .catch(() => {});

  return NextResponse.json({ status: "ok" });
}
