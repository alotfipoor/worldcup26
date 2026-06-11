# Sprint 2: Side Bets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-created bonus prediction questions ("side bets") with deadlines, point rewards, and automatic scoring when admin marks the correct answer. Points integrate into the leaderboard.

**Architecture:** Two new Prisma models (`SideBet`, `SideBetPrediction`). Five new API routes. One new user-facing page (`/sidebets`). Admin panel extended with a "Side Bets" tab. Leaderboard totals updated to include side bet points. Follow existing patterns: server components, `NextResponse.json()` routes, `getSession()` auth.

**Tech Stack:** Next.js 16, Prisma (PostgreSQL), TypeScript, Tailwind CSS — no new dependencies.

---

## Task 1: Add Prisma models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `SideBetAnswerType` enum and two new models to `prisma/schema.prisma`**

Add after the existing `PredictionWindow` enum:

```prisma
enum SideBetAnswerType {
  TEXT
  CHOICE
}
```

Add after the `TournamentPrediction` model:

```prisma
model SideBet {
  id            String              @id @default(cuid())
  question      String
  answerType    SideBetAnswerType   @default(TEXT)
  options       Json?
  closesAt      DateTime
  correctAnswer String?
  pointsReward  Int                 @default(10)
  resolved      Boolean             @default(false)
  createdAt     DateTime            @default(now())
  predictions   SideBetPrediction[]
}

model SideBetPrediction {
  id            String    @id @default(cuid())
  userId        String
  sideBetId     String
  answer        String
  pointsAwarded Int?
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sideBet       SideBet   @relation(fields: [sideBetId], references: [id], onDelete: Cascade)

  @@unique([userId, sideBetId])
  @@index([userId])
  @@index([sideBetId])
}
```

Also add the relation to the `User` model (after `tournamentPredictions TournamentPrediction[]`):

```prisma
sideBetPredictions SideBetPrediction[]
```

- [ ] **Step 2: Push schema to database**

```bash
cd /Users/ashkan/Code/worldcup26
npm run db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors from the schema additions.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add SideBet and SideBetPrediction models"
```

---

## Task 2: Add side bet types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add side bet types**

Append to `src/types/index.ts`:

```typescript
export interface SideBetItem {
  id: string;
  question: string;
  answerType: "TEXT" | "CHOICE";
  options: string[] | null;
  closesAt: string; // ISO string
  correctAnswer: string | null;
  pointsReward: number;
  resolved: boolean;
  createdAt: string;
  myAnswer: string | null;
  myPointsAwarded: number | null;
  predictionCount: number;
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add SideBetItem type"
```

---

## Task 3: User-facing API routes

**Files:**
- Create: `src/app/api/sidebets/route.ts`
- Create: `src/app/api/sidebets/[id]/predict/route.ts`

### 3a — List side bets

- [ ] **Step 1: Create `src/app/api/sidebets/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { SideBetItem } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bets = await prisma.sideBet.findMany({
    orderBy: { closesAt: "asc" },
    include: {
      predictions: {
        select: {
          userId: true,
          answer: true,
          pointsAwarded: true,
        },
      },
    },
  });

  const items: SideBetItem[] = bets.map((bet) => {
    const myPred = bet.predictions.find((p) => p.userId === session.userId);
    return {
      id: bet.id,
      question: bet.question,
      answerType: bet.answerType,
      options: bet.options as string[] | null,
      closesAt: bet.closesAt.toISOString(),
      correctAnswer: bet.correctAnswer,
      pointsReward: bet.pointsReward,
      resolved: bet.resolved,
      createdAt: bet.createdAt.toISOString(),
      myAnswer: myPred?.answer ?? null,
      myPointsAwarded: myPred?.pointsAwarded ?? null,
      predictionCount: bet.predictions.length,
    };
  });

  return NextResponse.json({ bets: items });
}
```

### 3b — Submit / update a prediction

