"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
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

    if (!res.ok) {
      toast.error(data.error ?? "Invalid invite code");
      return;
    }

    if (data.status === "setup_required") {
      setStep("name");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode: inviteCode.trim().toUpperCase(),
        name: name.trim(),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-background to-muted/30">
      {/* Logo / Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-2xl font-bold">WC26 Predictions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          World Cup 2026 · Private game
        </p>
      </div>

      <div className="w-full max-w-sm">
        {step === "code" ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invite Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="XXXXXX"
                value={inviteCode}
                onChange={(e) =>
                  setInviteCode(e.target.value.toUpperCase())
                }
                maxLength={6}
                className="text-center text-xl font-mono tracking-[0.3em] uppercase h-14"
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Ask for your invite code to join
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || inviteCode.length < 4}
            >
              {loading ? "Checking…" : "Enter"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                type="text"
                placeholder="How should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="h-12 text-base"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || name.trim().length < 2}
            >
              {loading ? "Setting up…" : "Join the game"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("code")}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
