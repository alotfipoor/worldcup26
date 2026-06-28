"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TEAM_TO_FLAG_CODE } from "@/lib/constants";
import type { ClientMatch, KnockoutSection } from "./MatchesView";
import * as CountryFlags from "country-flag-icons/react/3x2";

// ─── Layout constants ────────────────────────────────────────────────────────

const SLOT = 52;       // px per R32 match slot (determines vertical spacing)
const CARD_H = 44;     // actual card height
const CARD_W = 130;    // card width
const COL_GAP = 30;    // gap between columns (where connector SVG lives)
const COL_STRIDE = CARD_W + COL_GAP;
const BRACKET_H = 16 * SLOT; // 832px total height (driven by 16 R32 matches)

// ─── Rounds config ───────────────────────────────────────────────────────────

const ROUNDS = [
  { stage: "ROUND_OF_32", count: 16, label: "R32" },
  { stage: "ROUND_OF_16", count: 8,  label: "R16" },
  { stage: "QUARTER_FINAL", count: 4, label: "QF"  },
  { stage: "SEMI_FINAL",    count: 2, label: "SF"  },
  { stage: "FINAL",         count: 1, label: "Final" },
] as const;

type FlagKey = keyof typeof CountryFlags;

// ─── Mini flag ───────────────────────────────────────────────────────────────

function MiniFlag({ team }: { team: string }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const Flag = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;
  return (
    <span className="inline-block w-[14px] h-[10px] flex-shrink-0 rounded-[1px] overflow-hidden">
      {Flag ? (
        <Flag className="w-full h-full" />
      ) : (
        <span className="w-full h-full bg-muted/60 block" />
      )}
    </span>
  );
}

// ─── Single bracket match card ───────────────────────────────────────────────

function BracketCard({
  match,
  x,
  top,
}: {
  match: ClientMatch | null;
  x: number;
  top: number;
}) {
  const finished = match?.status === "FINISHED";
  const homeWon =
    finished && match!.homeScore !== null && match!.awayScore !== null &&
    match!.homeScore! > match!.awayScore!;
  const awayWon =
    finished && match!.homeScore !== null && match!.awayScore !== null &&
    match!.awayScore! > match!.homeScore!;

  const inner = match ? (
    <Link href={`/matches/${match.id}`} className="block w-full h-full">
      <div className={cn("flex items-center gap-1 px-1.5 h-[21px]", homeWon && "bg-emerald-500/15")}>
        <MiniFlag team={match.homeTeam} />
        <span className={cn("text-[10px] leading-none truncate flex-1", homeWon ? "font-bold text-foreground" : "text-muted-foreground")}>
          {match.homeTeam}
        </span>
        {match.homeScore !== null && (
          <span className="text-[10px] tabular-nums font-bold text-foreground ml-0.5">{match.homeScore}</span>
        )}
      </div>
      <div className="border-t border-border/40" />
      <div className={cn("flex items-center gap-1 px-1.5 h-[21px]", awayWon && "bg-emerald-500/15")}>
        <MiniFlag team={match.awayTeam} />
        <span className={cn("text-[10px] leading-none truncate flex-1", awayWon ? "font-bold text-foreground" : "text-muted-foreground")}>
          {match.awayTeam}
        </span>
        {match.awayScore !== null && (
          <span className="text-[10px] tabular-nums font-bold text-foreground ml-0.5">{match.awayScore}</span>
        )}
      </div>
    </Link>
  ) : (
    <>
      <div className="flex items-center px-1.5 h-[21px]">
        <span className="text-[10px] text-muted-foreground/30">TBD</span>
      </div>
      <div className="border-t border-border/40" />
      <div className="flex items-center px-1.5 h-[21px]">
        <span className="text-[10px] text-muted-foreground/30">TBD</span>
      </div>
    </>
  );

  return (
    <div
      style={{ position: "absolute", left: x, top, width: CARD_W, height: CARD_H }}
      className={cn(
        "border rounded-lg overflow-hidden bg-card",
        match ? "border-border hover:border-primary/40 transition-colors" : "border-border/25 opacity-50",
      )}
    >
      {inner}
    </div>
  );
}

