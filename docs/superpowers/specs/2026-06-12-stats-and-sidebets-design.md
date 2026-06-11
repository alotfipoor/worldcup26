# Design Spec: Stats, Visibility & Side Bets
**Date:** 2026-06-12  
**Status:** Approved  

---

## Overview

Two sprints to make the platform richer and more engaging for the friend group:

- **Sprint 1 (Stats):** Four display-only features, no schema changes — Form Guide, Points Timeline, Head-to-Head Comparison, Prediction Reveal.
- **Sprint 2 (Side Bets):** New game mechanic requiring schema changes — admin-created bonus questions with fixed point rewards.

---

## Sprint 1: Stats & Visibility

### 1. Form Guide on Leaderboard

**What:** A row of 5 small colored squares appended below each player's name in the leaderboard table. Represents their last 5 scored predictions (most recent on right).

**Colors:**
- Emerald = exact score (6pt)
- Blue = correct winner + goal diff (4pt)
- Amber = winner only (2pt)
- Red = miss (0pt)
- Gray = no prediction submitted for that match

**Data:** Last 5 scored predictions per user, sorted by match kickoff descending.

**Files changed:**
- `src/types/index.ts` — add `formGuide: string[]` to `LeaderboardUser`
- `src/app/page.tsx` + `src/app/leaderboard/page.tsx` — extend leaderboard query to include last 5 scored predictions per user (sorted desc by match kickoff)
- `src/components/leaderboard/LeaderboardTable.tsx` — render 5-dot form strip inside each player row

**Constraints:**
- Only scored predictions count (points !== null)
- Fewer than 5 scored matches → remaining dots shown as gray
- No new pages, no schema changes, no new dependencies

---

### 2. Points Timeline Chart

**What:** A line chart below the leaderboard table (collapsible via "Show chart" toggle). Shows each player's cumulative points over time — one line per player.

**Visual:**
- X-axis: match index (1, 2, 3…) ordered by scored match kickoff date
- Y-axis: cumulative points
- Current user's line is thicker/highlighted; others are slightly dimmed
- Hover tooltip: match name, points earned, running total
- Player colors match existing avatar colors from `LeaderboardTable`

**New dependency:** `recharts` (add via npm)

**Files changed/added:**
- `src/app/api/stats/timeline/route.ts` — new GET endpoint; returns `{ matches: { id, label }[], players: { id, name, data: number[] }[] }`. Protected by session. Only scored predictions included.
- `src/components/leaderboard/TimelineChart.tsx` — new client component using recharts `LineChart`
- `src/app/leaderboard/page.tsx` — add collapsible chart section below the table; fetch timeline data server-side and pass as prop

**Constraints:**
- Only `FINISHED` matches with at least one scored prediction appear on the X-axis
- Missing prediction for a match → that player's line stays flat (0 points added)
- Chart hidden if fewer than 3 matches have been scored (not useful yet)

---

### 3. Head-to-Head Player Comparison

**What:** A dedicated page showing a side-by-side stats comparison between any two players.

**URL:** `/compare/[idA]/[idB]`  
**Entry point:** Player profile page `/players/[id]` — a "Compare with…" button opens a sheet/dropdown listing all other active players

**Page layout:**
1. Two avatar cards side-by-side — name, rank, total points
2. Stat grid: exact / winner+goals / winner only / tournament pts — one column per player, color-coded
3. Head-to-head record card: for each match both players predicted (and was scored), who scored more points? Displayed as W / D / L from player A's perspective
4. Scrollable match-by-match table: match name | player A prediction + pts | player B prediction + pts (only scored matches; unscored matches hidden to preserve privacy)

**Files changed/added:**
- `src/app/compare/[idA]/[idB]/page.tsx` — server component; fetches both players' data
- `src/components/compare/ComparisonView.tsx` — renders the full comparison UI
- `src/app/players/[id]/page.tsx` — add "Compare with…" button that links to `/compare/[id]/[otherId]`; list of other players fetched server-side

**Constraints:**
- Either player must exist and be activated; otherwise 404
- Predictions only revealed for scored matches (preserves existing privacy rule)
- Users can compare any two players including themselves

---

### 4. Prediction Breakdown / Consensus Reveal

**What:** On the match detail page, once a match is `FINISHED` and its predictions are scored, a new section shows what every player predicted — breaking down the distribution and listing individual picks.

**Visual:**
- Distribution pills: e.g., "4 × Spain win · 1 × Draw · 2 × Germany win"
- Below: list of all players with their exact predicted score, result badge (exact / winner / miss), and points earned
- For unfinished or unscored matches: section is completely hidden

