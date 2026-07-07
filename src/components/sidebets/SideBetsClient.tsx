"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSideBetAnswerCorrect } from "@/lib/sidebets";
import type { SideBetItem } from "@/types";

function isClosed(bet: SideBetItem): boolean {
  return new Date() > new Date(bet.closesAt);
}

function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function VoterList({ voters }: { voters: string[] }) {
  if (voters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {voters.map((name) => (
        <span
          key={name}
          className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function AnswerReveal({ bet }: { bet: SideBetItem }) {
  const { voterAnswers, answerType, options, correctAnswer, resolved } = bet;
  if (!voterAnswers || voterAnswers.length === 0) return null;

  if (answerType === "CHOICE") {
    const allOptions = options ?? [...new Set(voterAnswers.map((v) => v.answer))];
    const total = voterAnswers.length;
    return (
      <div className="space-y-2.5">
        {allOptions.map((opt) => {
          const votes = voterAnswers.filter(
            (v) => v.answer.toLowerCase() === opt.toLowerCase()
          );
          const pct = total > 0 ? Math.round((votes.length / total) * 100) : 0;
          const isCorrect = resolved && isSideBetAnswerCorrect(opt, correctAnswer, "CHOICE");
          return (
            <div key={opt} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs font-medium",
                  isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                )}>
                  {opt}{isCorrect && " ✓"}
                </span>
                <span className="text-[10px] text-muted-foreground">{votes.length}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isCorrect ? "bg-emerald-500" : "bg-primary/50"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {votes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {votes.map((v) => (
                    <span
                      key={v.name}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // TEXT type — simple name → answer list
  return (
    <div className="space-y-1">
      {voterAnswers.map((v) => {
        const isCorrect = resolved && isSideBetAnswerCorrect(v.answer, correctAnswer, "TEXT");
        return (
          <div key={v.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{v.name}</span>
            <span className={cn(
              "font-medium text-right",
              isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
            )}>
              {v.answer}{isCorrect && " ✓"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SideBetCard({ bet: initialBet, currentUserName }: { bet: SideBetItem; currentUserName: string }) {
  const router = useRouter();
  const [bet, setBet] = useState(initialBet);
  const [answer, setAnswer] = useState(initialBet.myAnswer ?? "");
  const [submitting, setSubmitting] = useState(false);
  const closed = isClosed(bet);

  const won = bet.resolved && (bet.myPointsAwarded ?? 0) > 0;
  const lost = bet.resolved && bet.myPointsAwarded === 0 && bet.myAnswer !== null;

  async function submit() {
    if (!answer.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/sidebets/${bet.id}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: answer.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error((d as { error?: string }).error ?? "Failed to submit");
      return;
    }
    const isNew = bet.myAnswer === null;
    setBet((prev) => ({
      ...prev,
      myAnswer: answer.trim(),
      predictionCount: isNew ? prev.predictionCount + 1 : prev.predictionCount,
      voters: isNew && !prev.voters.includes(currentUserName)
        ? [...prev.voters, currentUserName]
        : prev.voters,
    }));
    router.refresh();
    toast.success("Answer saved!");
  }

  return (
    <div className={cn(
      "bg-card border rounded-2xl p-4 space-y-3",
      won ? "border-emerald-500/40" : lost ? "border-red-400/30" : "border-border"
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{bet.question}</p>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
          bet.resolved
            ? won ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
            : closed ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                     : "bg-primary/10 text-primary"
        )}>
          {bet.resolved ? (won ? `+${bet.myPointsAwarded}pt` : "resolved") : closed ? "closed" : `${bet.pointsReward}pt`}
        </span>
      </div>

      {bet.resolved && (
        <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
          <p className="text-xs text-muted-foreground">Correct answer</p>
          <p className="font-semibold">{bet.correctAnswer}</p>
          {bet.myAnswer && (
            <p className="text-xs text-muted-foreground">
              Your answer: <span className="font-medium text-foreground">{bet.myAnswer}</span>{" "}
              {won ? "✅" : "❌"}
            </p>
          )}
        </div>
      )}

      {bet.voterAnswers ? (
        <AnswerReveal bet={bet} />
      ) : (
        <VoterList voters={bet.voters} />
      )}

      {!bet.resolved && (
        <>
          {bet.answerType === "CHOICE" && bet.options ? (
            <div className="flex flex-wrap gap-2">
              {bet.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(opt)}
                  disabled={closed}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    answer === opt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground",
                    closed && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              disabled={closed}
              className="text-sm"
            />
          )}

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {closed
                ? `Closed · ${bet.predictionCount} answer${bet.predictionCount !== 1 ? "s" : ""}`
                : `Closes ${formatDeadline(bet.closesAt)}`}
            </p>
            {!closed && (
              <Button
                size="sm"
                onClick={submit}
                disabled={submitting || !answer.trim() || answer.trim() === bet.myAnswer}
                className="h-7 text-xs px-3"
              >
                {submitting ? "Saving…" : bet.myAnswer ? "Update" : "Submit"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface SideBetsClientProps {
  bets: SideBetItem[];
  currentUserName: string;
}

export default function SideBetsClient({ bets, currentUserName }: SideBetsClientProps) {
  if (bets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-3xl mb-3">🎲</p>
        <p className="text-sm">No side bets yet. Check back soon!</p>
      </div>
    );
  }

  const open = bets.filter((b) => !b.resolved && !isClosed(b));
  const closed = bets.filter((b) => !b.resolved && isClosed(b));
  const resolved = bets.filter((b) => b.resolved);

  function Section({ title, items }: { title: string; items: SideBetItem[] }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{title}</p>
        {items.map((b) => <SideBetCard key={b.id} bet={b} currentUserName={currentUserName} />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section title="Open" items={open} />
      <Section title="Awaiting result" items={closed} />
      <Section title="Resolved" items={resolved} />
    </div>
  );
}
