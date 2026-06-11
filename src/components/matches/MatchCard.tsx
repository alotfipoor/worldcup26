import Link from "next/link";
import * as CountryFlags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";
import { getLockTime } from "@/lib/scoring";
import { TEAM_TO_FLAG_CODE, formatGroupName, STAGE_LABELS } from "@/lib/constants";
import type { Match, Prediction } from "@prisma/client";
import { Lock, CheckCircle2, Clock3 } from "lucide-react";

type FlagKey = keyof typeof CountryFlags;

function Flag({ team, size = "md" }: { team: string; size?: "sm" | "md" | "lg" }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const FlagComponent = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;

  const sizeClass = size === "sm" ? "w-6 h-[18px]" : size === "lg" ? "w-10 h-[30px]" : "w-8 h-6";

  return (
    <span className={cn(sizeClass, "flex-shrink-0 rounded overflow-hidden shadow-sm inline-block")}>
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
  return new Intl.DateTimeFormat("default", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(kickoff));
}

function formatDate(kickoff: Date) {
  return new Intl.DateTimeFormat("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(kickoff));
}

function PredictionRow({ prediction, isLocked, isFinished }: {
  prediction: Prediction | null | undefined;
  isLocked: boolean;
  isFinished: boolean;
}) {
  if (isFinished && !prediction) {
    return <span className="text-xs text-muted-foreground">No prediction made</span>;
  }

  if (!prediction && isLocked) {
    return <span className="text-xs text-muted-foreground">No prediction made</span>;
  }

  if (!prediction) {
    return (
      <span className="text-xs font-semibold text-primary">
        Predict now →
      </span>
    );
  }

  const hasScore = prediction.homeScore !== null && prediction.awayScore !== null;
  const predText = hasScore
    ? `${prediction.homeScore} – ${prediction.awayScore}`
    : prediction.predictedWinner === "home"
    ? "Home win"
    : prediction.predictedWinner === "away"
    ? "Away win"
    : "Draw";

  if (prediction.points !== null) {
    const pts = prediction.points;
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full",
        pts === 6 ? "bg-green-100 text-green-700" :
        pts === 4 ? "bg-blue-100 text-blue-700" :
        pts === 2 ? "bg-amber-100 text-amber-700" :
        "bg-red-100 text-red-700"
      )}>
        <CheckCircle2 className="h-3 w-3" />
        {predText} · {pts} pts
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

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-red-500 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          )}
          {isFinished && (
            <span className="text-[11px] font-medium text-muted-foreground">Full Time</span>
          )}
          {!isFinished && !isLive && isLocked && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>
      </div>

      {/* Teams + Score row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
        {/* Home team */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Flag team={match.homeTeam} size="md" />
          <span className="text-sm font-semibold leading-tight min-w-0 truncate">
            {match.homeTeam}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
          {showScore ? (
            <span className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              isLive ? "text-red-500" : "text-foreground"
            )}>
              {match.homeScore ?? 0}&thinsp;–&thinsp;{match.awayScore ?? 0}
            </span>
          ) : (
            <>
              <span className="text-base font-bold tabular-nums text-foreground">
                {formatTime(new Date(match.kickoff))}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock3 className="h-2.5 w-2.5" />
                {formatDate(new Date(match.kickoff))}
              </span>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2.5 justify-end min-w-0">
          <span className="text-sm font-semibold leading-tight min-w-0 truncate text-right">
            {match.awayTeam}
          </span>
          <Flag team={match.awayTeam} size="md" />
        </div>
      </div>

      {/* Prediction footer */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 border-t",
        prediction?.points === 6 ? "border-green-100 bg-green-50/50" :
        prediction?.points === 4 ? "border-blue-100 bg-blue-50/50" :
        prediction?.points === 2 ? "border-amber-100 bg-amber-50/50" :
        prediction && prediction.points === 0 ? "border-red-100 bg-red-50/30" :
        "border-border bg-muted/20"
      )}>
        <PredictionRow prediction={prediction} isLocked={isLocked} isFinished={isFinished} />
        {!isLocked && !isFinished && (
          <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
            {prediction ? "Update →" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
