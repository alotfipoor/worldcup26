# Side Bet Edit UI — Design Spec

**Date:** 2026-06-24

## Goal

Allow the admin to edit an existing side bet's question, `closesAt` date, and `pointsReward` directly from the admin panel. Primary use case: reopening a closed question by extending its deadline.

## What Already Exists

- `PUT /api/admin/sidebets/[id]` — accepts `{ question, closesAt, pointsReward }`, rejects edits on resolved bets. No new backend work needed.
- `AdminPanel.tsx` — the single client component housing all admin tabs including the Side Bets tab.
- Match score override pattern — inline expand UX already used in the Matches tab; this feature mirrors it exactly.

## Design

### Interaction

Each side bet row in the Side Bets tab gets an **Edit** button (alongside the existing Resolve and Delete buttons). Clicking it expands an inline form immediately below the bet row, pre-filled with current values. A **Save** button calls the API; a **Cancel** button collapses the form without changes.

Only one bet can be in edit mode at a time (same constraint as match overrides). The Edit button is hidden for resolved bets (API rejects those anyway, but hiding it avoids confusion).

### Form Fields

| Field | Input type | Pre-fill value |
|-------|-----------|---------------|
| Question | `<textarea>` or `<input type="text">` | `bet.question` |
| Closes at | `<input type="datetime-local">` | `bet.closesAt` converted to local datetime string |
| Points reward | `<input type="number" min={1}>` | `bet.pointsReward` |

### State (added to AdminPanel)

```ts
const [editingBetId, setEditingBetId] = useState<string | null>(null);
const [editQuestion, setEditQuestion] = useState("");
const [editClosesAt, setEditClosesAt] = useState("");
const [editPointsReward, setEditPointsReward] = useState("");
```

When Edit is clicked: set `editingBetId` to the bet's id, populate the three edit state fields from the bet's current values, converting `closesAt` ISO string → `datetime-local` format (`YYYY-MM-DDTHH:mm`).

### API Call

```ts
await fetch(`/api/admin/sidebets/${editingBetId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: editQuestion,
    closesAt: new Date(editClosesAt).toISOString(),
    pointsReward: Number(editPointsReward),
  }),
});
```

On success: clear `editingBetId`, refresh the side bets list (same pattern as other mutations in the panel).

### Error handling

Show a toast/alert on failure (same pattern as other admin actions). API returns 400 if resolved, 404 if not found.

## Scope

- Changes: `AdminPanel.tsx` only.
- No schema changes, no new API routes, no new files.

## Out of Scope

- Editing `answerType` or `options` (changing answer type on a live bet with existing predictions would corrupt data).
- Bulk editing multiple bets at once.
