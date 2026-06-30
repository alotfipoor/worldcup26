import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import TournamentForm from "@/components/tournament/TournamentForm";
import TournamentStatsCharts from "@/components/tournament/TournamentStatsCharts";
import { prisma } from "@/lib/prisma";
import { getTournamentWindow, isTournamentLocked, getTournamentStats } from "@/lib/tournament";

export const revalidate = 0;

export default async function TournamentPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [window, locked] = await Promise.all([
    getTournamentWindow(),
    isTournamentLocked(),
  ]);

  const [initial, postGroup, stats] = await Promise.all([
    prisma.tournamentPrediction.findUnique({
      where: { userId_window: { userId: session.userId, window: "INITIAL" } },
    }),
    prisma.tournamentPrediction.findUnique({
      where: { userId_window: { userId: session.userId, window: "POST_GROUP" } },
    }),
    locked ? getTournamentStats() : Promise.resolve(null),
  ]);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Tournament Predictions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Champion: 15 pts · Top scorer, assists &amp; goalkeeper: 10 pts each
          </p>
        </div>

        {window === "POST_GROUP" && !locked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <strong>Group stage is over!</strong> Update your prediction before it locks at 18:00 BST today.
          </div>
        )}

        {locked && (
          <div className="bg-muted/50 border border-border rounded-xl p-3 text-sm text-muted-foreground">
            Tournament predictions are locked — knockout rounds have started.
          </div>
        )}

        <TournamentForm
          window={window}
          locked={locked}
          initialPrediction={initial}
          postGroupPrediction={postGroup}
        />

        {stats && (
          <TournamentStatsCharts
            totalRespondents={stats.totalRespondents}
            champion={stats.champion}
            topScorer={stats.topScorer}
            topAssist={stats.topAssist}
            bestGoalkeeper={stats.bestGoalkeeper}
            currentUserId={session.userId}
          />
        )}
      </div>
    </PageWrapper>
  );
}
