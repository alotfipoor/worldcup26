import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import PredictionForm from "@/components/matches/PredictionForm";
import PredictionReveal from "@/components/matches/PredictionReveal";
import { STAGE_LABELS, TEAM_TO_FLAG_CODE, formatGroupName } from "@/lib/constants";
import { getLockTime } from "@/lib/scoring";
import { Lock } from "lucide-react";
import * as CountryFlags from "country-flag-icons/react/3x2";
import type { ApiGoal } from "@/lib/football-api";

type FlagKey = keyof typeof CountryFlags;

function Flag({ team }: { team: string }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const FlagComponent = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;

  return (
    <span className="w-14 h-10 rounded-lg overflow-hidden shadow inline-block flex-shrink-0">
      {FlagComponent ? (
        <FlagComponent className="w-full h-full" />
      ) : (
        <span className="w-full h-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {team.slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function formatMatchDate(kickoff: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(kickoff));
}

function GoalScorers({
  goals,
  homeTeam,
  awayTeam,
}: {
  goals: ApiGoal[];
  homeTeam: string;
  awayTeam: string;
}) {
  const homeGoals = goals.filter(
    (g) => g.type !== "OWN_GOAL" ? g.team.name === homeTeam : g.team.name !== homeTeam
  );
  const awayGoals = goals.filter(
    (g) => g.type !== "OWN_GOAL" ? g.team.name === awayTeam : g.team.name !== awayTeam
  );

  function GoalLine({ goal }: { goal: ApiGoal }) {
    const minute = goal.minute != null
      ? `${goal.minute}${goal.injuryTime ? `+${goal.injuryTime}` : ""}'`
      : "";
    const label =
      goal.type === "PENALTY" ? "⚽ P" :
      goal.type === "OWN_GOAL" ? "⚽ OG" :
      "⚽";
    return (
      <span className="text-xs text-muted-foreground">
        {label} {goal.scorer.name} {minute}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <div className="space-y-0.5">
        {homeGoals.map((g, i) => <GoalLine key={i} goal={g} />)}
      </div>
      <div className="space-y-0.5 text-right">
        {awayGoals.map((g, i) => <GoalLine key={i} goal={g} />)}
      </div>
    </div>
  );
}

export const revalidate = 30;

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) notFound();

  const lockTime = getLockTime(new Date(match.kickoff));
  const isLocked = new Date() >= lockTime;
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const isKnockout = match.stage !== "GROUP";

  const [prediction, allPredictions] = await Promise.all([
    prisma.prediction.findUnique({
      where: { userId_matchId: { userId: session.userId, matchId: id } },
    }),
    isLocked
      ? prisma.prediction.findMany({
          where: {
            matchId: id,
            ...(isFinished ? { points: { not: null } } : {}),
          },
          include: { user: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const revealData = allPredictions.map((p) => ({
    userId: p.userId,
    userName: p.user.name ?? "Unknown",
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    predictedWinner: p.predictedWinner,
    points: p.points ?? 0,
    reason: p.reason,
  }));

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;
  const groupLabel = formatGroupName(match.groupName);
  const label = groupLabel ? `${stageLabel} · ${groupLabel}` : stageLabel;

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Match header */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatMatchDate(new Date(match.kickoff))}
          </p>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-2 flex-1">
            <Flag team={match.homeTeam} />
            <span className="text-sm font-semibold text-center">{match.homeTeam}</span>
          </div>

          <div className="flex flex-col items-center gap-1 flex-shrink-0 w-24">
            {isFinished || isLive ? (
              <>
                <span className={`text-3xl font-bold tabular-nums ${isLive ? "text-red-500" : ""}`}>
                  {match.homeScore ?? "–"} : {match.awayScore ?? "–"}
                </span>
                {isLive && (
                  <span className="text-[10px] text-red-500 font-bold animate-pulse uppercase">
                    Live
                  </span>
                )}
                {isFinished && (
                  <span className="text-[10px] text-muted-foreground">FT</span>
                )}
              </>
            ) : (
              <span className="text-lg font-bold text-muted-foreground">vs</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <Flag team={match.awayTeam} />
            <span className="text-sm font-semibold text-center">{match.awayTeam}</span>
          </div>
        </div>

        {/* Goal scorers */}
        {isFinished && Array.isArray(match.goals) && (match.goals as unknown as ApiGoal[]).length > 0 && (
          <GoalScorers goals={match.goals as unknown as ApiGoal[]} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Prediction section */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">Your Prediction</h2>

          {isLocked ? (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Predictions locked</span>
              </div>
              {prediction ? (
                <div className="text-sm">
                  {prediction.homeScore !== null ? (
                    <span>
                      Your pick:{" "}
                      <strong>
                        {match.homeTeam} {prediction.homeScore} – {prediction.awayScore}{" "}
                        {match.awayTeam}
                      </strong>
                    </span>
                  ) : (
                    <span>
                      Your pick:{" "}
                      <strong>
                        {prediction.predictedWinner === "home"
                          ? match.homeTeam
                          : prediction.predictedWinner === "away"
                          ? match.awayTeam
                          : "Draw"}{" "}
                        wins
                      </strong>
                    </span>
                  )}
                  {prediction.points !== null && (
                    <span className="ml-2 font-bold text-primary">
                      → {prediction.points} pts
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You did not predict this match.
                </p>
              )}
            </div>
          ) : (
            <PredictionForm
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              isKnockout={isKnockout}
              lockTime={lockTime}
              initialPrediction={
                prediction
                  ? {
                      homeScore: prediction.homeScore,
                      awayScore: prediction.awayScore,
                      predictedWinner: prediction.predictedWinner,
                    }
                  : null
              }
            />
          )}
        </div>

        {isLocked && revealData.length > 0 && (
          <>
            <div className="border-t border-border" />
            <PredictionReveal
              predictions={revealData}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              currentUserId={session.userId}
              showPoints={isFinished}
            />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
