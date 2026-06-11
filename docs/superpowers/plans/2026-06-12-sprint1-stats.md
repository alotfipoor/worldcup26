# Sprint 1: Stats & Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four display-only stat features to KickPick: form guide on the leaderboard, a cumulative points timeline chart, head-to-head player comparison, and a prediction reveal on finished match pages.

**Architecture:** All four features are pure display additions — no schema changes, no migrations. Data comes from existing Prisma models. One new API route for timeline data; three new components; two new pages. Follow existing patterns throughout (server components by default, `"use client"` only where interactivity is needed).

**Tech Stack:** Next.js 16, Prisma, TypeScript, Tailwind CSS, shadcn/ui, `recharts` (new dependency for timeline chart)

---

## Task 1: Install recharts

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install recharts**

```bash
cd /Users/ashkan/Code/worldcup26
npm install recharts
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify it installed**

```bash
ls node_modules/recharts/es/index.js
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add recharts for timeline chart"
```

---

## Task 2: Add `formGuide` to `LeaderboardUser` type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `formGuide` field to `LeaderboardUser`**

Open `src/types/index.ts`. Replace the `LeaderboardUser` interface:

```typescript
export type FormResult = "exact_score" | "correct_winner_goal_diff" | "correct_winner_only" | "wrong" | "none";

export interface LeaderboardUser {
  id: string;
  name: string;
  rank: number;
  exactCount: number;
  winnerGoalsCount: number;
  winnerOnlyCount: number;
  matchPoints: number;
  tournamentPoints: number;
  totalPoints: number;
  predictionsSubmitted: number;
  predictionsScored: number;
  formGuide: FormResult[]; // last 5 scored predictions, oldest→newest, padded with "none"
}
```

- [ ] **Step 2: Verify no type errors**

```bash
cd /Users/ashkan/Code/worldcup26
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only in files that build `LeaderboardUser` without `formGuide` yet (those get fixed in Task 3).

---

## Task 3: Update leaderboard data helpers to include `formGuide`

There are three places that build `LeaderboardUser` objects: `src/app/page.tsx`, `src/app/leaderboard/page.tsx`, and `src/app/api/leaderboard/route.ts`. All three need the same update: include match kickoff in the predictions query, compute the form guide.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/leaderboard/page.tsx`
- Modify: `src/app/api/leaderboard/route.ts`

### 3a — `src/app/page.tsx`

- [ ] **Step 1: Update the predictions select in `getLeaderboardData`**

Find this block in `getLeaderboardData`:
```typescript
predictions: {
  where: { points: { not: null } },
  select: { points: true, reason: true },
},
```

Replace with:
```typescript
predictions: {
  where: { points: { not: null } },
  select: {
    points: true,
    reason: true,
    match: { select: { kickoff: true } },
  },
},
```

- [ ] **Step 2: Add formGuide computation in the `.map()` in `getLeaderboardData`**

Find where the `return { id, name, rank, exactCount, ... }` object is built. Add `formGuide` to it:

```typescript
// After the existing exactCount/winnerGoalsCount/winnerOnlyCount lines:
const last5 = [...user.predictions]
  .sort((a, b) => new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime())
  .slice(0, 5)
  .reverse();
const formGuide: import("@/types").FormResult[] = Array.from({ length: 5 }, (_, i) => {
  const p = last5[i];
  if (!p) return "none";
  return (p.reason as import("@/types").FormResult) ?? "wrong";
});
```

Then add `formGuide` to the returned object:
```typescript
return {
  id: user.id,
  name: user.name ?? "Unknown",
  rank: 0,
  exactCount,
  winnerGoalsCount,
  winnerOnlyCount,
  matchPoints,
  tournamentPoints,
  totalPoints: matchPoints + tournamentPoints,
  predictionsSubmitted: user.predictions.length,
  predictionsScored: user.predictions.filter((p) => p.points !== null).length,
  formGuide,
};
```

### 3b — `src/app/leaderboard/page.tsx`

Apply the identical changes as 3a to the `getLeaderboard` function in this file.

### 3c — `src/app/api/leaderboard/route.ts`

Apply the identical changes as 3a to the route handler's `users.map()` block.

- [ ] **Step 3: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only in `LeaderboardTable.tsx` (needs `formGuide` in render — fixed next task).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/app/page.tsx src/app/leaderboard/page.tsx src/app/api/leaderboard/route.ts
git commit -m "feat: compute formGuide in leaderboard data helpers"
```

