"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Copy, Trash2, RefreshCw, Plus, Shield } from "lucide-react";

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
}

export default function AdminPanel({
  users: initialUsers,
  lastSync,
  matchCount,
}: AdminPanelProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function createUser() {
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() || null }),
    });
    setCreating(false);

    if (!res.ok) {
      toast.error("Failed to create user");
      return;
    }

    const { user } = await res.json();
    setUsers((prev) => [{ ...user, _count: { predictions: 0 } }, ...prev]);
    setNewName("");
    toast.success(`Created! Code: ${user.inviteCode}`);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user? This removes all their predictions.")) return;

    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
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

  return (
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
        <Button
          onClick={runSync}
          disabled={syncing}
          variant="outline"
          className="w-full"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync now
            </>
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
        <Button
          onClick={createUser}
          disabled={creating}
          className="w-full"
        >
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
                    <span className="text-muted-foreground italic">
                      Not activated
                    </span>
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
  );
}
