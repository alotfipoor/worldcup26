const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

interface ApiTeam {
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface ApiScore {
  winner: string | null;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface ApiGoal {
  minute: number | null;
  injuryTime: number | null;
  type: "REGULAR" | "OWN_GOAL" | "PENALTY";
  team: { id: number; name: string };
  scorer: { id: number; name: string };
  assist: { id: number; name: string } | null;
  score: { home: number; away: number };
}

export interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: ApiScore;
  goals?: ApiGoal[];
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "X-Auth-Token": process.env.FOOTBALL_API_KEY ?? "",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org API error: ${res.status} ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchAllMatches(): Promise<ApiMatch[]> {
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    `/competitions/${COMPETITION}/matches`
  );
  return data.matches;
}

export async function fetchLiveMatches(): Promise<ApiMatch[]> {
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    `/competitions/${COMPETITION}/matches?status=LIVE`
  );
  return data.matches;
}

export async function fetchMatch(id: number): Promise<ApiMatch> {
  const data = await apiFetch<{ match: ApiMatch }>(`/matches/${id}`);
  return data.match;
}

export function mapApiStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "GROUP",
    ROUND_OF_32: "ROUND_OF_32",
    ROUND_OF_16: "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINAL",
    SEMI_FINALS: "SEMI_FINAL",
    THIRD_PLACE: "THIRD_PLACE",
    FINAL: "FINAL",
  };
  return map[stage] ?? "GROUP";
}

export function mapApiStatus(status: string): string {
  const map: Record<string, string> = {
    TIMED: "SCHEDULED",
    SCHEDULED: "SCHEDULED",
    IN_PLAY: "LIVE",
    PAUSED: "LIVE",
    FINISHED: "FINISHED",
    POSTPONED: "POSTPONED",
    CANCELLED: "CANCELLED",
    SUSPENDED: "CANCELLED",
  };
  return map[status] ?? "SCHEDULED";
}