---

## Task 4: Render form guide dots in `LeaderboardTable`

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTable.tsx`

- [ ] **Step 1: Add the `FormDots` helper component**

At the top of `LeaderboardTable.tsx` (after the imports), add:

```typescript
import type { FormResult } from "@/types";

const FORM_COLORS: Record<FormResult, string> = {
  exact_score:                   "bg-emerald-500",
  correct_winner_goal_diff:      "bg-blue-500",
  correct_winner_only:           "bg-amber-400",
  wrong:                         "bg-red-400",
  none:                          "bg-muted-foreground/20",
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
```

- [ ] **Step 2: Add `formGuide` to the `LeaderboardTableProps` type (it already comes in via `users: LeaderboardUser[]`, no change needed — `LeaderboardUser` now has `formGuide`)**

- [ ] **Step 3: Render `FormDots` inside the player name cell**

Find the player name cell (the `<div className="min-w-0">` block). Currently it looks like:

```typescript
<div className="min-w-0">
  <span className={cn(
    "text-sm font-semibold truncate block leading-tight",
    isMe && "text-primary"
  )}>
    {user.name}
  </span>
  {isMe && (
    <span className="text-[10px] text-muted-foreground leading-tight">you</span>
  )}
</div>
```

Replace with:

```typescript
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
```

- [ ] **Step 4: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 5: Visually verify in browser**

Navigate to `/leaderboard`. Each player row should show 5 small dots under their name. Players with no scored predictions show 5 gray dots.

- [ ] **Step 6: Commit**

```bash
git add src/components/leaderboard/LeaderboardTable.tsx
git commit -m "feat: show last-5 form guide dots on leaderboard"
```

---

## Task 5: Timeline API route

**Files:**
- Create: `src/app/api/stats/timeline/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/stats/timeline/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface TimelineMatch {
  id: string;
  label: string;
  kickoff: string;
}

export interface TimelinePlayer {
  id: string;
  name: string;
  cumulative: number[]; // cumulative[i] = total points after match[i]
}

export interface TimelineData {
  matches: TimelineMatch[];
  players: TimelinePlayer[];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // All FINISHED matches that have at least one scored prediction, sorted by kickoff
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      predictions: { some: { points: { not: null } } },
    },
    select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
    orderBy: { kickoff: "asc" },
  });

  if (matches.length === 0) {
    return NextResponse.json({ matches: [], players: [] } satisfies TimelineData);
  }

  // All activated users
  const users = await prisma.user.findMany({
    where: { role: "USER", activatedAt: { not: null } },
    select: {
      id: true,
      name: true,
      predictions: {
        where: { points: { not: null } },
        select: { matchId: true, points: true },
      },
    },
  });

  const matchList: TimelineMatch[] = matches.map((m) => ({
    id: m.id,
    label: `${m.homeTeam} v ${m.awayTeam}`,
    kickoff: m.kickoff.toISOString(),
  }));

  const players: TimelinePlayer[] = users.map((user) => {
    const pointsByMatch = new Map(
      user.predictions.map((p) => [p.matchId, p.points ?? 0])
    );

    let cumulative = 0;
    const data = matches.map((m) => {
      cumulative += pointsByMatch.get(m.id) ?? 0;
      return cumulative;
    });

    return {
      id: user.id,
      name: user.name ?? "Unknown",
      cumulative: data,
    };
  });

  return NextResponse.json({ matches: matchList, players } satisfies TimelineData);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "timeline" | head -10
```

Expected: no errors for this file.

- [ ] **Step 3: Manually test the endpoint**

With the dev server running, open `http://localhost:3000/api/stats/timeline` in the browser (logged in). Verify you get JSON with `matches` and `players` arrays.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stats/timeline/route.ts
git commit -m "feat: add /api/stats/timeline endpoint"
```

---

## Task 6: `TimelineChart` component

**Files:**
- Create: `src/components/leaderboard/TimelineChart.tsx`
- Modify: `src/app/leaderboard/page.tsx`

### 6a — Create the component

- [ ] **Step 1: Create `src/components/leaderboard/TimelineChart.tsx`**

```typescript
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TimelineData } from "@/app/api/stats/timeline/route";

// Same palette as UserAvatar in LeaderboardTable
const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#10b981", // emerald
  "#a855f7", // purple
  "#f97316", // orange
  "#ec4899", // pink
  "#06b6d4", // cyan
];

