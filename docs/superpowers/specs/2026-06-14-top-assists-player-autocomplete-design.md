# Top Assists + Player Autocomplete Design

## Goal

Add a Top Assists prediction field to the tournament page (below Golden Boot), and upgrade both Golden Boot and Top Assists from free-text inputs to player autocomplete fields backed by a static WC2026 player list.

## Architecture

A new `PlayerAutocomplete` UI component wraps a controlled input with a filtered dropdown drawn from a static `WC2026_PLAYERS` constant. Free-text entry is still allowed so users aren't blocked if a player is missing from the list. The `TournamentPrediction` schema gains a `topAssist` column, the API and scoring functions are extended to handle it, and every caller of `calculateTournamentPoints` is updated.

## Component: `PlayerAutocomplete`

File: `src/components/ui/player-autocomplete.tsx`

- Props: `value: string`, `onChange: (v: string) => void`, `placeholder?: string`, `id?: string`
- As the user types, filters `WC2026_PLAYERS` (case-insensitive `includes`) and shows up to 8 matches in a dropdown below the input
- Click a suggestion → fills the input and closes the dropdown
- Click outside → closes the dropdown
- Free-text entry is always allowed (user can submit a name not in the list)
- No external dependencies (plain React state + `useRef` for click-outside)

## Player List

File: `src/lib/constants.ts` — add `WC2026_PLAYERS: string[]`

~600 known WC2026 squad players, alphabetically sorted. Best-effort from training data; free-text fallback covers any gaps. Scoring remains case-insensitive string match.

## Schema Change

`prisma/schema.prisma` — add to `TournamentPrediction`:

```prisma
topAssist String?
```

Applied via `npm run db:push` (no migration history needed per project convention).

## API Change

`src/app/api/tournament/route.ts` — accept `topAssist` in PUT body, include in upsert create/update. GET already returns the full model so no change needed there.

## Scoring Change

`src/lib/scoring.ts`:
- Add `tournament_top_assist: 10` to `POINTS`
- Extend `calculateTournamentPoints` signature: add `topAssist: string | null` to prediction param and `topAssist: string` to actual param
- Award 10 pts if prediction matches `ACTUAL_TOP_ASSIST` env var (case-insensitive)

## Callers Updated

All 5 files that call `calculateTournamentPoints` updated to pass `topAssist`:
- `src/app/api/leaderboard/route.ts` — reads `ACTUAL_TOP_ASSIST` env var
- `src/app/page.tsx`
- `src/app/players/[id]/page.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/compare/[idA]/[idB]/page.tsx`
- `src/app/login/page.tsx`

## Form Changes (`TournamentForm.tsx`)

- Replace `topScorer` `Input` → `PlayerAutocomplete`
- Add `topAssist` state (initialized from `activePrediction?.topAssist`)
- Add `TopAssist` field with `PlayerAutocomplete` below Golden Boot
- Include `topAssist` in save payload
- Update locked read-only view to show `topAssist`
- Update "initial prediction" summary box to show `topAssist`
- Update hint text: `15 pts champion · 15 pts top scorer · 10 pts top assists`

## Points Summary

| Prediction | Points |
|---|---|
| Champion | 15 |
| Golden Boot (Top Scorer) | 15 |
| Top Assists | 10 |

## Deployment Note

After deploy, set `ACTUAL_TOP_ASSIST=<player name>` env var (same pattern as `ACTUAL_TOP_SCORER`) to enable scoring.
