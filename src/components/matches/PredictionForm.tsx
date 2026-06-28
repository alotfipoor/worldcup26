"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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

export default function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  lockTime,
  initialPrediction,
}: PredictionFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(
    initialPrediction?.homeScore?.toString() ?? "0"
  );
  const [awayScore, setAwayScore] = useState(
    initialPrediction?.awayScore?.toString() ?? "0"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (initialPrediction && initialPrediction.homeScore !== null && initialPrediction.homeScore !== undefined) {
      setHomeScore(initialPrediction.homeScore.toString());
      setAwayScore((initialPrediction.awayScore ?? 0).toString());
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

    const res = await fetch(`/api/predictions/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Failed to save prediction");
      return;
    }

    setSaved(true);
    toast.success("Prediction saved!");
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  const canSave =
    homeScore !== "" &&
    awayScore !== "" &&
    !isNaN(parseInt(homeScore)) &&
    !isNaN(parseInt(awayScore)) &&
    parseInt(homeScore) >= 0 &&
    parseInt(awayScore) >= 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-right">{timeLeft}</p>

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
        {isKnockout
          ? "Exact score: 7pts · Right winner + goal diff: 5pts · Right winner: 3pts · Can update until kickoff"
          : "Exact score: 6pts · Right winner + goal diff: 4pts · Right winner: 2pts · Can update until kickoff"}
      </p>
    </div>
  );
}
