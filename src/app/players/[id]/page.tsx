import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import MatchCard from "@/components/matches/MatchCard";
import { STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const isMe = session.userId === id;

  const player = await prisma.user.findUnique({
    where: { id },
    include: {
      predictions: {
        include: { match: true },
        orderBy: { match: { kickoff: "asc" } },
      },
      tournamentPredictions: true,
    },
  });

  if (!player || !player.activatedAt) notFound();

  const otherPlayers = await prisma.user.findMany({
    where: { role: "USER", activatedAt: { not: null }, NOT: { id } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const scoredPredictions = player.predictions.filter((p) => p.points !== null);
  const totalPoints = scoredPredictions.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const exactCount = scoredPredictions.filter((p) => p.reason === "exact_score").length;
  const winnerGoalsCount = scoredPredictions.filter((p) => p.reason === "correct_winner_goal_diff").length;
  const winnerOnlyCount = scoredPredictions.filter((p) => p.reason === "correct_winner_only").length;

  const latestTournament =
    player.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
    player.tournamentPredictions.find((t) => t.window === "INITIAL");

  const initials = player.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <PageWrapper>
      <div className="space-y-5">
        {/* Hero header */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border-2 border-primary/25 flex items-center justify-center text-xl font-bold text-primary mx-auto shadow-sm">
              {initials}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {player.name}
              {isMe && (
                <span className="text-sm font-normal text-muted-foreground ml-2">(you)</span>
              )}
            </h1>
            <p className="text-3xl font-bold tracking-tight mt-1">
              {totalPoints}
              <span className="text-base font-normal text-muted-foreground ml-1.5">pts</span>
            </p>
          </div>
        </div>

        {/* Compare with... */}
        {otherPlayers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherPlayers.map((other) => (
              <a
                key={other.id}
                href={`/compare/${id}/${other.id}`}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                vs {other.name}
              </a>
            ))}
          </div>
        )}

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Exact" value={exactCount} pts={6} color="emerald" />
          <StatBox label="Goal Diff" value={winnerGoalsCount} pts={4} color="blue" />
          <StatBox label="Winner" value={winnerOnlyCount} pts={2} color="amber" />
        </div>

        {/* Tournament prediction */}
        {latestTournament && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tournament Prediction
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
                <span className="text-muted-foreground">Champion</span>
                <span className="font-semibold">{latestTournament.champion ?? "–"}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Top scorer</span>
                <span className="font-semibold">{latestTournament.topScorer ?? "–"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Match history */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            {isMe ? "Your Predictions" : "Scored Matches"}
          </h2>

          {isMe ? (
            player.predictions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-3xl mb-2">🎯</p>
                <p className="text-sm">No predictions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {player.predictions.map((pred) => (
                  <MatchCard key={pred.matchId} match={pred.match} prediction={pred} />
                ))}
              </div>
            )
          ) : (
            scoredPredictions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">No scored matches yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scoredPredictions.map((pred) => (
                  <div
                    key={pred.matchId}
                    className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {pred.match.homeTeam} vs {pred.match.awayTeam}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {STAGE_LABELS[pred.match.stage] ?? pred.match.stage}
                      </p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold ml-3 flex-shrink-0 tabular-nums",
                      pred.points === 6 ? "text-emerald-600 dark:text-emerald-400" :
                      pred.points === 4 ? "text-blue-600 dark:text-blue-400" :
                      pred.points === 2 ? "text-amber-600 dark:text-amber-400" :
                      "text-muted-foreground"
                    )}>
                      {pred.points}pt
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function StatBox({
  label,
  value,
  pts,
  color,
}: {
  label: string;
  value: number;
  pts: number;
  color: "emerald" | "blue" | "amber";
}) {
  const styles = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    blue:    "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    amber:   "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className={cn("rounded-2xl border p-3 text-center space-y-0.5", styles[color])}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-[10px] opacity-50">{pts}pt each</p>
    </div>
  );
}
