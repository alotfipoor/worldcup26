import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import MatchesView from "@/components/matches/MatchesView";
import AutoRefresh from "@/components/AutoRefresh";
import { STAGE_LABELS, STAGE_ORDER, formatGroupName } from "@/lib/constants";
import { maybeTriggerBackgroundSync } from "@/lib/sync";
import { R32_BRACKET_ORDER } from "@/lib/bracket";
import type { Match, Prediction } from "@prisma/client";
import type {
  ClientMatch,
  ClientPrediction,
  GroupData,
  KnockoutSection,
  TeamStanding,
} from "@/components/matches/MatchesView";

export const revalidate = 30;

function serializeMatch(m: Match & { userPrediction: Prediction | null }): ClientMatch {
  const pred = m.userPrediction;
  const clientPred: ClientPrediction | null = pred
    ? {
        id: pred.id,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        predictedWinner: pred.predictedWinner,
        points: pred.points,
        reason: pred.reason,
      }
    : null;

  return {
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    kickoff: m.kickoff.toISOString(),
    stage: m.stage,
    groupName: m.groupName,
    goals: m.goals,
    syncedAt: m.syncedAt?.toISOString() ?? null,
    externalId: m.externalId,
    userPrediction: clientPred,
  };
}

interface StandingsMatchInput {
  homeTeam: string;
  awayTeam: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

function computeStandings(groupMatches: StandingsMatchInput[]): TeamStanding[] {
  const teams = new Map<string, TeamStanding>();

  // Seed every team from every match (including scheduled games)
  for (const m of groupMatches) {
    for (const team of [m.homeTeam, m.awayTeam]) {
      if (!teams.has(team)) {
        teams.set(team, {
          team,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
        });
      }
    }
  }

  // Accumulate from finished matches only
  for (const m of groupMatches) {
    if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
    const home = teams.get(m.homeTeam)!;
    const away = teams.get(m.awayTeam)!;

    home.played++;
    away.played++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (m.homeScore < m.awayScore) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(teams.values()).sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.team.localeCompare(b.team)
  );
}

// Maps each Round of 32 team to its bracket slot (0-15) so KnockoutBracket can
// position later rounds correctly instead of guessing from kickoff order.
async function getTeamBracketSlots(): Promise<Record<string, number>> {
  const [groupMatches, r32Matches] = await Promise.all([
    prisma.match.findMany({ where: { stage: "GROUP", groupName: { not: null } } }),
    prisma.match.findMany({ where: { stage: "ROUND_OF_32" } }),
  ]);
  if (r32Matches.length === 0) return {};

  const byGroup = new Map<string, Match[]>();
  for (const m of groupMatches) {
    if (!byGroup.has(m.groupName!)) byGroup.set(m.groupName!, []);
    byGroup.get(m.groupName!)!.push(m);
  }

  const labelToTeam: Record<string, string> = {};
  for (const [groupName, gms] of byGroup) {
    const letter = groupName.replace("GROUP_", "");
    const table = computeStandings(gms);
    if (table[0]) labelToTeam[`1${letter}`] = table[0].team;
    if (table[1]) labelToTeam[`2${letter}`] = table[1].team;
  }

  const teamToSlot: Record<string, number> = {};
  for (const m of r32Matches) {
    const slotIndex = R32_BRACKET_ORDER.findIndex(
      ([a, b]) =>
        [labelToTeam[a], labelToTeam[b]].includes(m.homeTeam) ||
        [labelToTeam[a], labelToTeam[b]].includes(m.awayTeam)
    );
    if (slotIndex === -1) continue;
    teamToSlot[m.homeTeam] = slotIndex;
    teamToSlot[m.awayTeam] = slotIndex;
  }
  return teamToSlot;
}

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  maybeTriggerBackgroundSync();

  const [matches, predictions, teamToSlot] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.prediction.findMany({ where: { userId: session.userId } }),
    getTeamBracketSlots(),
  ]);

  const predMap = new Map(predictions.map((p) => [p.matchId, p]));
  const matchesWithPreds = matches.map((m) => ({
    ...m,
    userPrediction: predMap.get(m.id) ?? null,
  }));

  const serialized = matchesWithPreds.map(serializeMatch);
  const hasLive = matches.some((m) => m.status === "LIVE");
  const lastSync = matches.reduce<Date | null>((best, m) => {
    if (!m.syncedAt) return best;
    return !best || m.syncedAt > best ? m.syncedAt : best;
  }, null);

  // ── Group Stage: bucket by group name, sort groups A → L ──
  // Exclude matches without a groupName (can happen with some API data) so they
  // don't appear as a spurious "ungrouped" section once the knockout stage begins.
  const groupMatches = serialized.filter((m) => m.stage === "GROUP" && m.groupName !== null);
  const groupBuckets = new Map<string, ClientMatch[]>();
  for (const m of groupMatches) {
    const key = m.groupName ?? "__ungrouped";
    if (!groupBuckets.has(key)) groupBuckets.set(key, []);
    groupBuckets.get(key)!.push(m);
  }
  const groups: GroupData[] = Array.from(groupBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rawName, gms]) => ({
      name: formatGroupName(rawName) || rawName,
      standings: computeStandings(gms),
      matches: gms.sort(
        (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      ),
    }));

  // ── Knockout: bucket by stage, sort by stage order ──
  const knockoutMatches = serialized.filter((m) => m.stage !== "GROUP");
  const knockoutBuckets = new Map<string, ClientMatch[]>();
  for (const m of knockoutMatches) {
    if (!knockoutBuckets.has(m.stage)) knockoutBuckets.set(m.stage, []);
    knockoutBuckets.get(m.stage)!.push(m);
  }
  const knockout: KnockoutSection[] = Array.from(knockoutBuckets.entries())
    .sort(([a], [b]) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99))
    .map(([stage, kms]) => ({
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      matches: kms.sort(
        (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      ),
    }));

  return (
    <PageWrapper>
      <AutoRefresh intervalMs={hasLive ? 30_000 : 60_000} />
      <MatchesView
        groups={groups}
        knockout={knockout}
        teamToSlot={teamToSlot}
        lastSync={lastSync?.toISOString() ?? null}
        hasMatches={serialized.length > 0}
      />
    </PageWrapper>
  );
}
