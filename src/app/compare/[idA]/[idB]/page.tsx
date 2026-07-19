import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/constants";
import { calculateTournamentPoints } from "@/lib/scoring";
import { getActualTournamentResults } from "@/lib/tournament";

export const revalidate = 60;

const AVATAR_COLORS = [
  "bg-red-500/15 text-red-600 dark:text-red-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];

function avatarColor(name: string) {
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Prediction = {
  homeScore: number | null;
  awayScore: number | null;
  predictedWinner: string | null;
  match: { homeTeam: string; awayTeam: string };
};

function predLabel(p: Prediction): string {
  if (p.homeScore !== null && p.awayScore !== null)
    return `${p.homeScore}–${p.awayScore}`;
  if (p.predictedWinner === "home") return p.match.homeTeam;
  if (p.predictedWinner === "away") return p.match.awayTeam;
  return "Draw";
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ idA: string; idB: string }>;
}) {
  const { idA, idB } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [playerA, playerB, allUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: idA },
      include: {
        predictions: {
          where: { points: { not: null } },
          include: { match: true },
          orderBy: { match: { kickoff: "asc" } },
        },
        tournamentPredictions: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: idB },
      include: {
        predictions: {
          where: { points: { not: null } },
          include: { match: true },
          orderBy: { match: { kickoff: "asc" } },
        },
        tournamentPredictions: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "USER", activatedAt: { not: null } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!playerA?.activatedAt || !playerB?.activatedAt) notFound();

  const {
    champion: actualChampion,
    topScorer: actualTopScorer,
    topAssist: actualTopAssist,
    bestGoalkeeper: actualBestGoalkeeper,
  } = await getActualTournamentResults();

  function getTournamentPoints(
    player: NonNullable<typeof playerA>
  ) {
    const latest =
      player.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
      player.tournamentPredictions.find((t) => t.window === "INITIAL");
    if (!actualChampion || !latest) return 0;
    return calculateTournamentPoints(latest, {
      champion: actualChampion,
      topScorer: actualTopScorer,
      topAssist: actualTopAssist,
      bestGoalkeeper: actualBestGoalkeeper,
    });
  }

  const aMatchPoints = playerA.predictions.reduce(
    (s, p) => s + (p.points ?? 0),
    0
  );
  const bMatchPoints = playerB.predictions.reduce(
    (s, p) => s + (p.points ?? 0),
    0
  );
  const aTotal = aMatchPoints + getTournamentPoints(playerA);
  const bTotal = bMatchPoints + getTournamentPoints(playerB);

  const aMap = new Map(playerA.predictions.map((p) => [p.matchId, p]));
  const bMap = new Map(playerB.predictions.map((p) => [p.matchId, p]));
  const sharedMatchIds = [...aMap.keys()].filter((mid) => bMap.has(mid));

  let h2hWins = 0,
    h2hDraws = 0,
    h2hLosses = 0;
  const h2hRows: Array<{
    matchId: string;
    label: string;
    stage: string;
    aPts: number;
    bPts: number;
    aPred: string;
    bPred: string;
  }> = [];

  for (const matchId of sharedMatchIds) {
    const a = aMap.get(matchId)!;
    const b = bMap.get(matchId)!;
    const aPts = a.points ?? 0;
    const bPts = b.points ?? 0;
    if (aPts > bPts) h2hWins++;
    else if (aPts < bPts) h2hLosses++;
    else h2hDraws++;

    h2hRows.push({
      matchId,
      label: `${a.match.homeTeam} v ${a.match.awayTeam}`,
      stage: STAGE_LABELS[a.match.stage] ?? a.match.stage,
      aPts,
      bPts,
      aPred: predLabel(a),
      bPred: predLabel(b),
    });
  }

  const isMe = (uid: string) => uid === session.userId;

  return (
    <PageWrapper>
      <div className="space-y-5">
        <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">
          Head-to-Head
        </div>

        {/* Player cards */}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { player: playerA, total: aTotal },
              { player: playerB, total: bTotal },
            ] as const
          ).map(({ player, total }) => (
            <div
              key={player.id}
              className={cn(
                "bg-card border rounded-2xl p-4 text-center space-y-2",
                isMe(player.id) ? "border-primary/40" : "border-border"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto",
                  avatarColor(player.name ?? "")
                )}
              >
                {initials(player.name ?? "?")}
              </div>
              <p className="text-sm font-semibold truncate">
                {player.name}
                {isMe(player.id) && (
                  <span className="text-muted-foreground font-normal text-xs ml-1">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {total}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  pts
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* H2H Record */}
        {sharedMatchIds.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Direct Record ({sharedMatchIds.length} match
              {sharedMatchIds.length !== 1 ? "es" : ""})
            </p>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {h2hWins}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  Won
                </p>
              </div>
              <div>
                <p className="text-xl font-bold text-muted-foreground">
                  {h2hDraws}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  Drew
                </p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{h2hLosses}</p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  Lost
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              From {playerA.name?.split(" ")[0]}&apos;s perspective
            </p>
          </div>
        )}

        {/* Stat grid */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Stats
          </p>
          <StatRow
            label="Exact"
            aVal={
              playerA.predictions.filter((p) => p.reason === "exact_score")
                .length
            }
            bVal={
              playerB.predictions.filter((p) => p.reason === "exact_score")
                .length
            }
            color="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          />
          <StatRow
            label="Goal Diff"
            aVal={
              playerA.predictions.filter(
                (p) => p.reason === "correct_winner_goal_diff"
              ).length
            }
            bVal={
              playerB.predictions.filter(
                (p) => p.reason === "correct_winner_goal_diff"
              ).length
            }
            color="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
          />
          <StatRow
            label="Winner"
            aVal={
              playerA.predictions.filter(
                (p) => p.reason === "correct_winner_only"
              ).length
            }
            bVal={
              playerB.predictions.filter(
                (p) => p.reason === "correct_winner_only"
              ).length
            }
            color="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Match by match */}
        {h2hRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Match by match
            </p>
            <div className="space-y-1.5">
              {h2hRows.map((row) => (
                <div
                  key={row.matchId}
                  className="bg-card border border-border rounded-xl px-3 py-2.5"
                >
                  <p className="text-xs font-semibold text-center truncate">
                    {row.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground text-center mb-2">
                    {row.stage}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          row.aPts === 6 || row.aPts === 7
                            ? "text-emerald-600 dark:text-emerald-400"
                            : row.aPts === 4 || row.aPts === 5
                            ? "text-blue-600 dark:text-blue-400"
                            : row.aPts === 2 || row.aPts === 3
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {row.aPts}pt
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.aPred}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      vs
                    </span>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          row.bPts === 6 || row.bPts === 7
                            ? "text-emerald-600 dark:text-emerald-400"
                            : row.bPts === 4 || row.bPts === 5
                            ? "text-blue-600 dark:text-blue-400"
                            : row.bPts === 2 || row.bPts === 3
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {row.bPts}pt
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.bPred}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compare against someone else */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Compare {playerA.name?.split(" ")[0]} against…
          </p>
          <div className="flex flex-wrap gap-2">
            {allUsers
              .filter((u) => u.id !== idA)
              .map((u) => (
                <a
                  key={u.id}
                  href={`/compare/${idA}/${u.id}`}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    u.id === idB
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  )}
                >
                  {u.name}
                </a>
              ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatRow({
  label,
  aVal,
  bVal,
  color,
}: {
  label: string;
  aVal: number;
  bVal: number;
  color: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-3", color)}>
      <div className="flex justify-between items-center">
        <span className="text-base font-bold tabular-nums">{aVal}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
          {label}
        </span>
        <span className="text-base font-bold tabular-nums">{bVal}</span>
      </div>
    </div>
  );
}