interface TimelineChartProps {
  data: TimelineData;
  currentUserId: string;
}

export default function TimelineChart({ data, currentUserId }: TimelineChartProps) {
  if (data.matches.length < 3) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Chart available after 3+ matches are scored.
      </p>
    );
  }

  // Build recharts data: array of { label, [playerName]: points, ... }
  const chartData = data.matches.map((match, matchIdx) => {
    const entry: Record<string, string | number> = { label: match.label };
    data.players.forEach((player) => {
      entry[player.id] = player.cumulative[matchIdx];
    });
    return entry;
  });

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={28}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: 12,
            }}
            labelFormatter={(label) => String(label)}
            formatter={(value, name) => {
              const player = data.players.find((p) => p.id === name);
              return [`${value}pt`, player?.name ?? String(name)];
            }}
          />
          <Legend
            formatter={(value) => {
              const player = data.players.find((p) => p.id === value);
              return (
                <span style={{ fontSize: 11 }}>{player?.name ?? value}</span>
              );
            }}
          />
          {data.players.map((player, i) => (
            <Line
              key={player.id}
              type="monotone"
              dataKey={player.id}
              stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
              strokeWidth={player.id === currentUserId ? 2.5 : 1.5}
              strokeOpacity={player.id === currentUserId ? 1 : 0.65}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 6b — Add chart to leaderboard page

- [ ] **Step 2: Update `src/app/leaderboard/page.tsx` to fetch timeline data and render the chart**

Add import at top:
```typescript
import type { TimelineData } from "@/app/api/stats/timeline/route";
```

In the `LeaderboardPage` function, after the existing `getLeaderboard()` call, add a fetch for timeline data:
```typescript
const [users, timelineData] = await Promise.all([
  getLeaderboard(),
  prisma.match.findMany({
    where: {
      status: "FINISHED",
      predictions: { some: { points: { not: null } } },
    },
    select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
    orderBy: { kickoff: "asc" },
  }).then(async (matches) => {
    if (matches.length === 0) return { matches: [], players: [] } as TimelineData;
    const allUsers = await prisma.user.findMany({
      where: { role: "USER", activatedAt: { not: null } },
      select: {
        id: true,
        name: true,
        predictions: {
          where: { points: { not: null } },
          select: { matchId: true, points: true },
        },
      },
    });
    const matchList = matches.map((m) => ({
      id: m.id,
      label: `${m.homeTeam} v ${m.awayTeam}`,
      kickoff: m.kickoff.toISOString(),
    }));
    const players = allUsers.map((user) => {
      const ptMap = new Map(user.predictions.map((p) => [p.matchId, p.points ?? 0]));
      let cum = 0;
      return {
        id: user.id,
        name: user.name ?? "Unknown",
        cumulative: matches.map((m) => { cum += ptMap.get(m.id) ?? 0; return cum; }),
      };
    });
    return { matches: matchList, players } as TimelineData;
  }),
]);
```

Then in the JSX, after `<LeaderboardTable ... />`, add a collapsible chart section. Add these imports:

```typescript
import TimelineChart from "@/components/leaderboard/TimelineChart";
```

And add this JSX block after the table:

```tsx
{timelineData.matches.length >= 3 && (
  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
    <h2 className="text-sm font-semibold">Points over time</h2>
    <TimelineChart data={timelineData} currentUserId={session.userId} />
  </div>
)}
```

Note: `TimelineChart` is a client component, so it won't need any special wrapper — Next.js handles this automatically when a server component renders a client component.

- [ ] **Step 3: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 4: Visually verify in browser**

Navigate to `/leaderboard`. Below the standings table (once 3+ matches are scored), a line chart should appear showing each player's cumulative points.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/TimelineChart.tsx src/app/leaderboard/page.tsx
git commit -m "feat: add cumulative points timeline chart to leaderboard"
```

---

## Task 7: Head-to-Head comparison page

**Files:**
- Create: `src/app/compare/[idA]/[idB]/page.tsx`
- Modify: `src/app/players/[id]/page.tsx`

### 7a — Create the comparison page

- [ ] **Step 1: Create `src/app/compare/[idA]/[idB]/page.tsx`**

```typescript
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/constants";
import { calculateTournamentPoints } from "@/lib/scoring";

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
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
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

  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";

  function getTournamentPoints(player: typeof playerA) {
    const latest =
      player.tournamentPredictions.find((t) => t.window === "POST_GROUP") ??
      player.tournamentPredictions.find((t) => t.window === "INITIAL");
    if (!actualChampion || !latest) return 0;
    return calculateTournamentPoints(latest, { champion: actualChampion, topScorer: actualTopScorer });
  }

  const aTotal = playerA.predictions.reduce((s, p) => s + (p.points ?? 0), 0) + getTournamentPoints(playerA);
  const bTotal = playerB.predictions.reduce((s, p) => s + (p.points ?? 0), 0) + getTournamentPoints(playerB);

  // Head-to-head: matches both predicted
  const aMap = new Map(playerA.predictions.map((p) => [p.matchId, p]));
  const bMap = new Map(playerB.predictions.map((p) => [p.matchId, p]));
  const sharedMatchIds = [...aMap.keys()].filter((id) => bMap.has(id));

  let h2hWins = 0, h2hDraws = 0, h2hLosses = 0;
  const h2hRows: {
    matchId: string;
    label: string;
    stage: string;
    aPts: number;
    bPts: number;
    aPred: string;
    bPred: string;
  }[] = [];

  for (const matchId of sharedMatchIds) {
    const a = aMap.get(matchId)!;
    const b = bMap.get(matchId)!;
    const aPts = a.points ?? 0;
    const bPts = b.points ?? 0;
    if (aPts > bPts) h2hWins++;
    else if (aPts < bPts) h2hLosses++;
    else h2hDraws++;

    function predLabel(p: typeof a) {
      if (p.homeScore !== null && p.awayScore !== null) {
        return `${p.homeScore}–${p.awayScore}`;
      }
      if (p.predictedWinner === "home") return `${p.match.homeTeam}`;
      if (p.predictedWinner === "away") return `${p.match.awayTeam}`;
      return "Draw";
    }

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

  function StatBox({ label, aVal, bVal, color }: { label: string; aVal: number; bVal: number; color: string }) {
    return (
      <div className={cn("rounded-2xl border p-3 text-center space-y-0.5", color)}>
        <div className="flex justify-between text-base font-bold tabular-nums">
          <span>{aVal}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 self-center">{label}</span>
          <span>{bVal}</span>
        </div>
      </div>
    );
  }

  const isMe = (id: string) => id === session.userId;

  return (
    <PageWrapper>
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center text-xs text-muted-foreground">Head-to-Head</div>

        {/* Player cards */}
        <div className="grid grid-cols-2 gap-3">
          {([playerA, playerB] as const).map((player, i) => {
            const total = i === 0 ? aTotal : bTotal;
            return (
              <div key={player.id} className={cn(
                "bg-card border rounded-2xl p-4 text-center space-y-2",
                isMe(player.id) ? "border-primary/40" : "border-border"
              )}>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto",
                  avatarColor(player.name ?? "")
                )}>
                  {initials(player.name ?? "?")}
                </div>
                <p className="text-sm font-semibold truncate">{player.name}{isMe(player.id) && <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>}</p>
                <p className="text-2xl font-bold tabular-nums">{total}<span className="text-xs font-normal text-muted-foreground ml-1">pts</span></p>
              </div>
            );
          })}
        </div>

        {/* H2H Record */}
        {sharedMatchIds.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Direct Record ({sharedMatchIds.length} matches)</p>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{h2hWins}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Won</p>
              </div>
              <div>
                <p className="text-xl font-bold text-muted-foreground">{h2hDraws}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Drew</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{h2hLosses}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Lost</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">From {playerA.name?.split(" ")[0]}&apos;s perspective</p>
          </div>
        )}

        {/* Stat grid */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Stats comparison</p>
          <StatBox
            label="Exact"
            aVal={playerA.predictions.filter((p) => p.reason === "exact_score").length}
            bVal={playerB.predictions.filter((p) => p.reason === "exact_score").length}
            color="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          />
          <StatBox
            label="Goal Diff"
            aVal={playerA.predictions.filter((p) => p.reason === "correct_winner_goal_diff").length}
            bVal={playerB.predictions.filter((p) => p.reason === "correct_winner_goal_diff").length}
            color="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
          />
          <StatBox
            label="Winner"
            aVal={playerA.predictions.filter((p) => p.reason === "correct_winner_only").length}
            bVal={playerB.predictions.filter((p) => p.reason === "correct_winner_only").length}
            color="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Match-by-match */}
        {h2hRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Match by match</p>
            <div className="space-y-1.5">
              {h2hRows.map((row) => (
                <div key={row.matchId} className="bg-card border border-border rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-center truncate">{row.label}</p>
                  <p className="text-[10px] text-muted-foreground text-center mb-2">{row.stage}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className={cn("text-sm font-bold tabular-nums", row.aPts === 6 ? "text-emerald-600 dark:text-emerald-400" : row.aPts === 4 ? "text-blue-600 dark:text-blue-400" : row.aPts === 2 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{row.aPts}pt</p>
                      <p className="text-[10px] text-muted-foreground">{row.aPred}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs</span>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold tabular-nums", row.bPts === 6 ? "text-emerald-600 dark:text-emerald-400" : row.bPts === 4 ? "text-blue-600 dark:text-blue-400" : row.bPts === 2 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{row.bPts}pt</p>
                      <p className="text-[10px] text-muted-foreground">{row.bPred}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compare with someone else */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Compare {playerA.name?.split(" ")[0]} against...</p>
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
```

### 7b — Add "Compare" button to player profile

- [ ] **Step 2: Update `src/app/players/[id]/page.tsx`**

Add a fetch for all other active users (for the compare dropdown). In the existing data fetch block, add:

```typescript
const otherPlayers = await prisma.user.findMany({
  where: { role: "USER", activatedAt: { not: null }, NOT: { id } },
  select: { id: true, name: true },
  orderBy: { name: "asc" },
});
```

Then in the JSX, after the hero header card (the `div` with `bg-card border border-border rounded-2xl p-6`), add a "Compare" button:

```tsx
{otherPlayers.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {otherPlayers.map((other) => (
      <a
        key={other.id}
        href={`/compare/${id}/${other.id}`}
        className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        vs {other.name}
      </a>
    ))}
  </div>
)}
```

- [ ] **Step 3: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 4: Visually verify in browser**

Visit any player profile. The "vs [name]" buttons should appear. Clicking one goes to `/compare/[idA]/[idB]` and shows the comparison.

- [ ] **Step 5: Commit**

```bash
git add src/app/compare/[idA]/[idB]/page.tsx src/app/players/[id]/page.tsx
git commit -m "feat: add head-to-head comparison page"
```

---

## Task 8: Prediction reveal on finished match pages

**Files:**
- Create: `src/components/matches/PredictionReveal.tsx`
- Modify: `src/app/matches/[id]/page.tsx`

### 8a — Create the `PredictionReveal` component

- [ ] **Step 1: Create `src/components/matches/PredictionReveal.tsx`**

```typescript
import { cn } from "@/lib/utils";

interface RevealPrediction {
  userId: string;
  userName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinner: string | null;
  points: number;
  reason: string | null;
}

interface PredictionRevealProps {
  predictions: RevealPrediction[];
  homeTeam: string;
  awayTeam: string;
  currentUserId: string;
}

const REASON_BADGE: Record<string, { label: string; color: string }> = {
  exact_score:                 { label: "Exact", color: "text-emerald-600 dark:text-emerald-400" },
  correct_winner_goal_diff:    { label: "Goal diff", color: "text-blue-600 dark:text-blue-400" },
  correct_winner_only:         { label: "Winner", color: "text-amber-600 dark:text-amber-400" },
  wrong:                       { label: "Miss", color: "text-red-500" },
};

export default function PredictionReveal({
  predictions,
  homeTeam,
  awayTeam,
  currentUserId,
}: PredictionRevealProps) {
  if (predictions.length === 0) return null;

  // Distribution summary
  let homeWinCount = 0, drawCount = 0, awayWinCount = 0;
  for (const p of predictions) {
    if (p.homeScore !== null && p.awayScore !== null) {
      if (p.homeScore > p.awayScore) homeWinCount++;
      else if (p.awayScore > p.homeScore) awayWinCount++;
      else drawCount++;
    } else if (p.predictedWinner === "home") homeWinCount++;
    else if (p.predictedWinner === "away") awayWinCount++;
    else if (p.predictedWinner === "draw") drawCount++;
  }

  const total = predictions.length;

  function predLabel(p: RevealPrediction) {
    if (p.homeScore !== null && p.awayScore !== null) {
      return `${p.homeScore}–${p.awayScore}`;
    }
    if (p.predictedWinner === "home") return homeTeam;
    if (p.predictedWinner === "away") return awayTeam;
    if (p.predictedWinner === "draw") return "Draw";
    return "–";
  }

  function DistBar({ count, label, color }: { count: number; label: string; color: string }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div className="flex-1 text-center space-y-1">
        <div className={cn("text-sm font-bold tabular-nums", color)}>{count}</div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color.replace("text-", "bg-").replace(" dark:text-", " dark:bg-").split(" ")[0])} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm">What everyone predicted</h2>

      {/* Distribution */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex gap-4">
          <DistBar count={homeWinCount} label={homeTeam} color="text-blue-600 dark:text-blue-400" />
          <DistBar count={drawCount} label="Draw" color="text-muted-foreground" />
          <DistBar count={awayWinCount} label={awayTeam} color="text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">{total} prediction{total !== 1 ? "s" : ""} submitted</p>
      </div>

      {/* Per-player list */}
      <div className="space-y-1.5">
        {predictions
          .sort((a, b) => b.points - a.points)
          .map((p) => {
            const badge = REASON_BADGE[p.reason ?? "wrong"] ?? REASON_BADGE.wrong;
            const isMe = p.userId === currentUserId;
            return (
              <div
                key={p.userId}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm",
                  isMe ? "bg-primary/10 border-primary/30" : "bg-card border-border"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("font-medium truncate", isMe && "text-primary")}>
                    {p.userName}{isMe && <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-muted-foreground text-xs">{predLabel(p)}</span>
                  <span className={cn("text-xs font-bold", badge.color)}>{badge.label}</span>
                  <span className={cn("text-sm font-bold tabular-nums", badge.color)}>{p.points}pt</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
```

### 8b — Update match detail page to fetch all predictions when finished

- [ ] **Step 2: Update `src/app/matches/[id]/page.tsx`**

At the top, add the import:
```typescript
import PredictionReveal from "@/components/matches/PredictionReveal";
```

After the existing `prediction` fetch (around line 101), add a conditional fetch for all predictions:

```typescript
const allPredictions =
  match.status === "FINISHED"
    ? await prisma.prediction.findMany({
        where: { matchId: id, points: { not: null } },
        include: { user: { select: { id: true, name: true } } },
      })
    : [];

const revealData = allPredictions.map((p) => ({
  userId: p.userId,
  userName: p.user.name ?? "Unknown",
  homeScore: p.homeScore,
  awayScore: p.awayScore,
  predictedWinner: p.predictedWinner,
  points: p.points ?? 0,
  reason: p.reason,
}));
```

Then in the JSX, after the closing `</div>` of the prediction section, add:

```tsx
{isFinished && revealData.length > 0 && (
  <>
    <div className="border-t border-border" />
    <PredictionReveal
      predictions={revealData}
      homeTeam={match.homeTeam}
      awayTeam={match.awayTeam}
      currentUserId={session.userId}
    />
  </>
)}
```

- [ ] **Step 3: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 4: Visually verify in browser**

Navigate to any finished match's detail page. Below the prediction section, you should see "What everyone predicted" with the distribution bar and per-player list.

- [ ] **Step 5: Commit**

```bash
git add src/components/matches/PredictionReveal.tsx src/app/matches/[id]/page.tsx
git commit -m "feat: reveal all predictions on finished match pages"
```

---

## Task 9: Final build check and deploy

- [ ] **Step 1: Run production build**

```bash
npm run build 2>&1 | tail -30
```

Expected: no errors. Warnings about missing env vars are fine.

- [ ] **Step 2: Fix any build errors if present**

If `recharts` causes a build issue due to SSR, wrap `TimelineChart` in a dynamic import with `ssr: false` in `leaderboard/page.tsx`:

```typescript
import dynamic from "next/dynamic";
const TimelineChart = dynamic(() => import("@/components/leaderboard/TimelineChart"), { ssr: false });
```

- [ ] **Step 3: Commit and push**

```bash
git push origin main
```

---

## Self-Review Checklist

- [x] Form guide: type updated, query updated in all 3 places, component renders dots
- [x] Timeline chart: API route + component + leaderboard page integration
- [x] H2H comparison: new page, new component, player profile entry point
- [x] Prediction reveal: component + match detail page integration
- [x] No schema changes needed for any of the above
- [x] All components handle the "no data yet" case gracefully
