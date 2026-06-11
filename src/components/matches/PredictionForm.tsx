"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface PredictionFormProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  isKnockout: boolean;
  lockTime: Date;
  initialPrediction?: {
    homeScore: number | null;
    awayScore: number | null;
    predictedWinner: string | null;
  } | null;
}

type WinnerOption = "home" | "draw" | "away";

export default function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  isKnockout,
  lockTime,
  initialPrediction,
}: PredictionFormProps) {
  const [mode, setMode] = useState<"score" | "winner">(
    initialPrediction?.predictedWinner && !initialPrediction.homeScore !== null
      ? "winner"
      : "score"
  );
  const [homeScore, setHomeScore] = useState(
    initialPrediction?.homeScore?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    initialPrediction?.awayScore?.toString() ?? ""
  );
  const [winner, setWinner] = useState<WinnerOption | null>(
    (initialPrediction?.predictedWinner as WinnerOption) ?? null
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (initialPrediction?.predictedWinner && initialPrediction.homeScore === null) {
      setMode("winner");
      setWinner(initialPrediction.predictedWinner as WinnerOption);
    } else if (initialPrediction?.homeScore !== null && initialPrediction?.homeScore !== undefined) {
      setMode("score");
      setHomeScore(initialPrediction.homeScore.toString());
      setAwayScore(initialPrediction.awayScore?.toString() ?? "");
    }
  }, [initialPrediction]);

  useEffect(() => {
    function tick() {
      const diff = lockTime.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Locked");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) setTimeLeft(`Closes in ${h}h ${m}m`);
      else setTimeLeft(`Closes in ${m}m`);
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lockTime]);

  async function save() {
    setSaving(true);
    setSaved(false);

    const body =
      mode === "score"
        ? { homeScore: parseInt(homeScore), awayScore: parseInt(awayScore) }
        : { predictedWinner: winner };

    const res = await fetch(`/api/predictions/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Failed to save prediction");
      return;
    }

    setSaved(true);
    toast.success("Prediction saved!");
    setTimeout(() => setSaved(false), 3000);
  }

  const canSave =
    mode === "score"
      ? homeScore !== "" && awayScore !== ""
      : winner !== null;

  return (
    <div className="space-y-4">
      {/* Countdown */}
      <p className="text-xs text-muted-foreground text-right">{timeLeft}</p>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => setMode("score")}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            mode === "score"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Predict score
        </button>
        <button
          onClick={() => setMode("winner")}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            mode === "winner"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Pick winner
        </button>
      </div>

      {mode === "score" ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground text-center truncate">
              {homeTeam}
            </p>
            <Input
              type="number"
              min={0}
              max={20}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="text-center text-2xl font-bold h-16 tabular-nums"
              placeholder="0"
            />
          </div>
          <span className="text-xl font-bold text-muted-foreground flex-shrink-0">
            –
          </span>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground text-center truncate">
              {awayTeam}
            </p>
            <Input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="text-center text-2xl font-bold h-16 tabular-nums"
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {(["home", ...(isKnockout ? [] : ["draw"]), "away"] as WinnerOption[]).map(
            (opt) => (
              <button
                key={opt}
                onClick={() => setWinner(opt)}
                className={cn(
                  "flex-1 rounded-xl py-3 text-sm font-semibold border-2 transition-all",
                  winner === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {opt === "home"
                  ? homeTeam
                  : opt === "away"
                  ? awayTeam
                  : "Draw"}
              </button>
            )
          )}
        </div>
      )}

      <Button
        onClick={save}
        disabled={!canSave || saving}
        className="w-full h-12 text-base"
      >
        {saving ? (
          "Saving…"
        ) : saved ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Saved!
          </span>
        ) : initialPrediction ? (
          "Update prediction"
        ) : (
          "Save prediction"
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        Score prediction: 6pts if exact · 4pts if right winner · Winner-only pick: 2pts
      </p>
    </div>
  );
}
