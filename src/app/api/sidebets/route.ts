import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { SideBetItem } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bets = await prisma.sideBet.findMany({
    orderBy: { closesAt: "asc" },
    include: {
      predictions: {
        select: { userId: true, answer: true, pointsAwarded: true },
      },
    },
  });

  const items: SideBetItem[] = bets.map((bet) => {
    const myPred = bet.predictions.find((p) => p.userId === session.userId);
    return {
      id: bet.id,
      question: bet.question,
      answerType: bet.answerType,
      options: bet.options as string[] | null,
      closesAt: bet.closesAt.toISOString(),
      correctAnswer: bet.correctAnswer,
      pointsReward: bet.pointsReward,
      resolved: bet.resolved,
      createdAt: bet.createdAt.toISOString(),
      myAnswer: myPred?.answer ?? null,
      myPointsAwarded: myPred?.pointsAwarded ?? null,
      predictionCount: bet.predictions.length,
    };
  });

  return NextResponse.json({ bets: items });
}
