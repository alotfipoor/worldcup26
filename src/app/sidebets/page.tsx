import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import SideBetsClient from "@/components/sidebets/SideBetsClient";
import type { SideBetItem } from "@/types";

export const revalidate = 30;

export default async function SideBetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const bets = await prisma.sideBet.findMany({
    orderBy: { closesAt: "asc" },
    include: {
      predictions: {
        select: { userId: true, answer: true, pointsAwarded: true, user: { select: { name: true } } },
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
      maxPicks: bet.maxPicks,
      closesAt: bet.closesAt.toISOString(),
      correctAnswer: bet.correctAnswer,
      pointsReward: bet.pointsReward,
      resolved: bet.resolved,
      createdAt: bet.createdAt.toISOString(),
      myAnswer: myPred?.answer ?? null,
      myPointsAwarded: myPred?.pointsAwarded ?? null,
      predictionCount: bet.predictions.length,
      voters: bet.predictions.map((p) => p.user.name ?? "Unknown"),
      voterAnswers: new Date() > bet.closesAt
        ? bet.predictions.map((p) => ({ name: p.user.name ?? "Unknown", answer: p.answer }))
        : null,
    };
  });

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Side Bets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bonus questions · fixed point rewards</p>
        </div>
        <SideBetsClient bets={items} currentUserName={session.user.name ?? "Unknown"} />
      </div>
    </PageWrapper>
  );
}
