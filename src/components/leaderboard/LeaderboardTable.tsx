"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LeaderboardUser } from "@/types";

const MEDALS = ["🥇", "🥈", "🥉"];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
  ];
  const colorIdx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;

  return (
    <span
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
        colors[colorIdx]
      )}
    >
      {initials}
    </span>
  );
}

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  currentUserId?: string;
}

export default function LeaderboardTable({
  users,
  currentUserId,
}: LeaderboardTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No players yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_3.5rem] gap-1 px-3 text-[10px] text-muted-foreground uppercase tracking-wide">
        <span>#</span>
        <span>Player</span>
        <span className="text-center">6pt</span>
        <span className="text-center">4pt</span>
        <span className="text-center">2pt</span>
        <span className="text-center">🏆</span>
        <span className="text-right font-bold">Total</span>
      </div>

      {users.map((user) => {
        const isMe = user.id === currentUserId;
        const isFirst = user.rank === 1;

        return (
          <Link
            key={user.id}
            href={`/players/${user.id}`}
            className={cn(
              "grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_3.5rem] gap-1 items-center px-3 py-2.5 rounded-xl border transition-colors",
              isMe
                ? "bg-primary/10 border-primary/30"
                : isFirst
                ? "bg-amber-50 border-amber-200"
                : "bg-card border-border hover:border-primary/30"
            )}
          >
            {/* Rank */}
            <span className="text-sm font-bold text-center">
              {user.rank <= 3 ? MEDALS[user.rank - 1] : user.rank}
            </span>

            {/* Name */}
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar name={user.name} />
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  isMe && "text-primary"
                )}
              >
                {user.name}
                {isMe && (
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">
                    (you)
                  </span>
                )}
              </span>
            </div>

            {/* Exact (6pt) */}
            <span className="text-xs text-center tabular-nums text-green-700 font-medium">
              {user.exactCount > 0 ? user.exactCount : "–"}
            </span>

            {/* Winner+Goals (4pt) */}
            <span className="text-xs text-center tabular-nums text-blue-700 font-medium">
              {user.winnerGoalsCount > 0 ? user.winnerGoalsCount : "–"}
            </span>

            {/* Winner Only (2pt) */}
            <span className="text-xs text-center tabular-nums text-yellow-700 font-medium">
              {user.winnerOnlyCount > 0 ? user.winnerOnlyCount : "–"}
            </span>

            {/* Tournament */}
            <span className="text-xs text-center tabular-nums text-purple-700 font-medium">
              {user.tournamentPoints > 0 ? user.tournamentPoints : "–"}
            </span>

            {/* Total */}
            <span
              className={cn(
                "text-sm font-bold text-right tabular-nums",
                isFirst && "text-amber-700"
              )}
            >
              {user.totalPoints}
            </span>
          </Link>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 pt-2 text-[10px] text-muted-foreground">
        <span>
          <span className="text-green-700 font-medium">6pt</span> = exact score
        </span>
        <span>
          <span className="text-blue-700 font-medium">4pt</span> = right winner + goal diff
        </span>
        <span>
          <span className="text-yellow-700 font-medium">2pt</span> = winner only
        </span>
        <span>
          <span className="text-purple-700 font-medium">🏆</span> = tournament
        </span>
      </div>
    </div>
  );
}