- [ ] **Step 2: Create `src/app/api/sidebets/[id]/predict/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const answer = (body?.answer ?? "").trim();

  if (!answer) {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

  const bet = await prisma.sideBet.findUnique({ where: { id } });
  if (!bet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bet.resolved) return NextResponse.json({ error: "Bet already resolved" }, { status: 400 });
  if (new Date() > bet.closesAt) return NextResponse.json({ error: "Bet is closed" }, { status: 400 });

  const prediction = await prisma.sideBetPrediction.upsert({
    where: { userId_sideBetId: { userId: session.userId, sideBetId: id } },
    update: { answer },
    create: { userId: session.userId, sideBetId: id, answer },
  });

  return NextResponse.json({ prediction });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sidebets/route.ts src/app/api/sidebets/[id]/predict/route.ts
git commit -m "feat: add side bet user API routes"
```

---

## Task 4: Admin API routes

**Files:**
- Create: `src/app/api/admin/sidebets/route.ts`
- Create: `src/app/api/admin/sidebets/[id]/route.ts`
- Create: `src/app/api/admin/sidebets/[id]/resolve/route.ts`

### 4a — Create a side bet

- [ ] **Step 1: Create `src/app/api/admin/sidebets/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { question, answerType, options, closesAt, pointsReward } = body;

  if (!question?.trim() || !closesAt) {
    return NextResponse.json({ error: "question and closesAt are required" }, { status: 400 });
  }

  const bet = await prisma.sideBet.create({
    data: {
      question: question.trim(),
      answerType: answerType === "CHOICE" ? "CHOICE" : "TEXT",
      options: answerType === "CHOICE" && Array.isArray(options) ? options : null,
      closesAt: new Date(closesAt),
      pointsReward: typeof pointsReward === "number" ? pointsReward : 10,
    },
  });

  return NextResponse.json({ bet }, { status: 201 });
}
```

### 4b — Edit a side bet

- [ ] **Step 2: Create `src/app/api/admin/sidebets/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const bet = await prisma.sideBet.findUnique({ where: { id } });
  if (!bet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bet.resolved) return NextResponse.json({ error: "Cannot edit a resolved bet" }, { status: 400 });

  const updated = await prisma.sideBet.update({
    where: { id },
    data: {
      question: body.question?.trim() ?? bet.question,
      closesAt: body.closesAt ? new Date(body.closesAt) : bet.closesAt,
      pointsReward: typeof body.pointsReward === "number" ? body.pointsReward : bet.pointsReward,
    },
  });

  return NextResponse.json({ bet: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.sideBet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

### 4c — Resolve a side bet and award points

- [ ] **Step 3: Create `src/app/api/admin/sidebets/[id]/resolve/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const correctAnswer = (body?.correctAnswer ?? "").trim();

  if (!correctAnswer) {
    return NextResponse.json({ error: "correctAnswer is required" }, { status: 400 });
  }

  const bet = await prisma.sideBet.findUnique({
    where: { id },
    include: { predictions: true },
  });

  if (!bet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bet.resolved) return NextResponse.json({ error: "Already resolved" }, { status: 400 });

  const normalised = correctAnswer.toLowerCase().trim();

  // Award points in a transaction
  await prisma.$transaction([
    prisma.sideBet.update({
      where: { id },
      data: { correctAnswer, resolved: true },
    }),
    ...bet.predictions.map((pred) => {
      const isCorrect = bet.answerType === "CHOICE"
        ? pred.answer.toLowerCase() === normalised
        : pred.answer.toLowerCase().includes(normalised) || normalised.includes(pred.answer.toLowerCase());
      return prisma.sideBetPrediction.update({
        where: { id: pred.id },
        data: { pointsAwarded: isCorrect ? bet.pointsReward : 0 },
      });
    }),
  ]);

  const winners = bet.predictions.filter((p) => {
    const a = p.answer.toLowerCase().trim();
    return bet.answerType === "CHOICE"
      ? a === normalised
      : a.includes(normalised) || normalised.includes(a);
  }).length;

  return NextResponse.json({ ok: true, winners, total: bet.predictions.length });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/sidebets/route.ts \
  src/app/api/admin/sidebets/[id]/route.ts \
  src/app/api/admin/sidebets/[id]/resolve/route.ts
