import Link from "next/link";
import * as CountryFlags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";
import { getLockTime } from "@/lib/scoring";
import { TEAM_TO_FLAG_CODE, formatGroupName, STAGE_LABELS } from "@/lib/constants";
import type { Match, Prediction } from "@prisma/client";
import { Lock, CheckCircle2, Clock3, Zap } from "lucide-react";
import type { ApiGoal } from "@/lib/football-api";

type FlagKey = keyof typeof CountryFlags;

function Flag({ team, size = "md" }: { team: string; size?: "sm" | "md" | "lg" }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const FlagComponent = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;

  const sizeClass =
    size === "sm" ? "w-6 h-[18px]" :
    size === "lg" ? "w-10 h-[30px]" :
    "w-8 h-6";

  return (
    <span className={cn(sizeClass, "flex-shrink-0 rounded-md overflow-hidden shadow-sm inline-block")}>
      {FlagComponent ? (
        <FlagComponent className="w-full h-full" />
      ) : (
        <span className="w-full h-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
          {team.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function formatTime(kickoff: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(kickoff));
}

function formatDate(kickoff: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(kickoff));
}

function PredictionBadge({ prediction, isLocked, isFinished }: {
  prediction: Prediction | null | undefined;
  isLocked: boolean;
  isFinished: boolean;
}) {
  if ((isFinished || isLocked) && !prediction) {
    return <span className="text-xs text-muted-foreground/60">No prediction</span>;
  }
  if (!prediction) {
    return <span className="text-xs font-semibold text-primary">Tap to predict →</span>;
  }

  const hasScore = prediction.homeScore !== null && prediction.awayScore !== null;
  const predText = hasScore
    ? `${prediction.homeScore} – ${prediction.awayScore}`
    : prediction.predictedWinner === "home" ? "Home win"
    : prediction.predictedWinner === "away" ? "Away win"
    : "Draw";

  if (prediction.points !== null) {
    const pts = prediction.points;
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
        pts === 6 || pts === 7 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
        pts === 4 || pts === 5 ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
        pts === 2 || pts === 3 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
        "bg-red-500/10 text-red-600 dark:text-red-400"
      )}>
        <CheckCircle2 className="h-3 w-3" />
        {predText} · {pts}pts
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="h-3 w-3 text-primary" />
      {predText}
    </span>
  );
}

interface MatchCardProps {
  match: Match;
  prediction?: Prediction | null;
}

export default function MatchCard({ match, prediction }: MatchCardProps) {
  const lockTime = getLockTime(new Date(match.kickoff));
  const isLocked = new Date() >= lockTime;
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const showScore = isFinished || isLive;
  const label = formatGroupName(match.groupName) || STAGE_LABELS[match.stage] || match.stage;

  const predictionBg =
    prediction?.points === 6 || prediction?.points === 7 ? "bg-emerald-500/8 dark:bg-emerald-500/10 border-emerald-500/20" :
    prediction?.points === 4 || prediction?.points === 5 ? "bg-blue-500/8 dark:bg-blue-500/10 border-blue-500/20" :
    prediction?.points === 2 || prediction?.points === 3 ? "bg-amber-500/8 dark:bg-amber-500/10 border-amber-500/20" :
    prediction?.points === 0 ? "bg-red-500/5 dark:bg-red-500/8 border-red-500/15" :
    "bg-muted/30 border-border/60";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
    >
      {/* Top meta bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          )}
          {isFinished && (
            <span className="text-[10px] font-medium text-muted-foreground/60">Full Time</span>
          )}
          {!isFinished && !isLive && isLocked && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
          {!isFinished && !isLive && !isLocked && (
            <span className="flex items-center gap-1 text-[10px] text-primary/70 font-medium">
              <Zap className="h-2.5 w-2.5" />
              Open
            </span>
          )}
        </div>
      </div>

      {/* Teams + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
        {/* Home */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Flag team={match.homeTeam} size="md" />
          <span className="text-sm font-semibold leading-tight truncate">
            {match.homeTeam}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center gap-0.5 min-w-[68px]">
          {showScore ? (
            <span className={cn(
              "text-2xl font-bold tabular-nums tracking-tight leading-none",
              isLive ? "text-red-500" : "text-foreground"
            )}>
              {match.homeScore ?? 0}&thinsp;–&thinsp;{match.awayScore ?? 0}
            </span>
          ) : (
            <>
              <span className="text-base font-bold tabular-nums text-foreground">
                {formatTime(new Date(match.kickoff))}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                <Clock3 className="h-2.5 w-2.5" />
                {formatDate(new Date(match.kickoff))}
              </span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2.5 justify-end min-w-0">
          <span className="text-sm font-semibold leading-tight truncate text-right">
            {match.awayTeam}
          </span>
          <Flag team={match.awayTeam} size="md" />
        </div>
      </div>

      {/* Goal scorers (finished matches only) */}
      {isFinished && Array.isArray(match.goals) && (match.goals as unknown as ApiGoal[]).length > 0 && (
        <div className="grid grid-cols-2 gap-x-2 px-4 pb-2 text-[11px] text-muted-foreground leading-relaxed">
          <div className="space-y-0">
            {(match.goals as unknown as ApiGoal[])
              .filter((g) => g.type !== "OWN_GOAL" ? g.team.name === match.homeTeam : g.team.name !== match.homeTeam)
              .map((g, i) => (
                <div key={i}>
                  {g.type === "PENALTY" ? "⚽ P" : g.type === "OWN_GOAL" ? "⚽ OG" : "⚽"}{" "}
                  {g.scorer.name.split(" ").at(-1)}{" "}
                  {g.minute != null ? `${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}'` : ""}
                </div>
              ))}
          </div>
          <div className="space-y-0 text-right">
            {(match.goals as unknown as ApiGoal[])
              .filter((g) => g.type !== "OWN_GOAL" ? g.team.name === match.awayTeam : g.team.name !== match.awayTeam)
              .map((g, i) => (
                <div key={i}>
                  {g.scorer.name.split(" ").at(-1)}{" "}
                  {g.minute != null ? `${g.minute}${g.injuryTime ? `+${g.injuryTime}` : ""}'` : ""}{" "}
                  {g.type === "PENALTY" ? "P ⚽" : g.type === "OWN_GOAL" ? "OG ⚽" : "⚽"}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Prediction footer */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 border-t",
        predictionBg
      )}>
        <PredictionBadge prediction={prediction} isLocked={isLocked} isFinished={isFinished} />
        {!isLocked && !isFinished && prediction && (
          <span className="text-[10px] text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
            Update →
          </span>
        )}
      </div>
    </Link>
  );
}
