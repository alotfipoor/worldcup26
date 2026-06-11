import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import MatchCard from "@/components/matches/MatchCard";
import { STAGE_LABELS } from "@/lib/constants";

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

  const scoredPredictions = player.predictions.filter(
    (p) => p.points !== null
  );
  const totalPoints = scoredPredictions.reduce(
    (sum, p) => sum + (p.points ?? 0),
    0
  );

  const exactCount = scoredPredictions.filter(
    (p) => p.reason === "exact_score"
  ).length;
  const winnerGoalsCount = scoredPredictions.filter(
    (p) => p.reason === "correct_winner_with_goals"
  ).length;
  const winnerOnlyCount = scoredPredictions.filter(
    (p) => p.reason === "correct_winner_only"
  ).length;

  const latestTournament =
    player.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
    player.tournamentPredictions.find((t) => t.window === "INITIAL");

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto">
            {player.name?.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold">
            {player.name}
            {isMe && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (you)
              </span>
            )}
          </h1>
          <p className="text-2xl font-bold">
            {totalPoints}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              pts
            </span>
          </p>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Exact" value={exactCount} pts={6} color="green" />
          <StatBox label="Winner" value={winnerGoalsCount} pts={4} color="blue" />
          <StatBox label="Picked" value={winnerOnlyCount} pts={2} color="yellow" />
        </div>

        {/* Tournament prediction (visible to everyone since it's after locking) */}
        {latestTournament && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tournament prediction
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Champion</span>
              <span className="font-medium">
                {latestTournament.champion ?? "–"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Top scorer</span>
              <span className="font-medium">
                {latestTournament.topScorer ?? "–"}
              </span>
            </div>
          </div>
        )}

        {/* Match history (only own predictions show full detail) */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">
            {isMe ? "Your predictions" : "Scored matches"}
          </h2>

          {isMe ? (
            <div className="space-y-2">
              {player.predictions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No predictions yet
                </p>
              ) : (
                player.predictions.map((pred) => (
                  <MatchCard
                    key={pred.matchId}
                    match={pred.match}
                    prediction={pred}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {scoredPredictions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scored matches yet
                </p>
              ) : (
                scoredPredictions.map((pred) => (
                  <div
                    key={pred.matchId}
                    className="bg-card rounded-xl border border-border p-3 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <span className="font-medium">
                        {pred.match.homeTeam} vs {pred.match.awayTeam}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {STAGE_LABELS[pred.match.stage] ?? pred.match.stage}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        pred.points === 6
                          ? "text-green-700"
                          : pred.points === 4
                          ? "text-blue-700"
                          : pred.points === 2
                          ? "text-yellow-700"
                          : "text-red-700"
                      }`}
                    >
                      {pred.points}pts
                    </span>
                  </div>
                ))
              )}
            </div>
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
  color: "green" | "blue" | "yellow";
}) {
  const colorMap = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div
      className={`rounded-xl p-3 text-center space-y-0.5 ${colorMap[color]}`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
      <p className="text-[10px] opacity-70">{pts}pt each</p>
    </div>
  );
}
