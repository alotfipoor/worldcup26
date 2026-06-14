# Score-Only Predictions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the winner-only prediction mode so users only predict scores; derive `predictedWinner` automatically from the submitted score.

**Architecture:** Two files change. The form loses the mode toggle and winner buttons. The API route drops the winner-only validation path and instead derives `predictedWinner` from the scores before writing to the DB. Existing winner-only rows in the DB are untouched; scoring logic is unchanged.

**Tech Stack:** Next.js 15, React, Prisma (PostgreSQL)

---

### Task 1: Simplify the API route to score-only + auto-derive winner

**Files:**
- Modify: `src/app/api/predictions/[matchId]/route.ts`

- [ ] **Step 1: Replace the PUT handler body**

Replace lines 38–89 in `src/app/api/predictions/[matchId]/route.ts` with the following (everything from `const body = await req.json()` through the `upsert` call):

```typescript
  const body = await req.json();
  const { homeScore, awayScore } = body;

  if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
    return NextResponse.json({ error: "Provide home and away scores" }, { status: 400 });
  }

  const h = parseInt(homeScore);
  const a = parseInt(awayScore);
  if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const derivedWinner = h > a ? "home" : a > h ? "away" : "draw";

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.userId, matchId } },
    create: {
      userId: session.userId,
      matchId,
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
    },
    update: {
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
      points: null,
      reason: null,
    },
  });

  return NextResponse.json({ prediction });
```

The full PUT handler after the edit should look like this:

```typescript
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (isPredictionLocked(match.kickoff)) {
    return NextResponse.json({ error: "Predictions are locked for this match" }, { status: 423 });
  }

  const body = await req.json();
  const { homeScore, awayScore } = body;

  if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
    return NextResponse.json({ error: "Provide home and away scores" }, { status: 400 });
  }

  const h = parseInt(homeScore);
  const a = parseInt(awayScore);
  if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const derivedWinner = h > a ? "home" : a > h ? "away" : "draw";

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.userId, matchId } },
    create: {
      userId: session.userId,
      matchId,
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
    },
    update: {
      homeScore: h,
      awayScore: a,
      predictedWinner: derivedWinner,
      points: null,
      reason: null,
    },
  });

  return NextResponse.json({ prediction });
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/predictions/[matchId]/route.ts
git commit -m "feat: score-only predictions, derive winner from score automatically"
```

---

### Task 2: Simplify PredictionForm to score inputs only

**Files:**
- Modify: `src/components/matches/PredictionForm.tsx`

- [ ] **Step 1: Replace the file contents**

Rewrite `src/components/matches/PredictionForm.tsx` entirely:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface PredictionFormProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  isKnockout: boolean;
  lockTime: Date;
  initialPrediction?: {
    homeScore: number | null;
    awayScore: number | null;
    predictedWinner: string | null;
  } | null;
}

export default function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  lockTime,
  initialPrediction,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(
    initialPrediction?.homeScore?.toString() ?? "0"
  );
  const [awayScore, setAwayScore] = useState(
    initialPrediction?.awayScore?.toString() ?? "0"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (initialPrediction?.homeScore !== null && initialPrediction?.homeScore !== undefined) {
      setHomeScore(initialPrediction.homeScore.toString());
      setAwayScore(initialPrediction.awayScore?.toString() ?? "0");
    }
  }, [initialPrediction]);

  useEffect(() => {
    function tick() {
      const diff = lockTime.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Locked");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) setTimeLeft(`Closes in ${h}h ${m}m`);
      else setTimeLeft(`Closes in ${m}m`);
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lockTime]);

  async function save() {
    setSaving(true);
    setSaved(false);

    const res = await fetch(`/api/predictions/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Failed to save prediction");
      return;
    }

    setSaved(true);
    toast.success("Prediction saved!");
    setTimeout(() => setSaved(false), 3000);
  }

  const canSave =
    homeScore !== "" &&
    awayScore !== "" &&
    !isNaN(parseInt(homeScore)) &&
    !isNaN(parseInt(awayScore));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-right">{timeLeft}</p>

      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground text-center truncate">
            {homeTeam}
          </p>
          <Input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="text-center text-2xl font-bold h-16 tabular-nums"
            placeholder="0"
          />
        </div>
        <span className="text-xl font-bold text-muted-foreground flex-shrink-0">
          –
        </span>
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground text-center truncate">
            {awayTeam}
          </p>
          <Input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="text-center text-2xl font-bold h-16 tabular-nums"
            placeholder="0"
          />
        </div>
      </div>

      <Button
        onClick={save}
        disabled={!canSave || saving}
        className="w-full h-12 text-base"
      >
        {saving ? (
          "Saving…"
        ) : saved ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Saved!
          </span>
        ) : initialPrediction ? (
          "Update prediction"
        ) : (
          "Save prediction"
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        Exact score: 6pts · Right winner + goal diff: 4pts · Right winner: 2pts · Can update until kickoff
      </p>
    </div>
  );
}
```

Note: `isKnockout` is removed from the props destructuring since it's no longer used in the form (score draws in knockout rounds are fine to enter — the scoring logic handles them correctly against the actual result).

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. If there's a TypeScript complaint about `isKnockout` being passed but unused, that's fine — it's still declared in the interface for any callers that pass it.

- [ ] **Step 3: Verify the dev build**

```bash
cd /Users/ashkan/Code/worldcup26 && npm run build 2>&1 | tail -20
```

Expected: build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add src/components/matches/PredictionForm.tsx
git commit -m "feat: remove winner-only mode from prediction form, score inputs only"
```

---

### Task 3: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/ashkan/Code/worldcup26 && npm run dev
```

- [ ] **Step 2: Navigate to an unlocked match and verify**

Open `http://localhost:3000` in a browser, find an upcoming match, and confirm:
- Only score inputs are shown (no toggle tabs, no winner buttons)
- Entering a score (e.g. 2–1) and clicking "Save prediction" succeeds
- The MatchCard shows "2–1" in the prediction badge
- Refreshing the page pre-fills the score inputs with the saved values

- [ ] **Step 3: Verify a draw score derives "draw" winner correctly**

Predict 1–1 for a group match. After saving, check the DB or the API response (`GET /api/predictions/[matchId]`) to confirm `predictedWinner = "draw"`.
