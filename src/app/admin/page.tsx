import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import AdminPanel from "@/components/admin/AdminPanel";
import { prisma } from "@/lib/prisma";
import type { SideBetItem } from "@/types";

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const [users, lastSync, matchCount, rawBets] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { predictions: true } } },
    }),
    prisma.match.findFirst({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),
    prisma.match.count(),
    prisma.sideBet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        predictions: { select: { userId: true, answer: true, pointsAwarded: true, user: { select: { name: true } } } },
      },
    }),
  ]);

  const sideBets: SideBetItem[] = rawBets.map((bet) => ({
    id: bet.id,
    question: bet.question,
    answerType: bet.answerType,
    options: bet.options as string[] | null,
    closesAt: bet.closesAt.toISOString(),
    correctAnswer: bet.correctAnswer,
    pointsReward: bet.pointsReward,
    resolved: bet.resolved,
    createdAt: bet.createdAt.toISOString(),
    myAnswer: null,
    myPointsAwarded: null,
    predictionCount: bet.predictions.length,
    voters: bet.predictions.map((p) => p.user.name ?? "Unknown"),
  }));

  return (
    <PageWrapper>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <AdminPanel
          users={users}
          lastSync={lastSync?.syncedAt ?? null}
          matchCount={matchCount}
          sideBets={sideBets}
        />
      </div>
    </PageWrapper>
  );
}
