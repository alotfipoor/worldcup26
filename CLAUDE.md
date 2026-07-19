@AGENTS.md

# WC26 Predictions — Project Guide

## What this is
A private, invite-only World Cup 2026 prediction game for a friend group.
Built with Next.js 15, Prisma (PostgreSQL), deployed on Railway.

## Key commands
- `npm run dev` — start dev server (needs DATABASE_URL in .env)
- `npm run db:push` — push schema to DB (no migration history, for quick dev)
- `npm run db:migrate` — create a migration
- `npm run db:seed` — seed admin user (requires ADMIN_INVITE_CODE env var)
- `npm run build` — production build

## Environment setup
Copy `.env.example` → `.env` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — run: `openssl rand -base64 32`
- `FOOTBALL_API_KEY` — from https://www.football-data.org/client/register
- `SYNC_SECRET` — run: `openssl rand -base64 32`
- `ADMIN_INVITE_CODE` — the code you use to log in as admin

## Auth flow
- Invite-only: admin creates users via `/admin` panel
- Users enter a 6-char code at `/login` → set name once → get a session cookie
- No email/password, no signup page

## Scoring
Group stage:
- Exact score: 6 pts
- Right winner + correct goal diff: 4 pts
- Right winner only: 2 pts

Knockout stage (R32 onwards):
- Exact score: 7 pts
- Right winner + correct goal diff: 5 pts
- Right winner only: 3 pts

Tournament predictions:
- Correct champion: 15 pts
- Correct Golden Boot (top scorer): 10 pts
- Correct top assist: 10 pts
- Correct best goalkeeper: 10 pts

## Prediction lock
Match predictions lock **at kickoff**.
Tournament predictions locked at 2026-06-29T17:00:00Z / 18:00 BST (before knockout stage).

## Prediction privacy
Users cannot see other players' predictions until a match is finished and scored.
Only their own predictions are returned from APIs.

## Deployment (Railway)
1. Create a Railway project
2. Add PostgreSQL add-on (auto-sets DATABASE_URL)
3. Add environment variables from `.env.example`
4. Deploy — `railway.json` handles `prisma migrate deploy` on startup
5. Add a Railway cron service calling `POST /api/sync` every 5 minutes
   with header `Authorization: Bearer $SYNC_SECRET`
6. After first deploy, run the seed: `railway run npm run db:seed`

## Data sync
`POST /api/sync` — pulls matches from football-data.org and scores predictions.
Protected by `Authorization: Bearer {SYNC_SECRET}` header, or admin session.

## Admin
Log in with `ADMIN_INVITE_CODE` at `/login`.
Admin panel at `/admin`: manage users, trigger sync, view invite codes.

## Tournament results
Once the champion/top scorer/top assist/best goalkeeper are known, enter them in the
admin panel (`/admin` → **Results** tab). They're stored in the DB (`ActualTournamentResult`
singleton row) and take effect immediately — no redeploy needed. Champion is matched
against the team name; the other three are matched case-insensitively against player names.