git commit -m "feat: add admin side bet API routes"
```

---

## Task 5: User-facing side bets page

**Files:**
- Create: `src/app/sidebets/page.tsx`

- [ ] **Step 1: Create `src/app/sidebets/page.tsx`**

```typescript
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import SideBetsClient from "@/components/sidebets/SideBetsClient";
import type { SideBetItem } from "@/types";

export const revalidate = 30;

export default async function SideBetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const bets = await prisma.sideBet.findMany({
    orderBy: { closesAt: "asc" },
    include: {
      predictions: {
        select: { userId: true, answer: true, pointsAwarded: true },
      },
    },
  });

  const items: SideBetItem[] = bets.map((bet) => {
    const myPred = bet.predictions.find((p) => p.userId === session.userId);
    return {
      id: bet.id,
      question: bet.question,
      answerType: bet.answerType,
      options: bet.options as string[] | null,
      closesAt: bet.closesAt.toISOString(),
      correctAnswer: bet.correctAnswer,
      pointsReward: bet.pointsReward,
      resolved: bet.resolved,
      createdAt: bet.createdAt.toISOString(),
      myAnswer: myPred?.answer ?? null,
      myPointsAwarded: myPred?.pointsAwarded ?? null,
      predictionCount: bet.predictions.length,
    };
  });

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Side Bets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bonus questions · fixed point rewards</p>
        </div>
        <SideBetsClient bets={items} />
      </div>
    </PageWrapper>
  );
}
```

- [ ] **Step 2: Create `src/components/sidebets/SideBetsClient.tsx`**

```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SideBetItem } from "@/types";

interface SideBetsClientProps {
  bets: SideBetItem[];
}

function isClosed(bet: SideBetItem) {
  return new Date() > new Date(bet.closesAt);
}

