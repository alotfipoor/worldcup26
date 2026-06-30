import { prisma } from "@/lib/prisma";
import { WC2026_PLAYERS } from "@/lib/constants";

export type TournamentWindow = "INITIAL" | "POST_GROUP";

export async function getTournamentWindow(): Promise<TournamentWindow> {
  const pendingGroup = await prisma.match.count({
    where: { stage: "GROUP", status: { not: "FINISHED" } },
  });
  return pendingGroup === 0 ? "POST_GROUP" : "INITIAL";
}

export async function isTournamentLocked(): Promise<boolean> {
  // Extended deadline: keep unlocked until 2026-06-30 18:00 BST (17:00 UTC)
  if (new Date() < new Date("2026-06-30T17:00:00Z")) return false;
  const r16 = await prisma.match.count({
    where: {
      stage: { in: ["ROUND_OF_32", "ROUND_OF_16"] },
      status: { in: ["LIVE", "FINISHED"] },
    },
  });
  return r16 > 0;
}

export interface TournamentVoteGroup {
  label: string;
  count: number;
  voters: { userId: string; userName: string }[];
}

export interface TournamentStats {
  totalRespondents: number;
  champion: TournamentVoteGroup[];
  topScorer: TournamentVoteGroup[];
  topAssist: TournamentVoteGroup[];
  bestGoalkeeper: TournamentVoteGroup[];
}

type Field = "champion" | "topScorer" | "topAssist" | "bestGoalkeeper";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeName(s: string): string {
  return stripAccents(s).toLowerCase().trim();
}

// Maps both full names and unique surnames (accent/case-insensitive) to the
// canonical roster spelling, so "Messi" and "Mbappe" merge with "Lionel Messi"
// and "Kylian Mbappé". Surnames shared by multiple roster players (e.g.
// "Martinez") are left out — guessing which one was meant would be worse than
// just not merging.
function buildPlayerAliasMap(): Map<string, string> {
  const alias = new Map<string, string>();
  const surnameOwners = new Map<string, Set<string>>();

  for (const player of WC2026_PLAYERS) {
    alias.set(normalizeName(player), player);
    const parts = player.split(" ");
    const surnameKey = normalizeName(parts[parts.length - 1]);
    if (!surnameOwners.has(surnameKey)) surnameOwners.set(surnameKey, new Set());
    surnameOwners.get(surnameKey)!.add(player);
  }

  for (const [surnameKey, owners] of surnameOwners) {
    if (owners.size === 1 && !alias.has(surnameKey)) {
      alias.set(surnameKey, [...owners][0]);
    }
  }

  return alias;
}

const PLAYER_ALIASES = buildPlayerAliasMap();

function resolvePlayerName(raw: string): string {
  return PLAYER_ALIASES.get(normalizeName(raw)) ?? raw.trim();
}

export async function getTournamentStats(): Promise<TournamentStats> {
  const predictions = await prisma.tournamentPrediction.findMany({
    include: { user: { select: { id: true, name: true } } },
  });

  // One row per user: POST_GROUP if they have one, else their INITIAL pick.
  const latestByUser = new Map<string, (typeof predictions)[number]>();
  for (const p of predictions.filter((p) => p.window === "INITIAL")) {
    latestByUser.set(p.userId, p);
  }
  for (const p of predictions.filter((p) => p.window === "POST_GROUP")) {
    latestByUser.set(p.userId, p);
  }
  const rows = [...latestByUser.values()];

  function groupField(
    field: Field,
    resolveLabel: (raw: string) => string = (raw) => raw.trim()
  ): TournamentVoteGroup[] {
    const groups = new Map<string, TournamentVoteGroup>();
    for (const row of rows) {
      const raw = row[field];
      if (!raw || !raw.trim()) continue;
      const label = resolveLabel(raw);
      const key = label.toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
        existing.voters.push({ userId: row.userId, userName: row.user.name ?? "Unknown" });
      } else {
        groups.set(key, {
          label,
          count: 1,
          voters: [{ userId: row.userId, userName: row.user.name ?? "Unknown" }],
        });
      }
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }

  return {
    totalRespondents: rows.length,
    champion: groupField("champion"),
    topScorer: groupField("topScorer", resolvePlayerName),
    topAssist: groupField("topAssist", resolvePlayerName),
    bestGoalkeeper: groupField("bestGoalkeeper", resolvePlayerName),
  };
}
