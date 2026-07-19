import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const champion = String(body?.champion ?? "").trim();
  const topScorer = String(body?.topScorer ?? "").trim();
  const topAssist = String(body?.topAssist ?? "").trim();
  const bestGoalkeeper = String(body?.bestGoalkeeper ?? "").trim();

  const data = {
    champion: champion || null,
    topScorer: topScorer || null,
    topAssist: topAssist || null,
    bestGoalkeeper: bestGoalkeeper || null,
  };

  const result = await prisma.actualTournamentResult.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json({ result });
}