function formatDeadline(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function SideBetCard({ bet: initialBet }: { bet: SideBetItem }) {
  const [bet, setBet] = useState(initialBet);
  const [answer, setAnswer] = useState(initialBet.myAnswer ?? "");
  const [submitting, setSubmitting] = useState(false);
  const closed = isClosed(bet);

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
      const d = await res.json();
      toast.error(d.error ?? "Failed to submit");
      return;
    }
    setBet((prev) => ({ ...prev, myAnswer: answer.trim() }));
    toast.success("Answer saved!");
  }

  const won = bet.resolved && bet.myPointsAwarded !== null && bet.myPointsAwarded > 0;
  const lost = bet.resolved && bet.myPointsAwarded === 0 && bet.myAnswer !== null;

  return (
    <div className={cn(
      "bg-card border rounded-2xl p-4 space-y-3",
      won ? "border-emerald-500/40" : lost ? "border-red-400/30" : "border-border"
    )}>
      {/* Header */}
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

      {/* Resolved state */}
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

      {/* Input */}
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

export default function SideBetsClient({ bets }: SideBetsClientProps) {
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
        {items.map((b) => <SideBetCard key={b.id} bet={b} />)}
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/sidebets/page.tsx src/components/sidebets/SideBetsClient.tsx
git commit -m "feat: add side bets page and client component"
```

---

## Task 6: Add Side Bets to navigation

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update `BottomNav.tsx`**

Change the `NAV_ITEMS` import line to add `Dice1` icon (or `Zap`):

```typescript
import { Home, Calendar, Trophy, Star, Settings, Zap } from "lucide-react";
```

Add to `NAV_ITEMS` array (before the closing bracket):
```typescript
{ href: "/sidebets", icon: Zap, label: "Side Bets" },
```

- [ ] **Step 2: Update `Sidebar.tsx`**

In the existing import line:
```typescript
import { Home, Calendar, Trophy, Star, Settings, LogOut, BookOpen, Sun, Moon, Zap } from "lucide-react";
```

Add to `NAV_ITEMS`:
```typescript
{ href: "/sidebets", icon: Zap, label: "Side Bets" },
```

(Add after the `"/tournament"` entry, before `"/rules"`)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add Side Bets to navigation"
```

---

## Task 7: Admin panel — Side Bets tab

**Files:**
- Modify: `src/components/admin/AdminPanel.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Read remaining lines of `AdminPanel.tsx`**

Before editing, read the full file to understand the existing tab structure. The file has tabs (there's a "Users" section and possibly others).

```bash
sed -n '80,214p' /Users/ashkan/Code/worldcup26/src/components/admin/AdminPanel.tsx
```

- [ ] **Step 2: Add `SideBetItem` import and side bets state to `AdminPanel.tsx`**

At the top, add:
```typescript
import type { SideBetItem } from "@/types";
```

Add new props to `AdminPanelProps`:
```typescript
interface AdminPanelProps {
  users: AdminUser[];
  lastSync: Date | null;
  matchCount: number;
  sideBets: SideBetItem[];
}
```

Add state for the side bets tab at the top of the component function (after existing useState calls):
```typescript
const [activeTab, setActiveTab] = useState<"users" | "sidebets">("users");
const [sideBets, setSideBets] = useState(props.sideBets);
const [newQuestion, setNewQuestion] = useState("");
const [newClosesAt, setNewClosesAt] = useState("");
const [newPoints, setNewPoints] = useState(10);
const [newAnswerType, setNewAnswerType] = useState<"TEXT" | "CHOICE">("TEXT");
const [newOptions, setNewOptions] = useState("");
const [creatingBet, setCreatingBet] = useState(false);
const [resolvingId, setResolvingId] = useState<string | null>(null);
const [resolveAnswer, setResolveAnswer] = useState("");
```

- [ ] **Step 3: Add `createSideBet` and `resolveSideBet` functions inside `AdminPanel`**

```typescript
async function createSideBet() {
  if (!newQuestion.trim() || !newClosesAt) return;
  setCreatingBet(true);
  const res = await fetch("/api/admin/sidebets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: newQuestion.trim(),
      answerType: newAnswerType,
      options: newAnswerType === "CHOICE" ? newOptions.split(",").map((s) => s.trim()).filter(Boolean) : null,
      closesAt: newClosesAt,
      pointsReward: newPoints,
    }),
  });
  setCreatingBet(false);
  if (!res.ok) { toast.error("Failed to create"); return; }
  const { bet } = await res.json();
  setSideBets((prev) => [{ ...bet, myAnswer: null, myPointsAwarded: null, predictionCount: 0 }, ...prev]);
  setNewQuestion("");
  setNewClosesAt("");
  setNewOptions("");
  toast.success("Side bet created!");
}

