import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateSideBetPoints } from "@/lib/sidebets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const correctAnswer = (body?.correctAnswer ?? "").trim();

  if (!correctAnswer) {
    return NextResponse.json({ error: "correctAnswer is required" }, { status: 400 });
  }

  const bet = await prisma.sideBet.findUnique({
    where: { id },
    include: { predictions: true },
  });

  if (!bet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const points = (answer: string) =>
    calculateSideBetPoints(answer, correctAnswer, bet.answerType, bet.pointsReward);

  await prisma.$transaction([
    prisma.sideBet.update({
      where: { id },
      data: { correctAnswer, resolved: true },
    }),
    ...bet.predictions.map((pred) =>
      prisma.sideBetPrediction.update({
        where: { id: pred.id },
        data: { pointsAwarded: points(pred.answer) },
      })
    ),
  ]);

  const winners = bet.predictions.filter((p) => points(p.answer) > 0).length;

  return NextResponse.json({ ok: true, winners, total: bet.predictions.length });
}
