import { prisma } from "@/lib/prisma";
import { calculateTournamentPoints } from "@/lib/scoring";
import LoginForm from "@/components/auth/LoginForm";
import { cn } from "@/lib/utils";

export const revalidate = 60;

const MEDALS = ["🥇", "🥈", "🥉"];

async function getStandings() {
  try {
    const users = await prisma.user.findMany({
      where: { activatedAt: { not: null } },
      include: {
        predictions: {
          where: { points: { not: null } },
          select: { points: true },
        },
        tournamentPredictions: {
          select: { champion: true, topScorer: true, window: true },
        },
      },
    });

    const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
    const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";

    return users
      .map((user) => {
        const matchPoints = user.predictions.reduce((s, p) => s + (p.points ?? 0), 0);
        const latest =
          user.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
          user.tournamentPredictions.find((t) => t.window === "INITIAL");
        const tournamentPoints =
          actualChampion && latest
            ? calculateTournamentPoints(latest, { champion: actualChampion, topScorer: actualTopScorer })
            : 0;
        return {
          id: user.id,
          name: user.name ?? "Unknown",
          totalPoints: matchPoints + tournamentPoints,
          scored: user.predictions.length,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  } catch {
    return [];
  }
}

function UserInitials({ name }: { name: string }) {
  const colors = [
    "bg-red-500/15 text-red-600 dark:text-red-400",
    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  ];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0", colors[idx])}>
      {initials}
    </span>
  );
}

export default async function LoginPage() {
  const standings = await getStandings();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4 py-10">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 justify-center">

          {/* Login form */}
          <div className="w-full max-w-sm mx-auto lg:mx-0 flex-shrink-0">
            <LoginForm />
          </div>

          {/* Standings — always shown */}
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:flex-1 lg:max-w-none">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/30">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <div>
                  <h2 className="font-bold text-sm">Standings</h2>
                  <p className="text-xs text-muted-foreground">Live leaderboard</p>
                </div>
              </div>

              {standings.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                  No scores yet — game just started!
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {standings.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3",
                        player.rank === 1 && "bg-amber-500/5"
                      )}
                    >
                      <span className="w-6 text-center text-sm font-bold flex-shrink-0">
                        {player.rank <= 3
                          ? MEDALS[player.rank - 1]
                          : <span className="text-muted-foreground text-xs">{player.rank}</span>
                        }
                      </span>
                      <UserInitials name={player.name} />
                      <span className={cn(
                        "flex-1 text-sm font-semibold truncate",
                        player.rank === 1 && "text-amber-600 dark:text-amber-400"
                      )}>
                        {player.name}
                      </span>
                      <div className="text-right flex-shrink-0">
                        <span className={cn(
                          "text-sm font-bold tabular-nums",
                          player.rank === 1 && "text-amber-600 dark:text-amber-400"
                        )}>
                          {player.totalPoints}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-0.5">pt</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-5 py-3 border-t border-border">
                <p className="text-[11px] text-muted-foreground text-center">
                  Log in to see full breakdown &amp; make predictions
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
