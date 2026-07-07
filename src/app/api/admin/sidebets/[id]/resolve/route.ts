import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isSideBetAnswerCorrect } from "@/lib/sidebets";

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

  const isCorrect = (answer: string) => isSideBetAnswerCorrect(answer, correctAnswer, bet.answerType);

  await prisma.$transaction([
    prisma.sideBet.update({
      where: { id },
      data: { correctAnswer, resolved: true },
    }),
    ...bet.predictions.map((pred) =>
      prisma.sideBetPrediction.update({
        where: { id: pred.id },
        data: { pointsAwarded: isCorrect(pred.answer) ? bet.pointsReward : 0 },
      })
    ),
  ]);

  const winners = bet.predictions.filter((p) => isCorrect(p.answer)).length;

  return NextResponse.json({ ok: true, winners, total: bet.predictions.length });
}
