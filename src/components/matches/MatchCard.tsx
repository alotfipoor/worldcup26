import Link from "next/link";
import { cn } from "@/lib/utils";
import { getLockTime } from "@/lib/scoring";
import type { Match, Prediction } from "@prisma/client";
import { TEAM_TO_FLAG_CODE } from "@/lib/constants";
import { CheckCircle2, Clock, Lock } from "lucide-react";

interface MatchCardProps {
  match: Match;
  prediction?: Prediction | null;
  currentUserId?: string;
}

const SIZE_W = 24;
const SIZE_H = 17;

function Flag({ team }: { team: string }) {
  const code = TEAM_TO_FLAG_CODE[team];
  if (!code) return <span className="w-6 h-4 bg-muted rounded-sm inline-block" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${SIZE_W}x${SIZE_H}/${code.toLowerCase().replace("gb-eng", "gb")}.png`}
      width={SIZE_W}
      height={SIZE_H}
      alt={team}
      className="rounded-sm object-cover"
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "FINISHED") {
    return <span className="text-[10px] text-muted-foreground">FT</span>;
  }
  return null;
}

function PredictionBadge({ prediction }: { prediction: Prediction | null | undefined }) {
  if (!prediction) return null;

  const hasScore = prediction.homeScore !== null && prediction.awayScore !== null;
  const pointsKnown = prediction.points !== null;

  if (pointsKnown) {
    return (
      <span className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded",
        prediction.points === 6 ? "bg-green-100 text-green-700" :
        prediction.points === 4 ? "bg-blue-100 text-blue-700" :
        prediction.points === 2 ? "bg-yellow-100 text-yellow-700" :
        "bg-red-100 text-red-700"
      )}>
        {prediction.points}pts
      </span>
    );
  }

  if (hasScore) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        {prediction.homeScore}–{prediction.awayScore}
      </span>
    );
  }

  const winnerLabel: Record<string, string> = {
    home: "Home win",
    away: "Away win",
    draw: "Draw",
  };

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <CheckCircle2 className="h-3 w-3 text-green-500" />
      {winnerLabel[prediction.predictedWinner ?? ""] ?? prediction.predictedWinner}
    </span>
  );
}

function formatKickoff(kickoff: Date): string {
  return new Intl.DateTimeFormat("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(kickoff));
}

export default function MatchCard({ match, prediction }: MatchCardProps) {
  const lockTime = getLockTime(new Date(match.kickoff));
  const isLocked = new Date() >= lockTime;
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block bg-card rounded-xl border border-border p-3 hover:border-primary/40 transition-colors active:scale-[0.99]"
    >
      {/* Top row: group + status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {match.groupName ?? match.stage.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-2">
          {isLocked && !isFinished && !isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
          <StatusBadge status={match.status} />
        </div>
      </div>

      {/* Teams + score row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Flag team={match.homeTeam} />
          <span className="text-sm font-semibold truncate">{match.homeTeam}</span>
        </div>

        {/* Score / time */}
        <div className="flex flex-col items-center flex-shrink-0 w-16">
          {isFinished || isLive ? (
            <span className={cn(
              "text-lg font-bold tabular-nums",
              isLive && "text-red-500"
            )}>
              {match.homeScore ?? "–"} : {match.awayScore ?? "–"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground text-center leading-tight">
              {new Intl.DateTimeFormat("default", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(match.kickoff))}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold truncate text-right">{match.awayTeam}</span>
          <Flag team={match.awayTeam} />
        </div>
      </div>

      {/* Bottom row: date + prediction */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3 inline mr-0.5" />
          {formatKickoff(new Date(match.kickoff))}
        </span>
        <PredictionBadge prediction={prediction} />
        {!prediction && !isLocked && (
          <span className="text-[10px] text-primary font-medium">Predict →</span>
        )}
        {!prediction && isLocked && !isFinished && (
          <span className="text-[10px] text-muted-foreground">No prediction</span>
        )}
      </div>
    </Link>
  );
}
