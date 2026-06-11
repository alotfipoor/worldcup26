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
  const { homeScore, awayScore, predictedWinner } = body;

  const hasScores =
    homeScore !== undefined &&
    homeScore !== null &&
    awayScore !== undefined &&
    awayScore !== null;

  const hasWinner = predictedWinner !== undefined && predictedWinner !== null;

  if (!hasScores && !hasWinner) {
    return NextResponse.json({ error: "Provide scores or a winner" }, { status: 400 });
  }

  if (hasScores) {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
      return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
    }
  }

  if (hasWinner && !["home", "away", "draw"].includes(predictedWinner)) {
    return NextResponse.json({ error: "Invalid winner" }, { status: 400 });
  }

  const isKnockout = match.stage !== "GROUP";
  if (hasWinner && predictedWinner === "draw" && isKnockout) {
    return NextResponse.json(
      { error: "No draws in knockout rounds" },
      { status: 400 }
    );
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.userId, matchId } },
    create: {
      userId: session.userId,
      matchId,
      homeScore: hasScores ? parseInt(homeScore) : null,
      awayScore: hasScores ? parseInt(awayScore) : null,
      predictedWinner: hasScores ? null : predictedWinner,
    },
    update: {
      homeScore: hasScores ? parseInt(homeScore) : null,
      awayScore: hasScores ? parseInt(awayScore) : null,
      predictedWinner: hasScores ? null : predictedWinner,
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
