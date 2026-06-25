import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      status: true,
      kickoff: true,
      stage: true,
      groupName: true,
      aiPrediction: true,
    },
  });

  return NextResponse.json({
    matches: matches.map((m) => ({
      ...m,
      kickoff: m.kickoff.toISOString(),
      aiPrediction: m.aiPrediction
        ? {
            ...m.aiPrediction,
            generatedAt: m.aiPrediction.generatedAt.toISOString(),
            updatedAt: m.aiPrediction.updatedAt.toISOString(),
          }
        : null,
    })),
  });
}
