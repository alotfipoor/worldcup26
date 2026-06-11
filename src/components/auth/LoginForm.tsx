"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, ChevronLeft } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "name">("code");
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Invalid invite code"); return; }
    if (data.status === "setup_required") { setStep("name"); }
    else { router.push("/"); router.refresh(); }
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase(), name: name.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Something went wrong"); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-3 text-2xl shadow-lg">
          ⚽
        </div>
        <h1 className="text-2xl font-bold tracking-tight">KickPick</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick your result before the kick-off.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/5 dark:shadow-black/30">
        {step === "code" ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Invite Code
              </p>
              <Input
                type="text"
                placeholder="XXXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-[0.4em] uppercase h-14 bg-muted/50"
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the code you received to join
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl"
              disabled={loading || inviteCode.length < 4}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Checking…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Your Name
              </p>
              <Input
                type="text"
                placeholder="How should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="h-12 text-base bg-muted/50"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This is how you&apos;ll appear on the leaderboard
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl"
              disabled={loading || name.trim().length < 2}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Joining…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Join the game <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
            <button
              type="button"
              onClick={() => setStep("code")}
              className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Private game · Invite only
      </p>
    </div>
  );
}
