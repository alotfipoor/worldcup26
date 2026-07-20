import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActualResultsProps {
  actual: {
    champion: string;
    topScorer: string;
    topAssist: string;
    bestGoalkeeper: string;
  };
  prediction: {
    champion: string | null;
    topScorer: string | null;
    topAssist: string | null;
    bestGoalkeeper: string | null;
  } | null;
}

function Row({
  label,
  points,
  actualValue,
  predicted,
}: {
  label: string;
  points: number;
  actualValue: string;
  predicted: string | null | undefined;
}) {
  if (!actualValue) return null;
  const correct =
    !!predicted && predicted.trim().toLowerCase() === actualValue.trim().toLowerCase();

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-semibold truncate">{actualValue}</p>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0",
          correct
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {correct ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {correct ? `+${points}pts` : "0pts"}
      </span>
    </div>
  );
}

export default function ActualResults({ actual, prediction }: ActualResultsProps) {
  if (!actual.champion) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h2 className="text-sm font-bold flex items-center gap-1.5 mb-1">🏆 Final Results</h2>
      <div>
        <Row label="World Cup Champion" points={15} actualValue={actual.champion} predicted={prediction?.champion} />
        <Row label="Golden Boot (Top Scorer)" points={10} actualValue={actual.topScorer} predicted={prediction?.topScorer} />
        <Row label="Top Assists" points={10} actualValue={actual.topAssist} predicted={prediction?.topAssist} />
        <Row label="Best Goalkeeper" points={10} actualValue={actual.bestGoalkeeper} predicted={prediction?.bestGoalkeeper} />
      </div>
    </div>
  );
}
