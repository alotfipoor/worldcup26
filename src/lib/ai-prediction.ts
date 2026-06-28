import { prisma } from "@/lib/prisma";
import { fetchMatch, fetchWCStandings } from "@/lib/football-api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// WC 2026 venue → lat/lon for weather lookup
const VENUE_COORDS: Record<string, { lat: number; lon: number; city: string }> = {
  "AT&T Stadium": { lat: 32.748, lon: -97.093, city: "Dallas" },
  "SoFi Stadium": { lat: 33.953, lon: -118.339, city: "Los Angeles" },
  "Hard Rock Stadium": { lat: 25.958, lon: -80.239, city: "Miami" },
  "Mercedes-Benz Stadium": { lat: 33.756, lon: -84.401, city: "Atlanta" },
  "Gillette Stadium": { lat: 42.091, lon: -71.264, city: "Boston" },
  "Arrowhead Stadium": { lat: 39.049, lon: -94.484, city: "Kansas City" },
  "MetLife Stadium": { lat: 40.814, lon: -74.074, city: "New York" },
  "Lincoln Financial Field": { lat: 39.901, lon: -75.168, city: "Philadelphia" },
  "Levi's Stadium": { lat: 37.404, lon: -121.970, city: "San Francisco" },
  "Lumen Field": { lat: 47.595, lon: -122.332, city: "Seattle" },
  "BMO Field": { lat: 43.634, lon: -79.419, city: "Toronto" },
  "BC Place": { lat: 49.276, lon: -123.112, city: "Vancouver" },
  "Estadio Azteca": { lat: 19.303, lon: -99.151, city: "Mexico City" },
  "Estadio Akron": { lat: 20.713, lon: -103.547, city: "Guadalajara" },
  "Estadio BBVA": { lat: 25.670, lon: -100.247, city: "Monterrey" },
};

// Normalize team names to match eloratings.net format
const ELO_NAME_MAP: Record<string, string> = {
  "USA": "United States",
  "United States of America": "United States",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  "Côte d'Ivoire": "Ivory Coast",
  "Türkiye": "Turkey",
  "Bosnia-Herzegovina": "Bosnia",
  "North Macedonia": "Macedonia",
  "DR Congo": "DR Congo",
};

function normalizeForElo(name: string): string {
  return ELO_NAME_MAP[name] ?? name;
}

interface EloRating {
  rank: number;
  rating: number;
}

interface NewsArticle {
  title: string;
  description: string | null;
  publishedAt: string;
  source: string;
}

interface WeatherData {
  city: string;
  maxTempC: number;
  precipitationMm: number;
  windSpeedKmh: number;
}

interface WCMatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  stage: string;
  kickoff: string;
}

export interface AiPredictionResult {
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedWinner: string;
  confidence: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  reasoning: string;
  keyFactors: string[];
  riskFactors: string[];
  dataSourcesUsed: {
    standings: boolean;
    elo: boolean;
    news: boolean;
    weather: boolean;
    wcResults: boolean;
  };
}

async function fetchEloRatings(homeTeam: string, awayTeam: string): Promise<{ home: EloRating | null; away: EloRating | null }> {
  try {
    const res = await fetch("https://www.eloratings.net/World.tsv", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { home: null, away: null };

    const text = await res.text();
    const lines = text.trim().split("\n").slice(1); // skip header

    const homeName = normalizeForElo(homeTeam);
    const awayName = normalizeForElo(awayTeam);

    let home: EloRating | null = null;
    let away: EloRating | null = null;

    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 3) continue;
      const rank = parseInt(parts[0]);
      const name = parts[1]?.trim();
      const rating = parseInt(parts[2]);
      if (!name || isNaN(rank) || isNaN(rating)) continue;

      if (name === homeName || name.toLowerCase() === homeName.toLowerCase()) {
        home = { rank, rating };
      }
      if (name === awayName || name.toLowerCase() === awayName.toLowerCase()) {
        away = { rank, rating };
      }
      if (home && away) break;
    }

    return { home, away };
  } catch {
    return { home: null, away: null };
  }
}

async function fetchNews(homeTeam: string, awayTeam: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const q = encodeURIComponent(`${homeTeam} ${awayTeam} World Cup 2026`);
    const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];

    const data = await res.json() as {
      articles: { title: string; description: string | null; publishedAt: string; source: { name: string } }[];
    };

    return (data.articles ?? []).map((a) => ({
      title: a.title,
      description: a.description,
      publishedAt: a.publishedAt,
      source: a.source?.name ?? "Unknown",
    }));
  } catch {
    return [];
  }
}

