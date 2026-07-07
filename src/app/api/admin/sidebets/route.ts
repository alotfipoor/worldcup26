import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { question, answerType, options, closesAt, pointsReward, maxPicks } = body;

  if (!question?.trim() || !closesAt) {
    return NextResponse.json({ error: "question and closesAt are required" }, { status: 400 });
  }

  const resolvedType = answerType === "CHOICE" || answerType === "MULTI_CHOICE" ? answerType : "TEXT";
  const hasOptions = resolvedType !== "TEXT" && Array.isArray(options);

  const bet = await prisma.sideBet.create({
    data: {
      question: question.trim(),
      answerType: resolvedType,
      options: hasOptions ? options : undefined,
      maxPicks: resolvedType === "MULTI_CHOICE" && typeof maxPicks === "number" ? maxPicks : undefined,
      closesAt: new Date(closesAt),
      pointsReward: typeof pointsReward === "number" ? pointsReward : 10,
    },
  });

  return NextResponse.json({ bet }, { status: 201 });
}
