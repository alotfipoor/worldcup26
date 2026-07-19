# KickPick — World Cup 2026 Prediction Game

A private, invite-only prediction game for friend groups. Pick scores before kickoff, earn points for correct results, and follow a live leaderboard throughout the tournament. Built for World Cup 2026 but adaptable to any football tournament.

![Next.js](https://img.shields.io/badge/Next.js_15-black?logo=next.js) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![Railway](https://img.shields.io/badge/Deploy-Railway-7B2FBE)

---

## Features

- **Invite-only access** — admin creates users with 6-character invite codes, no public signup
- **Score predictions** — pick the exact scoreline for every match; predictions lock at kickoff
- **Smart scoring** — 6 pts exact score · 4 pts correct winner + goals · 2 pts winner only
- **Tournament picks** — predict the champion (15 pts), top scorer (15 pts), and top assists (10 pts) with a searchable player list from all 48 WC2026 squads
- **Side bets** — admin-created custom questions (free text or multiple choice) for bonus points
- **Live predictions reveal** — once a match kicks off, everyone's picks are visible; results and points appear after the final whistle
- **Leaderboard** — ranked table with form guide, points-over-time chart, and head-to-head comparison between any two players
- **Auto sync** — pulls live match data and scores predictions automatically via football-data.org

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, server components)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Invite-code sessions with JWT cookies (no OAuth, no email)
- **UI:** Tailwind CSS + shadcn/ui + country flag icons
- **Data:** [football-data.org](https://www.football-data.org) free tier API
- **Deploy:** Railway (includes PostgreSQL add-on + cron for auto-sync)

---

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database
- A free API key from [football-data.org](https://www.football-data.org/client/register)

### Setup

```bash
git clone https://github.com/alotfipoor/worldcup26.git
cd worldcup26
npm install

cp .env.example .env
# Fill in .env (see Environment Variables below)

npm run db:push      # push schema to your database
npm run db:seed      # create the admin user
npm run dev          # start dev server at http://localhost:3000
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Run `openssl rand -base64 32` |
| `FOOTBALL_API_KEY` | From football-data.org |
| `SYNC_SECRET` | Run `openssl rand -base64 32` — protects the sync endpoint |
| `ADMIN_INVITE_CODE` | The code you use to log in as admin |

The actual champion / top scorer / top assist / best goalkeeper are entered in the
admin panel (`/admin` → **Results** tab) once known, not via environment variables —
the leaderboard picks them up immediately.

---

## Deploying to Railway

1. Create a new Railway project and add a **PostgreSQL** add-on (sets `DATABASE_URL` automatically)
2. Add the environment variables from the table above
3. Push to your repo — Railway picks up `railway.json` and runs `prisma migrate deploy` on startup
4. Add a Railway **cron service** that calls `POST /api/sync` every 5 minutes:
   ```
   Authorization: Bearer $SYNC_SECRET
   ```
5. After first deploy, seed the admin: `railway run npm run db:seed`
6. Log in at `/login` with your `ADMIN_INVITE_CODE`, then create invite codes for your friends in the `/admin` panel

---

## How the Game Works

### Predictions
- Predictions lock **at kickoff** — no changes after the whistle
- Before a match starts, only your own pick is visible
- Once a match kicks off, everyone's picks are revealed so you can watch together
- Points are calculated automatically after each match is scored

### Scoring
| Result | Points |
|---|---|
| Exact scoreline | 6 |
| Correct winner (with score entered) | 4 |
| Correct winner (winner-only pick) | 2 |
| Wrong | 0 |
| Tournament champion | 15 |
| Golden Boot (top scorer) | 15 |
| Top assists | 10 |
| Side bets | varies (admin sets per question) |

### Tournament Picks
Users can update their champion / top scorer / top assists prediction **twice**: once before the tournament starts and once after the group stage. The latest prediction counts.

### Side Bets
Admin can create custom questions — e.g. "Which group will have the most goals?" or "Will there be a penalty shootout in the final?" — with free-text or multiple-choice answers. Admin resolves them and awards points.

---

## Admin Panel

Log in with your `ADMIN_INVITE_CODE` at `/login`. The `/admin` panel lets you:

- Create and manage user invite codes
- Trigger a manual data sync
- Create, manage, and resolve side bets
- Enter the actual champion / top scorer / top assist / best goalkeeper once known, to score tournament picks
- View all predictions

---

## Syncing Match Data

`POST /api/sync` — fetches the latest match data from football-data.org and scores any finished matches.

Protected by `Authorization: Bearer {SYNC_SECRET}`. Can also be triggered manually from the admin panel.

---

## Project Structure

```
src/
  app/              # Next.js App Router pages + API routes
    admin/          # Admin panel
    matches/        # Match list + individual match pages
    tournament/     # Champion / top scorer / top assists picks
    leaderboard/    # Standings + timeline chart
    players/[id]/   # Per-player prediction history
    compare/        # Head-to-head comparison
    sidebets/       # Side bet questions
  components/       # Shared UI components
  lib/              # Prisma client, auth, scoring logic, constants
prisma/
  schema.prisma     # Database schema
```

---

## License

MIT — fork it, adapt it, run it for your own friend group.