**Files changed:**
- `src/app/matches/[id]/page.tsx` — when match status is `FINISHED` and predictions are scored, fetch all predictions for that match (not just current user's)
- New `src/components/matches/PredictionReveal.tsx` — renders the distribution + per-player list

**Constraints:**
- Section only renders when `match.status === "FINISHED"` and at least one prediction has `points !== null`
- Predictions for in-progress or upcoming matches remain hidden (existing privacy rule unchanged)
- All players shown, including those who didn't predict (shown as "No pick")

---

## Sprint 2: Side Bets

### Overview

Admin-created bonus prediction questions. Separate from match predictions. Users answer before a deadline; admin resolves by marking the correct answer; points awarded automatically.

**Examples of questions:**
- "Which team scores the most goals in the group stage?"
- "Total goals in the full tournament — over or under 120?"
- "First country to be eliminated?"
- "How many penalty shootouts in the knockouts?"

---

### Schema

Two new Prisma models:

```prisma
model SideBet {
  id            String              @id @default(cuid())
  question      String
  answerType    SideBetAnswerType   @default(TEXT)
  options       Json?               // array of strings if answerType == CHOICE
  closesAt      DateTime
  correctAnswer String?             // set when resolved
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
  pointsAwarded Int?      // null until resolved
  createdAt     DateTime  @default(now())
  user          User      @relation(fields: [userId], references: [id])
  sideBet       SideBet   @relation(fields: [sideBetId], references: [id])

  @@unique([userId, sideBetId])
}

enum SideBetAnswerType {
  TEXT
  CHOICE
}
```

`User` model gets a new relation: `sideBetPredictions SideBetPrediction[]`

---

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sidebets` | List all side bets (open + resolved) with current user's answer |
| `POST` | `/api/sidebets/[id]/predict` | Submit or update answer (before `closesAt`) |
| `POST` | `/api/admin/sidebets` | Admin: create a side bet |
| `PUT` | `/api/admin/sidebets/[id]` | Admin: edit question/deadline (before closing) |
| `POST` | `/api/admin/sidebets/[id]/resolve` | Admin: mark correct answer, award points |

---

### User-Facing Pages

**`/sidebets`** — new page listing all side bets:
- "Open" section: side bets with deadline in the future, user hasn't answered or can change answer
- "Closed / Pending" section: past deadline, awaiting admin to resolve
- "Resolved" section: correct answer shown, your answer highlighted, points awarded or missed

**Navigation:** Add "Side Bets" to bottom nav and sidebar.

---

### Admin Side

In the existing `AdminPanel.tsx`, add a new "Side Bets" tab:
- List of all side bets with status
- "New side bet" form: question, answer type, options (if CHOICE), deadline, points reward
- "Resolve" button per side bet: text input for correct answer + confirm

---

### Scoring

`POST /api/admin/sidebets/[id]/resolve`:
1. Sets `SideBet.correctAnswer` and `SideBet.resolved = true`
2. Loops through all `SideBetPrediction` rows for this side bet
3. Case-insensitive match for `TEXT` type; exact match for `CHOICE`
4. Sets `pointsAwarded = sideBet.pointsReward` for correct answers, `0` for incorrect
5. Side bet points appear in each player's profile stats (separate from match points and tournament points — shown as a new stat row)

---

### Leaderboard Integration

`LeaderboardUser` gets a `sideBetPoints` field. Leaderboard total becomes `matchPoints + tournamentPoints + sideBetPoints`. Side bets column added to leaderboard table.

---

## File Map Summary

### Sprint 1 (no schema changes)

| File | Action |
|------|--------|
| `src/types/index.ts` | Add `formGuide`, modify `LeaderboardUser` |
| `src/app/page.tsx` | Extend leaderboard query for form guide |
| `src/app/leaderboard/page.tsx` | Extend query; add timeline data fetch |
| `src/app/api/stats/timeline/route.ts` | **New** — timeline data API |
| `src/components/leaderboard/LeaderboardTable.tsx` | Add form guide dots |
| `src/components/leaderboard/TimelineChart.tsx` | **New** — recharts line chart |
| `src/app/compare/[idA]/[idB]/page.tsx` | **New** — H2H page |
| `src/components/compare/ComparisonView.tsx` | **New** — H2H UI |
| `src/app/players/[id]/page.tsx` | Add "Compare with…" button |
| `src/app/matches/[id]/page.tsx` | Fetch all predictions when finished |
| `src/components/matches/PredictionReveal.tsx` | **New** — prediction breakdown UI |

### Sprint 2 (schema changes required)

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `SideBet`, `SideBetPrediction` models |
| `src/app/sidebets/page.tsx` | **New** — user-facing side bets page |
| `src/app/api/sidebets/route.ts` | **New** — list side bets |
| `src/app/api/sidebets/[id]/predict/route.ts` | **New** — submit answer |
| `src/app/api/admin/sidebets/route.ts` | **New** — admin create |
| `src/app/api/admin/sidebets/[id]/route.ts` | **New** — admin edit |
| `src/app/api/admin/sidebets/[id]/resolve/route.ts` | **New** — admin resolve + award points |
| `src/components/admin/AdminPanel.tsx` | Add Side Bets tab |
| `src/components/layout/BottomNav.tsx` | Add Side Bets nav item |
| `src/components/layout/Sidebar.tsx` | Add Side Bets nav item |
| `src/types/index.ts` | Add `sideBetPoints` to `LeaderboardUser` |
| `src/app/page.tsx` + `src/app/leaderboard/page.tsx` | Include side bet points in totals |

---

## Dependencies to Add

- `recharts` — for the timeline chart (Sprint 1)