async function fetchWeather(venue: string | null | undefined, kickoff: Date): Promise<WeatherData | null> {
  if (!venue) return null;
  const coords = VENUE_COORDS[venue];
  if (!coords) return null;

  try {
    const date = kickoff.toISOString().slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max&timezone=auto&start_date=${date}&end_date=${date}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json() as {
      daily: {
        temperature_2m_max: number[];
        precipitation_sum: number[];
        wind_speed_10m_max: number[];
      };
    };

    const daily = data.daily;
    if (!daily?.temperature_2m_max?.[0] === undefined) return null;

    return {
      city: coords.city,
      maxTempC: Math.round(daily.temperature_2m_max[0]),
      precipitationMm: Math.round(daily.precipitation_sum[0] * 10) / 10,
      windSpeedKmh: Math.round(daily.wind_speed_10m_max[0]),
    };
  } catch {
    return null;
  }
}

async function fetchStandingsForTeams(homeTeam: string, awayTeam: string, groupName: string | null) {
  if (!groupName) return null;

  try {
    const standings = await fetchWCStandings();
    // Find the group containing these teams
    for (const group of standings) {
      const hasHome = group.table.some(
        (e) => e.team.name.toLowerCase() === homeTeam.toLowerCase()
      );
      const hasAway = group.table.some(
        (e) => e.team.name.toLowerCase() === awayTeam.toLowerCase()
      );
      if (hasHome || hasAway) {
        return { group: group.group, table: group.table };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWCResultsForTeams(homeTeam: string, awayTeam: string): Promise<WCMatchResult[]> {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      OR: [
        { homeTeam },
        { awayTeam },
        { homeTeam: awayTeam },
        { awayTeam: homeTeam },
      ],
    },
    select: {
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      stage: true,
      kickoff: true,
    },
    orderBy: { kickoff: "desc" },
    take: 20,
  });

  return matches
    .filter((m) => m.homeScore !== null && m.awayScore !== null)
    .map((m) => ({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      stage: m.stage,
      kickoff: m.kickoff.toISOString().slice(0, 10),
    }));
}

function buildPrompt(
  homeTeam: string,
  awayTeam: string,
  kickoff: Date,
  stage: string,
  groupName: string | null,
  venue: string | null | undefined,
  elo: { home: EloRating | null; away: EloRating | null },
  standings: { group: string; table: { position: number; team: { name: string }; playedGames: number; won: number; draw: number; lost: number; points: number; goalsFor: number; goalsAgainst: number; goalDifference: number }[] } | null,
  wcResults: WCMatchResult[],
  news: NewsArticle[],
  weather: WeatherData | null
): string {
  const kickoffStr = kickoff.toUTCString();
  const stageLabel = stage.replace(/_/g, " ");

  let prompt = `You are an expert football analyst. Analyze the following World Cup 2026 match and predict the final score.

## MATCH CONTEXT
- Home team: ${homeTeam}
- Away team: ${awayTeam}
- Stage: ${stageLabel}${groupName ? ` (${groupName})` : ""}
- Kickoff: ${kickoffStr}${venue ? `\n- Venue: ${venue}` : ""}

`;

  if (elo.home || elo.away) {
    prompt += `## ELO RATINGS (World Football Elo)
- ${homeTeam}: ${elo.home ? `Rank #${elo.home.rank}, Rating ${elo.home.rating}` : "Not available"}
- ${awayTeam}: ${elo.away ? `Rank #${elo.away.rank}, Rating ${elo.away.rating}` : "Not available"}

`;
  }

  if (standings) {
    prompt += `## CURRENT ${standings.group} STANDINGS\n`;
    prompt += `Pos | Team | P | W | D | L | GF | GA | GD | Pts\n`;
    for (const entry of standings.table) {
      prompt += `${entry.position} | ${entry.team.name} | ${entry.playedGames} | ${entry.won} | ${entry.draw} | ${entry.lost} | ${entry.goalsFor} | ${entry.goalsAgainst} | ${entry.goalDifference > 0 ? "+" : ""}${entry.goalDifference} | ${entry.points}\n`;
    }
    prompt += "\n";
  }

  const homeResults = wcResults.filter((r) => r.homeTeam === homeTeam || r.awayTeam === homeTeam);
  const awayResults = wcResults.filter((r) => r.homeTeam === awayTeam || r.awayTeam === awayTeam);
  const h2h = wcResults.filter(
    (r) =>
      (r.homeTeam === homeTeam && r.awayTeam === awayTeam) ||
      (r.homeTeam === awayTeam && r.awayTeam === homeTeam)
  );

  if (homeResults.length > 0 || awayResults.length > 0) {
    prompt += `## WC 2026 TOURNAMENT FORM\n`;
    if (homeResults.length > 0) {
      prompt += `${homeTeam} results this tournament:\n`;
      for (const r of homeResults.slice(0, 5)) {
        const result = r.homeTeam === homeTeam
          ? `${r.homeScore}–${r.awayScore} vs ${r.awayTeam}`
          : `${r.awayScore}–${r.homeScore} vs ${r.homeTeam} (away)`;
        prompt += `  - ${r.kickoff}: ${result} (${r.stage.replace(/_/g, " ")})\n`;
      }
    }
    if (awayResults.length > 0) {
      prompt += `${awayTeam} results this tournament:\n`;
      for (const r of awayResults.slice(0, 5)) {
        const result = r.homeTeam === awayTeam
          ? `${r.homeScore}–${r.awayScore} vs ${r.awayTeam}`
          : `${r.awayScore}–${r.homeScore} vs ${r.homeTeam} (away)`;
        prompt += `  - ${r.kickoff}: ${result} (${r.stage.replace(/_/g, " ")})\n`;
      }
    }
    if (h2h.length > 0) {
      prompt += `Head-to-head in this tournament:\n`;
      for (const r of h2h) {
        prompt += `  - ${r.kickoff}: ${r.homeTeam} ${r.homeScore}–${r.awayScore} ${r.awayTeam}\n`;
      }
    }
    prompt += "\n";
  }

  if (news.length > 0) {
    prompt += `## RECENT NEWS\n`;
    for (const article of news) {
      prompt += `- [${article.source}, ${article.publishedAt.slice(0, 10)}] ${article.title}`;
      if (article.description) prompt += `: ${article.description.slice(0, 200)}`;
      prompt += "\n";
    }
    prompt += "\n";
  }

  if (weather) {
    prompt += `## MATCH DAY WEATHER (${weather.city})
- Max temperature: ${weather.maxTempC}°C
- Precipitation: ${weather.precipitationMm}mm
- Wind speed: ${weather.windSpeedKmh} km/h

`;
  }

  prompt += `## YOUR TASK
Use all the data above plus your own expert knowledge of these national teams (squad quality, playing style, key players, historical World Cup performance, recent international form, tactical tendencies, and any known injuries or suspensions) to predict the outcome of this match.

Respond with a JSON object in exactly this format:
{
  "predictedHomeScore": <integer, goals scored by ${homeTeam}>,
  "predictedAwayScore": <integer, goals scored by ${awayTeam}>,
  "confidence": <float 0.0–1.0, your confidence in this exact scoreline>,
  "homeWinProbability": <float 0.0–1.0>,
  "drawProbability": <float 0.0–1.0>,
  "awayWinProbability": <float 0.0–1.0>,
  "reasoning": "<200–400 word analysis covering both teams' strengths, weaknesses, key matchup factors, and why you expect this outcome>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "riskFactors": ["<thing that could flip the result 1>", "<thing that could flip the result 2>"]
}

Probabilities must sum to 1.0. The predicted score must be consistent with the predicted winner. Think carefully before committing to a scoreline — consider what is realistic for a World Cup match at this stage.`;

  return prompt;
}

export async function generateAiPrediction(matchId: string): Promise<AiPredictionResult> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");

  // Fetch raw match from football-data.org to get venue
  let venue: string | null = null;
  try {
    const rawMatch = await fetchMatch(match.externalId);
    venue = rawMatch.venue ?? null;
  } catch {
    // venue stays null
  }

  // Gather all data sources in parallel
  const [elo, standings, wcResults, news, weather] = await Promise.all([
    fetchEloRatings(match.homeTeam, match.awayTeam),
    fetchStandingsForTeams(match.homeTeam, match.awayTeam, match.groupName),
    fetchWCResultsForTeams(match.homeTeam, match.awayTeam),
    fetchNews(match.homeTeam, match.awayTeam),
    fetchWeather(venue, match.kickoff),
  ]);

  const dataSourcesUsed = {
    standings: !!standings,
    elo: !!(elo.home || elo.away),
    news: news.length > 0,
    weather: !!weather,
    wcResults: wcResults.length > 0,
  };

  const prompt = buildPrompt(
    match.homeTeam,
    match.awayTeam,
    match.kickoff,
    match.stage,
    match.groupName,
    venue,
    elo,
    standings,
    wcResults,
    news,
    weather
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: {
    predictedHomeScore: number;
    predictedAwayScore: number;
    confidence: number;
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
    reasoning: string;
    keyFactors: string[];
    riskFactors: string[];
  };

  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from the response
    const match2 = text.match(/\{[\s\S]*\}/);
    if (!match2) throw new Error("Gemini returned invalid JSON");
    parsed = JSON.parse(match2[0]);
  }

  // Derive predictedWinner from scores
  let predictedWinner: string;
  if (parsed.predictedHomeScore > parsed.predictedAwayScore) {
    predictedWinner = "home";
  } else if (parsed.predictedAwayScore > parsed.predictedHomeScore) {
    predictedWinner = "away";
  } else {
    predictedWinner = "draw";
  }

  return {
    predictedHomeScore: Math.max(0, Math.round(parsed.predictedHomeScore)),
    predictedAwayScore: Math.max(0, Math.round(parsed.predictedAwayScore)),
    predictedWinner,
    confidence: Math.min(1, Math.max(0, parsed.confidence)),
    homeWinProbability: Math.min(1, Math.max(0, parsed.homeWinProbability)),
    drawProbability: Math.min(1, Math.max(0, parsed.drawProbability)),
    awayWinProbability: Math.min(1, Math.max(0, parsed.awayWinProbability)),
    reasoning: parsed.reasoning,
    keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : [],
    riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
    dataSourcesUsed,
  };
}