async function resolveSideBet(id: string) {
  if (!resolveAnswer.trim()) return;
  const res = await fetch(`/api/admin/sidebets/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correctAnswer: resolveAnswer.trim() }),
  });
  if (!res.ok) { toast.error("Failed to resolve"); return; }
  const { winners, total } = await res.json();
  setSideBets((prev) => prev.map((b) => b.id === id ? { ...b, resolved: true, correctAnswer: resolveAnswer.trim() } : b));
  setResolvingId(null);
  setResolveAnswer("");
  toast.success(`Resolved! ${winners}/${total} correct.`);
}

async function deleteSideBet(id: string) {
  if (!confirm("Delete this side bet?")) return;
  await fetch(`/api/admin/sidebets/${id}`, { method: "DELETE" });
  setSideBets((prev) => prev.filter((b) => b.id !== id));
  toast.success("Deleted");
}
```

- [ ] **Step 4: Add tab switcher UI and Side Bets tab content to the JSX**

In the JSX return, wrap existing content in a tab structure. Add tab buttons at the top of the return (before the existing users section):

```tsx
{/* Tab switcher */}
<div className="flex gap-2 mb-6">
  <button
    onClick={() => setActiveTab("users")}
    className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
      activeTab === "users" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
    )}
  >
    Users
  </button>
  <button
    onClick={() => setActiveTab("sidebets")}
    className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
      activeTab === "sidebets" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
    )}
  >
    Side Bets
  </button>
</div>

{activeTab === "users" && (
  /* ... existing users + sync JSX, wrapped in a fragment ... */
)}

{activeTab === "sidebets" && (
  <div className="space-y-6">
    {/* Create form */}
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold text-sm">New Side Bet</h3>
      <Input
        placeholder="Question"
        value={newQuestion}
        onChange={(e) => setNewQuestion(e.target.value)}
      />
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Closes at</Label>
          <Input type="datetime-local" value={newClosesAt} onChange={(e) => setNewClosesAt(e.target.value)} />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs text-muted-foreground">Points</Label>
          <Input type="number" value={newPoints} min={1} onChange={(e) => setNewPoints(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex gap-2">
        {(["TEXT", "CHOICE"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setNewAnswerType(type)}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              newAnswerType === type ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground"
            )}
          >
            {type === "TEXT" ? "Free text" : "Multiple choice"}
          </button>
        ))}
      </div>
      {newAnswerType === "CHOICE" && (
        <Input
          placeholder="Options (comma-separated)"
          value={newOptions}
          onChange={(e) => setNewOptions(e.target.value)}
        />
      )}
      <Button onClick={createSideBet} disabled={creatingBet || !newQuestion.trim() || !newClosesAt} className="w-full">
        {creatingBet ? "Creating…" : "Create Side Bet"}
      </Button>
    </div>

    {/* List */}
    {sideBets.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">No side bets yet.</p>
    ) : (
      <div className="space-y-3">
        {sideBets.map((bet) => (
          <div key={bet.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{bet.question}</p>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                bet.resolved ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              )}>
                {bet.resolved ? "resolved" : `${bet.pointsReward}pt`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{bet.predictionCount} answer{bet.predictionCount !== 1 ? "s" : ""}</p>
            {bet.resolved ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Correct: {bet.correctAnswer}</p>
            ) : (
              resolvingId === bet.id ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Correct answer"
                    value={resolveAnswer}
                    onChange={(e) => setResolveAnswer(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8 text-xs px-3" onClick={() => resolveSideBet(bet.id)}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setResolvingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-3"
                    onClick={() => { setResolvingId(bet.id); setResolveAnswer(""); }}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => deleteSideBet(bet.id)}
                  >
                    Delete
                  </Button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Update `src/app/admin/page.tsx` to fetch and pass `sideBets`**

In the existing admin page, add a side bets fetch:

```typescript
const [users, matchCount, sideBets] = await Promise.all([
  prisma.user.findMany({
    // ... existing query unchanged
  }),
  prisma.match.count(),
  prisma.sideBet.findMany({
    orderBy: { closesAt: "desc" },
    include: {
      predictions: { select: { userId: true, answer: true, pointsAwarded: true } },
    },
  }).then((bets) => bets.map((bet) => ({
    id: bet.id,
    question: bet.question,
    answerType: bet.answerType as "TEXT" | "CHOICE",
    options: bet.options as string[] | null,
    closesAt: bet.closesAt.toISOString(),
    correctAnswer: bet.correctAnswer,
    pointsReward: bet.pointsReward,
    resolved: bet.resolved,
    createdAt: bet.createdAt.toISOString(),
    myAnswer: null,
    myPointsAwarded: null,
    predictionCount: bet.predictions.length,
  }))),
]);
```

Then pass `sideBets` to `<AdminPanel ... sideBets={sideBets} />`.

- [ ] **Step 6: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminPanel.tsx src/app/admin/page.tsx
git commit -m "feat: add Side Bets tab to admin panel"
```

---

## Task 8: Integrate side bet points into leaderboard

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/leaderboard/page.tsx`
- Modify: `src/app/api/leaderboard/route.ts`
- Modify: `src/components/leaderboard/LeaderboardTable.tsx`

- [ ] **Step 1: Add `sideBetPoints` to `LeaderboardUser` in `src/types/index.ts`**

```typescript
export interface LeaderboardUser {
  id: string;
  name: string;
  rank: number;
  exactCount: number;
  winnerGoalsCount: number;
  winnerOnlyCount: number;
  matchPoints: number;
  tournamentPoints: number;
  sideBetPoints: number;       // ← new
  totalPoints: number;
  predictionsSubmitted: number;
  predictionsScored: number;
  formGuide: FormResult[];
}
```

- [ ] **Step 2: Update all three leaderboard data helpers**

In each of `src/app/page.tsx`, `src/app/leaderboard/page.tsx`, and `src/app/api/leaderboard/route.ts`, update the `User` include to add side bet predictions:

Add to the Prisma `include`/`select`:
```typescript
sideBetPredictions: {
  where: { pointsAwarded: { not: null } },
  select: { pointsAwarded: true },
},
```

Then in the `.map()`, compute:
```typescript
const sideBetPoints = user.sideBetPredictions.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);
```

And update `totalPoints`:
```typescript
totalPoints: matchPoints + tournamentPoints + sideBetPoints,
```

Add `sideBetPoints` to the returned object.

- [ ] **Step 3: Update `LeaderboardTable.tsx` to show side bet column**

In the grid layout, add a side bet column. Change the grid template from:
```
grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_3.5rem]
```
to:
```
grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem_3.5rem]
```

Add a header cell after the tournament column:
```tsx
<span className="text-center text-orange-500 dark:text-orange-400">🎲</span>
```

Add a data cell in each row:
```tsx
<span className="text-xs text-center tabular-nums font-semibold text-orange-500 dark:text-orange-400">
  {user.sideBetPoints > 0 ? user.sideBetPoints : <span className="text-muted-foreground/40">–</span>}
