"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Copy, Trash2, RefreshCw, Plus, Shield, Trophy, Sparkles, UserPlus, Award } from "lucide-react";
import AIPredictionsTab from "@/components/admin/AIPredictionsTab";
import PlayerAutocomplete from "@/components/ui/player-autocomplete";
import { WC2026_TEAMS, WC2026_PLAYERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SideBetItem } from "@/types";

interface AdminUser {
  id: string;
  name: string | null;
  inviteCode: string;
  role: string;
  createdAt: Date;
  activatedAt: Date | null;
  _count: { predictions: number };
}

interface FinishedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
  predictionCount: number;
}

interface MissingUser {
  id: string;
  name: string | null;
}

interface LockedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  status: string;
  missingUsers: MissingUser[];
}

interface ActualResults {
  champion: string;
  topScorer: string;
  topAssist: string;
  bestGoalkeeper: string;
}

interface AdminPanelProps {
  users: AdminUser[];
  lastSync: Date | null;
  matchCount: number;
  sideBets: SideBetItem[];
  finishedMatches: FinishedMatch[];
  lockedMatches: LockedMatch[];
  actualResults: ActualResults;
}

export default function AdminPanel({
  users: initialUsers,
  lastSync,
  matchCount,
  sideBets: initialSideBets,
  finishedMatches,
  lockedMatches: initialLockedMatches,
  actualResults: initialActualResults,
}: AdminPanelProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<"users" | "sidebets" | "matches" | "ai" | "results">("users");
  const [resultsChampion, setResultsChampion] = useState(initialActualResults.champion);
  const [resultsTopScorer, setResultsTopScorer] = useState(initialActualResults.topScorer);
  const [resultsTopAssist, setResultsTopAssist] = useState(initialActualResults.topAssist);
  const [resultsBestGoalkeeper, setResultsBestGoalkeeper] = useState(initialActualResults.bestGoalkeeper);
  const [savingResults, setSavingResults] = useState(false);
  const [sideBets, setSideBets] = useState(initialSideBets);
  const [newQuestion, setNewQuestion] = useState("");
  const [newClosesAt, setNewClosesAt] = useState("");
  const [newPoints, setNewPoints] = useState(10);
  const [newAnswerType, setNewAnswerType] = useState<"TEXT" | "CHOICE" | "MULTI_CHOICE">("TEXT");
  const [newOptions, setNewOptions] = useState("");
  const [newMaxPicks, setNewMaxPicks] = useState(4);
  const [creatingBet, setCreatingBet] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");
  const [overridingMatchId, setOverridingMatchId] = useState<string | null>(null);
  const [overrideHome, setOverrideHome] = useState("");
  const [overrideAway, setOverrideAway] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editClosesAt, setEditClosesAt] = useState("");
  const [editPointsReward, setEditPointsReward] = useState(10);
  const [savingEdit, setSavingEdit] = useState(false);
  const [lockedMatches, setLockedMatches] = useState(initialLockedMatches);
  const [backfillMatchId, setBackfillMatchId] = useState<string | null>(null);
  const [backfillUserId, setBackfillUserId] = useState("");
  const [backfillHome, setBackfillHome] = useState("");
  const [backfillAway, setBackfillAway] = useState("");
  const [backfilling, setBackfilling] = useState(false);

  function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function editSideBet(id: string) {
    if (!editQuestion.trim() || !editClosesAt) return;
    setSavingEdit(true);
    const res = await fetch(`/api/admin/sidebets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: editQuestion.trim(),
        closesAt: new Date(editClosesAt).toISOString(),
        pointsReward: editPointsReward,
      }),
    });
    setSavingEdit(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    const { bet: updated } = await res.json();
    setSideBets((prev) =>
      prev.map((b) => b.id === id
        ? { ...b, question: updated.question, closesAt: updated.closesAt, pointsReward: updated.pointsReward }
        : b
      )
    );
    setEditingBetId(null);
    toast.success("Saved!");
  }

  async function createUser() {
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() || null }),
    });
    setCreating(false);
    if (!res.ok) { toast.error("Failed to create user"); return; }
    const { user } = await res.json();
    setUsers((prev) => [{ ...user, _count: { predictions: 0 } }, ...prev]);
    setNewName("");
    toast.success(`Created! Code: ${user.inviteCode}`);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user? This removes all their predictions.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("User removed");
  }

  async function runSync() {
    setSyncing(true);
    const res = await fetch("/api/sync", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Sync failed");
      return;
    }
    const d = await res.json();
    toast.success(`Synced ${d.synced} matches, scored ${d.scored} predictions`);
    router.refresh();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied!`);
  }

  async function createSideBet() {
    if (!newQuestion.trim() || !newClosesAt) return;
    setCreatingBet(true);
    const res = await fetch("/api/admin/sidebets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: newQuestion.trim(),
        answerType: newAnswerType,
        options: newAnswerType !== "TEXT"
          ? newOptions.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        maxPicks: newAnswerType === "MULTI_CHOICE" ? newMaxPicks : undefined,
        closesAt: newClosesAt,
        pointsReward: newPoints,
      }),
    });
    setCreatingBet(false);
    if (!res.ok) { toast.error("Failed to create"); return; }
    const { bet } = await res.json();
    setSideBets((prev) => [{
      ...bet,
      closesAt: bet.closesAt,
      createdAt: bet.createdAt,
      options: bet.options ?? null,
      maxPicks: bet.maxPicks ?? null,
      myAnswer: null,
      myPointsAwarded: null,
      predictionCount: 0,
    }, ...prev]);
    setNewQuestion("");
    setNewClosesAt("");
    setNewOptions("");
    toast.success("Side bet created!");
  }

  function toggleResolvePick(opt: string, multi: boolean) {
    const current = resolveAnswer.split(",").map((s) => s.trim()).filter(Boolean);
    const selected = current.some((c) => c.toLowerCase() === opt.toLowerCase());
    if (!multi) {
      setResolveAnswer(selected ? "" : opt);
      return;
    }
    const next = selected
      ? current.filter((c) => c.toLowerCase() !== opt.toLowerCase())
      : [...current, opt];
    setResolveAnswer(next.join(", "));
  }

  async function resolveSideBet(id: string) {
    if (!resolveAnswer.trim()) return;
    const res = await fetch(`/api/admin/sidebets/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctAnswer: resolveAnswer.trim() }),
    });
    if (!res.ok) { toast.error("Failed to resolve"); return; }
    const { winners, total } = await res.json();
    setSideBets((prev) =>
      prev.map((b) => b.id === id
        ? { ...b, resolved: true, correctAnswer: resolveAnswer.trim() }
        : b
      )
    );
    setResolvingId(null);
    setResolveAnswer("");
    toast.success(`Resolved! ${winners}/${total} correct.`);
  }

  async function deleteSideBet(id: string) {
    if (!confirm("Delete this side bet?")) return;
    const res = await fetch(`/api/admin/sidebets/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setSideBets((prev) => prev.filter((b) => b.id !== id));
    toast.success("Deleted");
  }

  async function overrideMatch(matchId: string) {
    setOverriding(true);
    const res = await fetch("/api/admin/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: parseInt(overrideHome), awayScore: parseInt(overrideAway) }),
    });
    setOverriding(false);
    if (!res.ok) { toast.error("Override failed"); return; }
    const { scored } = await res.json();
    toast.success(`Done! Re-scored ${scored} predictions.`);
    setOverridingMatchId(null);
    router.refresh();
  }

  async function submitBackfill(matchId: string) {
    if (!backfillUserId || backfillHome === "" || backfillAway === "") return;
    setBackfilling(true);
    const res = await fetch("/api/admin/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: backfillUserId,
        matchId,
        homeScore: parseInt(backfillHome),
        awayScore: parseInt(backfillAway),
      }),
    });
    setBackfilling(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Failed to add prediction");
      return;
    }
    setLockedMatches((prev) =>
      prev
        .map((m) =>
          m.id === matchId
            ? { ...m, missingUsers: m.missingUsers.filter((u) => u.id !== backfillUserId) }
            : m
        )
        .filter((m) => m.missingUsers.length > 0)
    );
    setBackfillMatchId(null);
    setBackfillUserId("");
    setBackfillHome("");
    setBackfillAway("");
    toast.success("Prediction added!");
    router.refresh();
  }

  async function saveResults() {
    setSavingResults(true);
    const res = await fetch("/api/admin/tournament-results", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        champion: resultsChampion,
        topScorer: resultsTopScorer,
        topAssist: resultsTopAssist,
        bestGoalkeeper: resultsBestGoalkeeper,
      }),
    });
    setSavingResults(false);
    if (!res.ok) { toast.error("Failed to save results"); return; }
    toast.success("Results saved — leaderboard updated!");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTab === "users"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("sidebets")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTab === "sidebets"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Side Bets
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTab === "matches"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Matches
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === "ai"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Predictions
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === "results"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Award className="h-3.5 w-3.5" />
          Results
        </button>
      </div>

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Sync */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Match Sync
            </h2>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{matchCount} matches in database</p>
              {lastSync && (
                <p>
                  Last sync:{" "}
                  {new Intl.DateTimeFormat("default", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(lastSync))}
                </p>
              )}
            </div>
            <Button onClick={runSync} disabled={syncing} variant="outline" className="w-full">
              {syncing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Syncing…</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Sync now</>
              )}
            </Button>
          </div>

          {/* Add user */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Member
            </h2>
            <div className="space-y-2">
              <Label htmlFor="newName" className="text-xs">
                Name (optional — they can set it on first login)
              </Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Friend's name…"
                className="h-10"
              />
            </div>
            <Button onClick={createUser} disabled={creating} className="w-full">
              {creating ? "Creating…" : "Generate invite code"}
            </Button>
          </div>

          {/* Users list */}
          <div className="space-y-2">
            <h2 className="font-semibold text-sm">
              Members ({users.filter((u) => u.role === "USER").length})
            </h2>
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {user.role === "ADMIN" && (
                      <Shield className="h-3 w-3 text-primary" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {user.name ?? (
                        <span className="text-muted-foreground italic">Not activated</span>
                      )}
                    </span>
                    {user.activatedAt && (
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={() => copyCode(user.inviteCode)}
                      className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {user.inviteCode}
                      <Copy className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {user._count.predictions} predictions
                    </span>
                  </div>
                </div>
                {user.role !== "ADMIN" && (
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches tab */}
      {activeTab === "matches" && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Override Match Score & Rescore
            </h2>
            <p className="text-xs text-muted-foreground">
              Use this to correct a wrong score and re-calculate all prediction points for that match.
            </p>
          </div>
          {finishedMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No finished matches yet.</p>
          ) : (
            finishedMatches.map((match) => (
              <div key={match.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.homeScore ?? "?"} – {match.awayScore ?? "?"} &middot; {match.predictionCount} predictions &middot;{" "}
                      {new Intl.DateTimeFormat("default", { dateStyle: "short" }).format(new Date(match.kickoff))}
                    </p>
                  </div>
                  {overridingMatchId !== match.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-3 flex-shrink-0"
                      onClick={() => {
                        setOverridingMatchId(match.id);
                        setOverrideHome(String(match.homeScore ?? ""));
                        setOverrideAway(String(match.awayScore ?? ""));
                      }}
                    >
                      Override
                    </Button>
                  )}
                </div>
                {overridingMatchId === match.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        type="number"
                        min={0}
                        value={overrideHome}
                        onChange={(e) => setOverrideHome(e.target.value)}
                        className="h-8 w-16 text-center text-sm"
                        placeholder="H"
                      />
                      <span className="text-sm text-muted-foreground">–</span>
                      <Input
                        type="number"
                        min={0}
                        value={overrideAway}
                        onChange={(e) => setOverrideAway(e.target.value)}
                        className="h-8 w-16 text-center text-sm"
                        placeholder="A"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs px-3"
                      disabled={overriding || overrideHome === "" || overrideAway === ""}
                      onClick={() => overrideMatch(match.id)}
                    >
                      {overriding ? "Saving…" : "Save & Rescore"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setOverridingMatchId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Backfill missing predictions */}
      {activeTab === "matches" && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Backfill Missing Predictions
            </h2>
            <p className="text-xs text-muted-foreground">
              For locked matches where someone forgot to predict — add their score on their behalf.
            </p>
          </div>
          {lockedMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nobody&apos;s missing a prediction on a locked match.
            </p>
          ) : (
            lockedMatches.map((match) => (
              <div key={match.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.missingUsers.length} missing &middot;{" "}
                      {new Intl.DateTimeFormat("default", { dateStyle: "short", timeStyle: "short" }).format(
                        new Date(match.kickoff)
                      )}
                    </p>
                  </div>
                  {backfillMatchId !== match.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-3 flex-shrink-0"
                      onClick={() => {
                        setBackfillMatchId(match.id);
                        setBackfillUserId("");
                        setBackfillHome("");
                        setBackfillAway("");
                      }}
                    >
                      Add prediction
                    </Button>
                  )}
                </div>
                {backfillMatchId === match.id && (
                  <div className="space-y-2 pt-1">
                    <select
                      value={backfillUserId}
                      onChange={(e) => setBackfillUserId(e.target.value)}
                      className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                    >
                      <option value="">Select user…</option>
                      {match.missingUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name ?? "Unnamed"}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          type="number"
                          min={0}
                          value={backfillHome}
                          onChange={(e) => setBackfillHome(e.target.value)}
                          className="h-8 w-16 text-center text-sm"
                          placeholder="H"
                        />
                        <span className="text-sm text-muted-foreground">–</span>
                        <Input
                          type="number"
                          min={0}
                          value={backfillAway}
                          onChange={(e) => setBackfillAway(e.target.value)}
                          className="h-8 w-16 text-center text-sm"
                          placeholder="A"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs px-3"
                        disabled={backfilling || !backfillUserId || backfillHome === "" || backfillAway === ""}
                        onClick={() => submitBackfill(match.id)}
                      >
                        {backfilling ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setBackfillMatchId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* AI Predictions tab */}
      {activeTab === "ai" && <AIPredictionsTab />}

      {/* Results tab */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Award className="h-4 w-4" />
              Actual Tournament Results
            </h2>
            <p className="text-xs text-muted-foreground">
              Set these once the outcomes are known. Everyone&apos;s tournament predictions are scored against
              them automatically on the leaderboard — no rescoring step needed.
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resultsChampion" className="text-sm font-semibold">
                World Cup Champion
                <span className="ml-2 text-xs font-normal text-muted-foreground">15 pts</span>
              </Label>
              <Input
                id="resultsChampion"
                list="wc-teams-results"
                value={resultsChampion}
                onChange={(e) => setResultsChampion(e.target.value)}
                placeholder="Team name…"
              />
              <datalist id="wc-teams-results">
                {WC2026_TEAMS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultsTopScorer" className="text-sm font-semibold">
                Golden Boot (Top Scorer)
                <span className="ml-2 text-xs font-normal text-muted-foreground">10 pts</span>
              </Label>
              <PlayerAutocomplete
                id="resultsTopScorer"
                value={resultsTopScorer}
                onChange={setResultsTopScorer}
                players={WC2026_PLAYERS}
                placeholder="Player name…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultsTopAssist" className="text-sm font-semibold">
                Top Assists
                <span className="ml-2 text-xs font-normal text-muted-foreground">10 pts</span>
              </Label>
              <PlayerAutocomplete
                id="resultsTopAssist"
                value={resultsTopAssist}
                onChange={setResultsTopAssist}
                players={WC2026_PLAYERS}
                placeholder="Player name…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultsBestGoalkeeper" className="text-sm font-semibold">
                Best Goalkeeper
                <span className="ml-2 text-xs font-normal text-muted-foreground">10 pts</span>
              </Label>
              <PlayerAutocomplete
                id="resultsBestGoalkeeper"
                value={resultsBestGoalkeeper}
                onChange={setResultsBestGoalkeeper}
                players={WC2026_PLAYERS}
                placeholder="Player name…"
              />
            </div>
            <Button onClick={saveResults} disabled={savingResults} className="w-full">
              {savingResults ? "Saving…" : "Save results"}
            </Button>
          </div>
        </div>
      )}

      {/* Side Bets tab */}
      {activeTab === "sidebets" && (
        <div className="space-y-6">
          {/* Create form */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">New Side Bet</h3>
            <Input
              placeholder="Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Closes at</Label>
                <Input
                  type="datetime-local"
                  value={newClosesAt}
                  onChange={(e) => setNewClosesAt(e.target.value)}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {newAnswerType === "MULTI_CHOICE" ? "Pts/pick" : "Points"}
                </Label>
                <Input
                  type="number"
                  value={newPoints}
                  min={1}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(["TEXT", "CHOICE", "MULTI_CHOICE"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewAnswerType(type)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    newAnswerType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {type === "TEXT" ? "Free text" : type === "CHOICE" ? "Multiple choice" : "Multi-select"}
                </button>
              ))}
            </div>
            {(newAnswerType === "CHOICE" || newAnswerType === "MULTI_CHOICE") && (
              <Input
                placeholder="Options (comma-separated)"
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
              />
            )}
            {newAnswerType === "MULTI_CHOICE" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Max picks</Label>
                <Input
                  type="number"
                  min={1}
                  value={newMaxPicks}
                  onChange={(e) => setNewMaxPicks(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            )}
            <Button
              onClick={createSideBet}
              disabled={creatingBet || !newQuestion.trim() || !newClosesAt}
              className="w-full"
            >
              {creatingBet ? "Creating…" : "Create Side Bet"}
            </Button>
          </div>

          {/* List */}
          {sideBets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No side bets yet.</p>
          ) : (
            <div className="space-y-3">
              {sideBets.map((bet) => (
                <div key={bet.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{bet.question}</p>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                      bet.resolved
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    )}>
                      {bet.resolved ? "resolved" : `${bet.pointsReward}pt`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bet.predictionCount} answer{bet.predictionCount !== 1 ? "s" : ""}
                  </p>
                  {resolvingId === bet.id ? (
                    <div className="space-y-2">
                      {bet.options && bet.options.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {bet.options.map((opt) => {
                            const selected = resolveAnswer
                              .split(",")
                              .map((s) => s.trim().toLowerCase())
                              .includes(opt.toLowerCase());
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleResolvePick(opt, bet.answerType === "MULTI_CHOICE")}
                                className={cn(
                                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                  selected
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <Input
                          placeholder="Correct answer"
                          value={resolveAnswer}
                          onChange={(e) => setResolveAnswer(e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3"
                          disabled={!resolveAnswer.trim()}
                          onClick={() => resolveSideBet(bet.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setResolvingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : bet.resolved ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Correct: {bet.correctAnswer}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3 flex-shrink-0"
                        onClick={() => {
                          setResolvingId(bet.id);
                          setResolveAnswer(bet.correctAnswer ?? "");
                        }}
                      >
                        Edit answer
                      </Button>
                    </div>
                  ) : editingBetId === bet.id ? (
                    <div className="space-y-2 pt-1">
                      <Input
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Question"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Closes at</Label>
                          <Input
                            type="datetime-local"
                            value={editClosesAt}
                            onChange={(e) => setEditClosesAt(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-xs text-muted-foreground">Points</Label>
                          <Input
                            type="number"
                            min={1}
                            value={editPointsReward}
                            onChange={(e) => setEditPointsReward(Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3"
                          disabled={savingEdit || !editQuestion.trim() || !editClosesAt}
                          onClick={() => editSideBet(bet.id)}
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setEditingBetId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3"
                        onClick={() => {
                          setEditingBetId(bet.id);
                          setEditQuestion(bet.question);
                          setEditClosesAt(toDatetimeLocal(bet.closesAt));
                          setEditPointsReward(bet.pointsReward);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3"
                        onClick={() => { setResolvingId(bet.id); setResolveAnswer(""); }}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteSideBet(bet.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
