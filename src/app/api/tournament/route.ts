import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function getTournamentWindow(): Promise<"INITIAL" | "POST_GROUP"> {
  const pendingGroupMatches = await prisma.match.count({
    where: { stage: "GROUP", status: { not: "FINISHED" } },
  });
  return pendingGroupMatches === 0 ? "POST_GROUP" : "INITIAL";
}

async function isTournamentLocked(): Promise<boolean> {
  const r16Count = await prisma.match.count({
    where: {
      stage: { in: ["ROUND_OF_32", "ROUND_OF_16"] },
      status: { in: ["LIVE", "FINISHED"] },
    },
  });
  return r16Count > 0;
}

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
  const { champion, topScorer, topAssist } = await req.json();

  const prediction = await prisma.tournamentPrediction.upsert({
    where: { userId_window: { userId: session.userId, window } },
    create: { userId: session.userId, window, champion, topScorer, topAssist },
    update: { champion, topScorer, topAssist },
  });

  return NextResponse.json({ prediction, window });
}
