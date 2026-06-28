import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import MatchesView from "@/components/matches/MatchesView";
import AutoRefresh from "@/components/AutoRefresh";
import { STAGE_LABELS, STAGE_ORDER, formatGroupName } from "@/lib/constants";
import { maybeTriggerBackgroundSync } from "@/lib/sync";
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

function computeStandings(groupMatches: ClientMatch[]): TeamStanding[] {
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

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  maybeTriggerBackgroundSync();

  const [matches, predictions] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.prediction.findMany({ where: { userId: session.userId } }),
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
        lastSync={lastSync?.toISOString() ?? null}
        hasMatches={serialized.length > 0}
      />
    </PageWrapper>
  );
}
