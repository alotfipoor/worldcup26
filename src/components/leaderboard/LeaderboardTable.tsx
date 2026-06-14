"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LeaderboardUser, FormResult } from "@/types";

const MEDALS = ["🥇", "🥈", "🥉"];

const FORM_COLORS: Record<FormResult, string> = {
  exact_score:                "bg-emerald-500",
  correct_winner_goal_diff:   "bg-blue-500",
  correct_winner_only:        "bg-amber-400",
  wrong:                      "bg-red-400",
  none:                       "bg-muted-foreground/20",
};

function FormDots({ guide }: { guide: FormResult[] }) {
  return (
    <div className="flex gap-0.5 mt-0.5">
      {guide.map((result, i) => (
        <span
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", FORM_COLORS[result])}
          title={result === "none" ? "No prediction" : result.replace(/_/g, " ")}
        />
      ))}
    </div>
  );
}

function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const colors = [
    "bg-red-500/15 text-red-600 dark:text-red-400",
    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    "bg-pink-500/15 text-pink-600 dark:text-pink-400",
    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  ];
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

  return (
    <span className={cn("rounded-full flex items-center justify-center font-bold flex-shrink-0", sz, colors[idx])}>
      {initials}
    </span>
  );
}

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  currentUserId?: string;
}

export default function LeaderboardTable({ users, currentUserId }: LeaderboardTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-3xl mb-3">🏆</p>
        <p className="text-sm">No players yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="grid grid-cols-[1.75rem_1fr_1.75rem_1.75rem_1.75rem_1.75rem_1.75rem_3rem] gap-0.5 px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span className="text-center">#</span>
        <span>Player</span>
        <span className="text-center text-emerald-600 dark:text-emerald-400">6</span>
        <span className="text-center text-blue-600 dark:text-blue-400">4</span>
        <span className="text-center text-amber-600 dark:text-amber-400">2</span>
        <span className="text-center text-purple-600 dark:text-purple-400">🏆</span>
        <span className="text-center text-orange-500 dark:text-orange-400">🎲</span>
        <span className="text-right">Total</span>
      </div>

      {users.map((user) => {
        const isMe = user.id === currentUserId;
        const isFirst = user.rank === 1;

        return (
          <Link
            key={user.id}
            href={`/players/${user.id}`}
            className={cn(
              "grid grid-cols-[1.75rem_1fr_1.75rem_1.75rem_1.75rem_1.75rem_1.75rem_3rem] gap-0.5 items-center px-2 py-3 rounded-2xl border transition-all duration-150",
              isMe
                ? "bg-primary/10 border-primary/30 hover:border-primary/50"
                : isFirst
                ? "bg-amber-500/8 dark:bg-amber-500/10 border-amber-500/25 hover:border-amber-500/40"
                : "bg-card border-border hover:border-primary/30 hover:bg-muted/40"
            )}
          >
            {/* Rank */}
            <span className="text-sm font-bold text-center leading-none">
              {user.rank <= 3 ? MEDALS[user.rank - 1] : (
                <span className="text-muted-foreground">{user.rank}</span>
              )}
            </span>

            {/* Name */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:block flex-shrink-0"><UserAvatar name={user.name} /></div>
              <div className="min-w-0">
                <span className={cn(
                  "text-sm font-semibold truncate block leading-tight",
                  isMe && "text-primary"
                )}>
                  {user.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {isMe && (
                    <span className="text-[10px] text-muted-foreground leading-tight">you</span>
                  )}
                  <FormDots guide={user.formGuide} />
                </div>
              </div>
            </div>

            {/* Exact */}
            <span className="text-xs text-center tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
              {user.exactCount > 0 ? user.exactCount : <span className="text-muted-foreground/40">–</span>}
            </span>

            {/* Winner+Diff */}
            <span className="text-xs text-center tabular-nums font-semibold text-blue-600 dark:text-blue-400">
              {user.winnerGoalsCount > 0 ? user.winnerGoalsCount : <span className="text-muted-foreground/40">–</span>}
            </span>

            {/* Winner Only */}
            <span className="text-xs text-center tabular-nums font-semibold text-amber-600 dark:text-amber-400">
              {user.winnerOnlyCount > 0 ? user.winnerOnlyCount : <span className="text-muted-foreground/40">–</span>}
            </span>

            {/* Tournament */}
            <span className="text-xs text-center tabular-nums font-semibold text-purple-600 dark:text-purple-400">
              {user.tournamentPoints > 0 ? user.tournamentPoints : <span className="text-muted-foreground/40">–</span>}
            </span>

            {/* Side bets */}
            <span className="text-xs text-center tabular-nums font-semibold text-orange-500 dark:text-orange-400">
              {user.sideBetPoints > 0 ? user.sideBetPoints : <span className="text-muted-foreground/40">–</span>}
            </span>

            {/* Total */}
            <span className={cn(
              "text-sm font-bold text-right tabular-nums tracking-tight",
              isFirst ? "text-amber-600 dark:text-amber-400" : isMe ? "text-primary" : "text-foreground"
            )}>
              {user.totalPoints}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pt</span>
            </span>
          </Link>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 pt-3 text-[10px] text-muted-foreground border-t border-border mt-2">
        <span><span className="text-emerald-600 dark:text-emerald-400 font-semibold">6pt</span> exact score</span>
        <span><span className="text-blue-600 dark:text-blue-400 font-semibold">4pt</span> right winner + goal diff</span>
        <span><span className="text-amber-600 dark:text-amber-400 font-semibold">2pt</span> winner only</span>
        <span><span className="text-purple-600 dark:text-purple-400 font-semibold">🏆</span> tournament</span>
        <span><span className="text-orange-500 dark:text-orange-400 font-semibold">🎲</span> side bets</span>
      </div>
    </div>
  );
}
