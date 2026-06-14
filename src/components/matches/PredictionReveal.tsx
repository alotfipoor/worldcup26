import { cn } from "@/lib/utils";

interface RevealPrediction {
  userId: string;
  userName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinner: string | null;
  points: number;
  reason: string | null;
}

interface PredictionRevealProps {
  predictions: RevealPrediction[];
  homeTeam: string;
  awayTeam: string;
  currentUserId: string;
  showPoints?: boolean;
}

const REASON_BADGE: Record<string, { label: string; color: string }> = {
  exact_score: { label: "Exact", color: "text-emerald-600 dark:text-emerald-400" },
  correct_winner_goal_diff: { label: "Goal diff", color: "text-blue-600 dark:text-blue-400" },
  correct_winner_only: { label: "Winner", color: "text-amber-600 dark:text-amber-400" },
  wrong: { label: "Miss", color: "text-red-500" },
};

function predLabel(p: RevealPrediction, homeTeam: string, awayTeam: string): string {
  if (p.homeScore !== null && p.awayScore !== null) {
    return `${p.homeScore}–${p.awayScore}`;
  }
  if (p.predictedWinner === "home") return homeTeam;
  if (p.predictedWinner === "away") return awayTeam;
  if (p.predictedWinner === "draw") return "Draw";
  return "–";
}

function DistBar({
  count,
  label,
  barColor,
  total,
}: {
  count: number;
  label: string;
  barColor: string;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex-1 text-center space-y-1">
      <div className="text-sm font-bold tabular-nums">{count}</div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground truncate">{label}</div>
    </div>
  );
}

export default function PredictionReveal({
  predictions,
  homeTeam,
  awayTeam,
  currentUserId,
  showPoints = true,
}: PredictionRevealProps) {
  if (predictions.length === 0) return null;

  let homeWinCount = 0,
    drawCount = 0,
    awayWinCount = 0;
  for (const p of predictions) {
    if (p.homeScore !== null && p.awayScore !== null) {
      if (p.homeScore > p.awayScore) homeWinCount++;
      else if (p.awayScore > p.homeScore) awayWinCount++;
      else drawCount++;
    } else if (p.predictedWinner === "home") homeWinCount++;
    else if (p.predictedWinner === "away") awayWinCount++;
    else if (p.predictedWinner === "draw") drawCount++;
  }

  const total = predictions.length;

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm">What everyone predicted</h2>

      {/* Distribution */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex gap-4">
          <DistBar count={homeWinCount} label={homeTeam} barColor="bg-blue-500" total={total} />
          <DistBar count={drawCount} label="Draw" barColor="bg-muted-foreground" total={total} />
          <DistBar count={awayWinCount} label={awayTeam} barColor="bg-amber-400" total={total} />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          {total} prediction{total !== 1 ? "s" : ""} submitted
        </p>
      </div>

      {/* Per-player list */}
      <div className="space-y-1.5">
        {[...predictions]
          .sort(showPoints
            ? (a, b) => b.points - a.points
            : (a, b) => a.userName.localeCompare(b.userName))
          .map((p) => {
            const badge = REASON_BADGE[p.reason ?? "wrong"] ?? REASON_BADGE.wrong;
            const isMe = p.userId === currentUserId;
            return (
              <div
                key={p.userId}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm",
                  isMe ? "bg-primary/10 border-primary/30" : "bg-card border-border"
                )}
              >
                <span className={cn("font-medium truncate", isMe && "text-primary")}>
                  {p.userName}
                  {isMe && (
                    <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>
                  )}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-muted-foreground text-xs">
                    {predLabel(p, homeTeam, awayTeam)}
                  </span>
                  {showPoints && (
                    <>
                      <span className={cn("text-xs font-bold", badge.color)}>{badge.label}</span>
                      <span className={cn("text-sm font-bold tabular-nums", badge.color)}>
                        {p.points}pt
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
