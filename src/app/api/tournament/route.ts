import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTournamentWindow, isTournamentLocked } from "@/lib/tournament";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const window = await getTournamentWindow();
  const locked = await isTournamentLocked();

  const [initial, postGroup] = await Promise.all([
    prisma.tournamentPrediction.findUnique({
      where: { userId_window: { userId: session.userId, window: "INITIAL" } },
    }),
    prisma.tournamentPrediction.findUnique({
      where: { userId_window: { userId: session.userId, window: "POST_GROUP" } },
    }),
  ]);

  return NextResponse.json({ initial, postGroup, window, locked });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locked = await isTournamentLocked();
  if (locked) {
    return NextResponse.json({ error: "Tournament predictions are locked" }, { status: 423 });
  }

  const window = await getTournamentWindow();
  const { champion, topScorer, topAssist, bestGoalkeeper } = await req.json();

  const prediction = await prisma.tournamentPrediction.upsert({
    where: { userId_window: { userId: session.userId, window } },
    create: { userId: session.userId, window, champion, topScorer, topAssist, bestGoalkeeper },
    update: { champion, topScorer, topAssist, bestGoalkeeper },
  });

  return NextResponse.json({ prediction, window });
}
