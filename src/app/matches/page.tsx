import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import MatchCard from "@/components/matches/MatchCard";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import type { Match, Prediction } from "@prisma/client";

export const revalidate = 60;

function groupByStage(
  matches: (Match & { userPrediction: Prediction | null })[]
) {
  const groups: Record<string, (Match & { userPrediction: Prediction | null })[]> = {};

  for (const match of matches) {
    const stage = match.stage;
    if (!groups[stage]) groups[stage] = [];
    groups[stage].push(match);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99))
    .map(([stage, stageMatches]) => ({
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      matches: stageMatches.sort(
        (a, b) =>
          new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      ),
    }));
}

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [matches, predictions] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.prediction.findMany({
      where: { userId: session.userId },
    }),
  ]);

  const predMap = new Map(predictions.map((p) => [p.matchId, p]));

  const matchesWithPreds = matches.map((m) => ({
    ...m,
    userPrediction: predMap.get(m.id) ?? null,
  }));

  const groups = groupByStage(matchesWithPreds);

  return (
    <PageWrapper>
      <h1 className="text-xl font-bold mb-4">Matches</h1>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📅</p>
          <p>Matches will appear here once synced</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ stage, label, matches: stageMatches }) => {
            const unpredicted = stageMatches.filter(
              (m) => !m.userPrediction && m.status === "SCHEDULED"
            ).length;

            return (
              <section key={stage}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </h2>
                  {unpredicted > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {unpredicted} to predict
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {stageMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={match.userPrediction}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
