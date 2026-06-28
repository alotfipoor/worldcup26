import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import TournamentForm from "@/components/tournament/TournamentForm";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

async function getTournamentWindow(): Promise<"INITIAL" | "POST_GROUP"> {
  const pendingGroup = await prisma.match.count({
    where: { stage: "GROUP", status: { not: "FINISHED" } },
  });
  return pendingGroup === 0 ? "POST_GROUP" : "INITIAL";
}

async function isTournamentLocked(): Promise<boolean> {
  if (new Date() < new Date("2026-06-29T17:00:00Z")) return false;
  const r16 = await prisma.match.count({
    where: {
      stage: { in: ["ROUND_OF_32", "ROUND_OF_16"] },
      status: { in: ["LIVE", "FINISHED"] },
    },
  });
  return r16 > 0;
}

export default async function TournamentPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [window, locked] = await Promise.all([
    getTournamentWindow(),
    isTournamentLocked(),
  ]);

  const [initial, postGroup] = await Promise.all([
    prisma.tournamentPrediction.findUnique({
      where: { userId_window: { userId: session.userId, window: "INITIAL" } },
    }),
    prisma.tournamentPrediction.findUnique({
      where: { userId_window: { userId: session.userId, window: "POST_GROUP" } },
    }),
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
            <strong>Group stage is over!</strong> Update your prediction before it locks at 18:00 BST tomorrow.
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
      </div>
    </PageWrapper>
  );
}