// ─── SVG connector between two adjacent columns ──────────────────────────────
// Draws bracket-style elbow connectors.  colIndex is the LEFT column index.

function ColumnConnector({ fromCount, colIndex }: { fromCount: number; colIndex: number }) {
  const toCount = fromCount / 2;
  // Each left-column match occupies `groupSlots` R32 slots
  const groupSlots = Math.pow(2, colIndex);
  const groupH = groupSlots * SLOT; // px height of one left-match slot
  const toSlots = 2 * groupSlots;   // slots per right-match
  const midX = COL_GAP / 2;

  const paths: string[] = [];
  for (let j = 0; j < toCount; j++) {
    const topFeedCy = (2 * j) * groupH + groupH / 2;
    const botFeedCy = (2 * j + 1) * groupH + groupH / 2;
    const toCy = j * toSlots * SLOT + (toSlots * SLOT) / 2;
    // top feeder → midX, then vertical to toCy
    paths.push(`M0,${topFeedCy}H${midX}V${toCy}`);
    // bottom feeder → midX (already at toCy vertically)
    paths.push(`M0,${botFeedCy}H${midX}`);
    // from midX → right edge toward next column
    paths.push(`M${midX},${toCy}H${COL_GAP}`);
  }

  return (
    <svg
      style={{
        position: "absolute",
        left: colIndex * COL_STRIDE + CARD_W,
        top: 0,
        width: COL_GAP,
        height: BRACKET_H,
        overflow: "visible",
      }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1" fill="none" className="text-border/60" />
      ))}
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortedMatches(knockout: KnockoutSection[], stage: string): ClientMatch[] {
  return [...(knockout.find((s) => s.stage === stage)?.matches ?? [])].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
}

function padded(arr: ClientMatch[], len: number): (ClientMatch | null)[] {
  const out: (ClientMatch | null)[] = [...arr];
  while (out.length < len) out.push(null);
  return out;
}

// ─── Main bracket component ──────────────────────────────────────────────────

export default function KnockoutBracket({ knockout }: { knockout: KnockoutSection[] }) {
  const thirdPlace = sortedMatches(knockout, "THIRD_PLACE")[0] ?? null;
  const totalW = ROUNDS.length * COL_STRIDE - COL_GAP;

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      {/* Round labels */}
      <div style={{ width: totalW, minWidth: totalW }} className="flex mb-2">
        {ROUNDS.map((r, i) => (
          <div
            key={r.stage}
            style={{ width: CARD_W, marginLeft: i > 0 ? COL_GAP : 0 }}
            className="text-center text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider"
          >
            {r.label}
          </div>
        ))}
      </div>

      {/* Bracket */}
      <div style={{ position: "relative", width: totalW, minWidth: totalW, height: BRACKET_H }}>
        {/* Match cards */}
        {ROUNDS.map((round, colIdx) => {
          const matches = padded(sortedMatches(knockout, round.stage), round.count);
          const slotsPerMatch = Math.pow(2, colIdx);
          const slotH = slotsPerMatch * SLOT;
          return matches.map((m, matchIdx) => (
            <BracketCard
              key={`${round.stage}-${matchIdx}`}
              match={m}
              x={colIdx * COL_STRIDE}
              top={matchIdx * slotH + (slotH - CARD_H) / 2}
            />
          ));
        })}

        {/* Connectors between columns 0→1, 1→2, 2→3, 3→4 */}
        {ROUNDS.slice(0, -1).map((round, colIdx) => (
          <ColumnConnector key={colIdx} fromCount={round.count} colIndex={colIdx} />
        ))}
      </div>

      {/* Third place */}
      {thirdPlace && (
        <div className="mt-8">
          <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
            Third Place
          </p>
          <div style={{ position: "relative", height: CARD_H, width: CARD_W }}>
            <BracketCard match={thirdPlace} x={0} top={0} />
          </div>
        </div>
      )}
    </div>
  );
}