</span>
```

Update the legend at the bottom to include:
```tsx
<span><span className="text-orange-500 dark:text-orange-400 font-semibold">🎲</span> side bets</span>
```

- [ ] **Step 4: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 5: Visually verify in browser**

Check `/leaderboard` — a new 🎲 column should appear. It shows `–` until side bets are resolved.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/app/page.tsx src/app/leaderboard/page.tsx \
  src/app/api/leaderboard/route.ts src/components/leaderboard/LeaderboardTable.tsx
git commit -m "feat: add side bet points to leaderboard"
```

---

## Task 9: Final build check and deploy

- [ ] **Step 1: Run production build**

```bash
npm run build 2>&1 | tail -30
```

Expected: no errors.

- [ ] **Step 2: Push to Railway**

```bash
git push origin main
```

Railway will auto-deploy. After deploy, run `npm run db:push` via Railway CLI if the schema was not auto-migrated (check Railway startup logs).

---

## Self-Review Checklist

- [x] Schema: `SideBet` + `SideBetPrediction` models defined, migration covered
- [x] User routes: list and predict covered
- [x] Admin routes: create, edit, delete, resolve covered
- [x] Scoring: resolve route awards points via transaction
- [x] User page: open / closed / resolved sections, choice + text answer types
- [x] Navigation: bottom nav + sidebar updated
- [x] Admin panel: tab switcher, create form, resolve flow
- [x] Leaderboard: side bet points in totals and column
- [x] Privacy: predictions hidden until resolved (only `correctAnswer` exposed on resolved bets)
