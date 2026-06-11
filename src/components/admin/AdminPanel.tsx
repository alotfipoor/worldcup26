"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Copy, Trash2, RefreshCw, Plus, Shield } from "lucide-react";
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

interface AdminPanelProps {
  users: AdminUser[];
  lastSync: Date | null;
  matchCount: number;
  sideBets: SideBetItem[];
}

export default function AdminPanel({
  users: initialUsers,
  lastSync,
  matchCount,
  sideBets: initialSideBets,
}: AdminPanelProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<"users" | "sidebets">("users");
  const [sideBets, setSideBets] = useState(initialSideBets);
  const [newQuestion, setNewQuestion] = useState("");
  const [newClosesAt, setNewClosesAt] = useState("");
  const [newPoints, setNewPoints] = useState(10);
  const [newAnswerType, setNewAnswerType] = useState<"TEXT" | "CHOICE">("TEXT");
  const [newOptions, setNewOptions] = useState("");
  const [creatingBet, setCreatingBet] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");

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
        options: newAnswerType === "CHOICE"
          ? newOptions.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
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
      myAnswer: null,
      myPointsAwarded: null,
      predictionCount: 0,
    }, ...prev]);
    setNewQuestion("");
    setNewClosesAt("");
    setNewOptions("");
    toast.success("Side bet created!");
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

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-2">
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
                <Label className="text-xs text-muted-foreground">Points</Label>
                <Input
                  type="number"
                  value={newPoints}
                  min={1}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(["TEXT", "CHOICE"] as const).map((type) => (
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
                  {type === "TEXT" ? "Free text" : "Multiple choice"}
                </button>
              ))}
            </div>
            {newAnswerType === "CHOICE" && (
              <Input
                placeholder="Options (comma-separated)"
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
              />
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
                  {bet.resolved ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Correct: {bet.correctAnswer}
                    </p>
                  ) : resolvingId === bet.id ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Correct answer"
                        value={resolveAnswer}
                        onChange={(e) => setResolveAnswer(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs px-3"
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
                  ) : (
                    <div className="flex gap-2">
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
