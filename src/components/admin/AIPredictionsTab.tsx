"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TeamFlag from "@/components/matches/TeamFlag";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react";

interface AiPred {
  id: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedWinner: string;
  confidence: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  reasoning: string;
  keyFactors: string[];
  riskFactors: string[];
  dataSourcesUsed: {
    standings: boolean;
    elo: boolean;
    news: boolean;
    weather: boolean;
  };
  generatedAt: string;
}

interface MatchItem {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  kickoff: string;
  stage: string;
  groupName: string | null;
  aiPrediction: AiPred | null;
}

type Filter = "all" | "upcoming" | "group" | "knockout";

const STAGE_LABEL: Record<string, string> = {
  GROUP: "Group",
  ROUND_OF_32: "R32",
  ROUND_OF_16: "R16",
  QUARTER_FINAL: "QF",
  SEMI_FINAL: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final",
};

const KNOCKOUT_STAGES = new Set(["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"]);

export default function AIPredictionsTab() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-predictions");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as { matches: MatchItem[] };
      setMatches(data.matches);
    } catch {
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  async function generatePrediction(matchId: string) {
    setGeneratingId(matchId);
    try {
      const res = await fetch(`/api/admin/ai-predictions/${matchId}`, { method: "POST" });
      const data = await res.json() as { prediction?: AiPred; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, aiPrediction: data.prediction! } : m)
      );
      setExpandedId(matchId);
      toast.success("Prediction generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGeneratingId(null);
    }
  }

  async function deletePrediction(matchId: string) {
    const res = await fetch(`/api/admin/ai-predictions/${matchId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setMatches((prev) =>
      prev.map((m) => m.id === matchId ? { ...m, aiPrediction: null } : m)
    );
    if (expandedId === matchId) setExpandedId(null);
    toast.success("Prediction removed");
  }

  const filtered = matches.filter((m) => {
    if (filter === "upcoming") return m.status !== "FINISHED";
    if (filter === "group") return m.stage === "GROUP";
    if (filter === "knockout") return KNOCKOUT_STAGES.has(m.stage);
    return true;
  });

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading matches…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-1">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Match Predictions
        </h2>
        <p className="text-xs text-muted-foreground">
          Powered by Gemini 2.5 Pro — uses Elo ratings, tournament standings, news, and weather to predict each match.
        </p>
      </div>

      {/* Filter strip */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "upcoming", "group", "knockout"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "group" ? "Group Stage" : f === "knockout" ? "Knockout" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.filter((m) => m.aiPrediction).length}/{filtered.length} predicted
        </span>
      </div>

      {/* Match list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No matches to show.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((match) => {
            const pred = match.aiPrediction;
            const isGenerating = generatingId === match.id;
            const isExpanded = expandedId === match.id;
            const kickoff = new Date(match.kickoff);

            return (
              <div
                key={match.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Main row */}
                <div className="p-3 flex items-center gap-2 flex-wrap">
                  {/* Teams */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TeamFlag team={match.homeTeam} size="xs" nameClassName="text-sm font-medium" />
                      <span className="text-xs text-muted-foreground">vs</span>
                      <TeamFlag team={match.awayTeam} size="xs" nameClassName="text-sm font-medium" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                        {STAGE_LABEL[match.stage] ?? match.stage}
                        {match.groupName ? ` ${match.groupName.replace("GROUP_", "")}` : ""}
                      </span>
                      <span>
                        {kickoff.toLocaleDateString("default", { month: "short", day: "numeric" })}
                        {" "}
                        {kickoff.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {match.status === "FINISHED" && (
                        <span className="text-emerald-600 font-medium">
                          FT {match.homeScore}–{match.awayScore}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prediction badge */}
                  {pred && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : match.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex-shrink-0",
                        pred.predictedWinner === "home"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                          : pred.predictedWinner === "away"
                          ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
                          : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300"
                      )}
                    >
                      <span>{pred.predictedHomeScore}–{pred.predictedAwayScore}</span>
                      <span className="text-[9px] opacity-70 font-normal hidden sm:block">
                        {Math.round(pred.confidence * 100)}% conf.
                      </span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={pred ? "outline" : "default"}
                      className="h-7 text-xs px-2.5 gap-1"
                      disabled={isGenerating}
                      onClick={() => generatePrediction(match.id)}
                    >
                      {isGenerating ? (
                        <><RefreshCw className="h-3 w-3 animate-spin" /><span className="hidden sm:inline">Analyzing…</span></>
                      ) : pred ? (
                        <><RefreshCw className="h-3 w-3" /><span className="hidden sm:inline">Regenerate</span></>
                      ) : (
                        <><Sparkles className="h-3 w-3" /><span className="hidden sm:inline">Generate</span></>
                      )}
                    </Button>
                    {pred && (
                      <button
                        onClick={() => deletePrediction(match.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove prediction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {pred && isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                    {/* Win probabilities */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Win Probabilities</p>
                      <div className="flex rounded-full overflow-hidden h-5 text-[10px] font-bold">
                        <div
                          className="bg-emerald-500 flex items-center justify-center text-white"
                          style={{ width: `${Math.round(pred.homeWinProbability * 100)}%` }}
                        >
                          {Math.round(pred.homeWinProbability * 100) >= 12 && `${Math.round(pred.homeWinProbability * 100)}%`}
                        </div>
                        <div
                          className="bg-amber-400 flex items-center justify-center text-white"
                          style={{ width: `${Math.round(pred.drawProbability * 100)}%` }}
                        >
                          {Math.round(pred.drawProbability * 100) >= 10 && `${Math.round(pred.drawProbability * 100)}%`}
                        </div>
                        <div
                          className="bg-blue-500 flex items-center justify-center text-white"
                          style={{ width: `${Math.round(pred.awayWinProbability * 100)}%` }}
                        >
                          {Math.round(pred.awayWinProbability * 100) >= 12 && `${Math.round(pred.awayWinProbability * 100)}%`}
                        </div>
                      </div>
                      <div className="flex text-[9px] text-muted-foreground">
                        <span className="flex-1">{match.homeTeam}</span>
                        <span>Draw</span>
                        <span className="flex-1 text-right">{match.awayTeam}</span>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Scoreline Confidence: {Math.round(pred.confidence * 100)}%
                      </p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.round(pred.confidence * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Key factors */}
                    {pred.keyFactors.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Key Factors</p>
                        <ul className="space-y-1">
                          {pred.keyFactors.map((f, i) => (
                            <li key={i} className="text-xs flex gap-1.5 items-start">
                              <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk factors */}
                    {pred.riskFactors.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Risk Factors</p>
                        <ul className="space-y-1">
                          {pred.riskFactors.map((f, i) => (
                            <li key={i} className="text-xs flex gap-1.5 items-start text-muted-foreground">
                              <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Reasoning */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Analysis</p>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{pred.reasoning}</p>
                    </div>

                    {/* Data sources + timestamp */}
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border">
                      <span className="flex gap-1.5 flex-wrap">
                        <span className={pred.dataSourcesUsed.standings ? "text-emerald-500" : "opacity-30"}>standings</span>
                        <span className={pred.dataSourcesUsed.elo ? "text-emerald-500" : "opacity-30"}>elo</span>
                        <span className={pred.dataSourcesUsed.news ? "text-emerald-500" : "opacity-30"}>news</span>
                        <span className={pred.dataSourcesUsed.weather ? "text-emerald-500" : "opacity-30"}>weather</span>
                      </span>
                      <span>
                        Generated {new Date(pred.generatedAt).toLocaleString("default", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
