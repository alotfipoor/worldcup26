import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LeaderboardUser } from "@/types";
import { Trophy } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

interface MiniLeaderboardProps {
  users: LeaderboardUser[];
  currentUserId?: string;
}

export default function MiniLeaderboard({
  users,
  currentUserId,
}: MiniLeaderboardProps) {
  const top5 = users.slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-sm">Standings</span>
        </div>
        <Link href="/leaderboard" className="text-xs text-primary">
          See all
        </Link>
      </div>
      <div className="divide-y divide-border">
        {top5.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No scores yet
          </p>
        ) : (
          top5.map((user) => {
            const isMe = user.id === currentUserId;
            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5",
                  isMe && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base w-5 text-center">
                    {user.rank <= 3 ? MEDALS[user.rank - 1] : user.rank}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isMe && "text-primary"
                    )}
                  >
                    {user.name}
                    {isMe && (
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">
                        you
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {user.totalPoints}
                  <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                    pts
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
