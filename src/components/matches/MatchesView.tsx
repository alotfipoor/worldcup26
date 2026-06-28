"use client";

import { useState } from "react";
import MatchCard from "./MatchCard";
import { cn } from "@/lib/utils";
import { TEAM_TO_FLAG_CODE } from "@/lib/constants";
import type { Match, Prediction } from "@prisma/client";
import * as CountryFlags from "country-flag-icons/react/3x2";

// ─── Serialized types (Date → ISO string for RSC→client boundary) ───────────

export type ClientPrediction = {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinner: string | null;
  points: number | null;
  reason: string | null;
};

export type ClientMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  kickoff: string;
  stage: string;
  groupName: string | null;
  goals: unknown;
  syncedAt: string | null;
  externalId: number;
  userPrediction: ClientPrediction | null;
};

export type TeamStanding = {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export type GroupData = {
  name: string;
  standings: TeamStanding[];
  matches: ClientMatch[];
};

export type KnockoutSection = {
  stage: string;
  label: string;
  matches: ClientMatch[];
};

// ─── Tiny flag for the standings table ──────────────────────────────────────

type FlagKey = keyof typeof CountryFlags;

function TinyFlag({ team }: { team: string }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const Flag = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;
  return (
    <span className="inline-block w-[18px] h-[13px] flex-shrink-0 rounded-[2px] overflow-hidden shadow-sm">
      {Flag ? (
        <Flag className="w-full h-full" />
      ) : (
        <span className="w-full h-full bg-muted flex items-center justify-center text-[6px] font-bold text-muted-foreground">
          {team.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

// ─── Group standings table ───────────────────────────────────────────────────

function StandingsTable({ standings, groupName }: { standings: TeamStanding[]; groupName: string }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[18px_1fr_26px_26px_26px_38px_34px] items-center gap-x-1 px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide text-center">#</span>
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide pl-1">{groupName}</span>
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide text-center">W</span>
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide text-center">D</span>
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide text-center">L</span>
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide text-right">GD</span>
        <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide text-right">Pts</span>
      </div>

      {/* Rows */}
      {standings.map((row, i) => {
        const advances = i < 2;
        return (
          <div
            key={row.team}
            className={cn(
              "grid grid-cols-[18px_1fr_26px_26px_26px_38px_34px] items-center gap-x-1 px-3 py-2.5",
              i < standings.length - 1 && "border-b border-border/50",
              advances && "bg-emerald-500/[0.035] dark:bg-emerald-500/[0.055]"
            )}
          >
            {/* Rank + qualifier indicator */}
            <div className="flex items-center justify-center">
              <span className={cn(
                "text-[11px] tabular-nums font-medium leading-none",
                advances ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
              )}>
                {advances ? "●" : i + 1}
              </span>
            </div>

            {/* Flag + name */}
            <div className="flex items-center gap-1.5 pl-1 min-w-0">
              <TinyFlag team={row.team} />
              <span className="text-[12px] font-medium truncate leading-none">{row.team}</span>
            </div>

            {/* W D L */}
            <span className="text-[11px] tabular-nums text-center text-muted-foreground">{row.wins}</span>
            <span className="text-[11px] tabular-nums text-center text-muted-foreground">{row.draws}</span>
            <span className="text-[11px] tabular-nums text-center text-muted-foreground">{row.losses}</span>

            {/* GD — colored */}
            <span className={cn(
              "text-[11px] tabular-nums text-right font-medium",
              row.gd > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : row.gd < 0
                ? "text-red-500 dark:text-red-400"
                : "text-muted-foreground"
            )}>
              {row.gd > 0 ? `+${row.gd}` : row.gd}
            </span>

            {/* Pts — bold */}
            <span className={cn(
              "text-[12px] tabular-nums text-right font-bold leading-none",
              advances ? "text-foreground" : "text-muted-foreground"
            )}>
              {row.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Unpredicted badge ───────────────────────────────────────────────────────

function UnpredictedBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
      {count} to predict
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface MatchesViewProps {
  groups: GroupData[];
  knockout: KnockoutSection[];
  lastSync: string | null;
  hasMatches: boolean;
}

const STAGE_SHORT: Record<string, string> = {
  ROUND_OF_32: "R32",
  ROUND_OF_16: "R16",
  QUARTER_FINAL: "QF",
  SEMI_FINAL: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final",
};

const TERMINAL = new Set(["FINISHED", "CANCELLED", "POSTPONED"]);

export default function MatchesView({ groups, knockout, lastSync, hasMatches }: MatchesViewProps) {
  // Default to knockout whenever knockout matches exist; otherwise group stage.
  const [tab, setTab] = useState<"group" | "knockout">(
    knockout.length > 0 ? "knockout" : "group"
  );

  // Default to first group with live/scheduled games, else first group, else null (All)
  const defaultLetter =
    groups.find((g) => g.matches.some((m) => m.status === "LIVE" || m.status === "SCHEDULED"))
      ?.name.replace("Group ", "") ??
    groups[0]?.name.replace("Group ", "") ??
    null;

  const [activeGroup, setActiveGroup] = useState<string | null>(defaultLetter);

  // Default knockout stage: first with a LIVE match, then first with SCHEDULED, then first overall
  const defaultKnockoutStage =
    knockout.find((s) => s.matches.some((m) => m.status === "LIVE"))?.stage ??
    knockout.find((s) => s.matches.some((m) => m.status === "SCHEDULED"))?.stage ??
    knockout[0]?.stage ??
    null;

  const [activeKnockoutStage, setActiveKnockoutStage] = useState<string | null>(
    defaultKnockoutStage
  );

  if (!hasMatches) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-sm">Matches will appear here once synced</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Matches</h1>
        {lastSync && (
          <span className="text-[11px] text-muted-foreground">
            Updated {formatAgo(lastSync)}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("group")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "group"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Group Stage
        </button>
        <button
          onClick={() => setTab("knockout")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "knockout"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Knockout
        </button>
      </div>

      {/* ── Group Stage ── */}
      {tab === "group" && (
        <div>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No group stage matches yet.
            </p>
          ) : (
            <>
              {/* Group selector grid — fills full width */}
              <div className="grid grid-cols-7 gap-1 mb-5">
                {/* All button */}
                <button
                  onClick={() => setActiveGroup(null)}
                  className={cn(
                    "relative h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors col-span-1",
                    activeGroup === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  All
                </button>

                {/* A–L buttons */}
                {groups.map((group) => {
                  const letter = group.name.replace("Group ", "");
                  const isActive = activeGroup === letter;
                  const isLive = group.matches.some((m) => m.status === "LIVE");
                  const isDone = group.matches.every((m) => m.status === "FINISHED");
                  const hasStarted = group.matches.some((m) => m.status === "FINISHED");
                  const unpredicted = group.matches.filter(
                    (m) => !m.userPrediction && m.status === "SCHEDULED"
                  ).length;
                  return (
                    <button
                      key={letter}
                      onClick={() => setActiveGroup(letter)}
                      className={cn(
                        "relative h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isLive
                          ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
                          : isDone
                          ? "bg-muted/50 text-muted-foreground/50"
                          : hasStarted
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {letter}
                      {!isActive && isLive && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {!isActive && !isLive && unpredicted > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Group content */}
              <div className="space-y-8">
                {groups
                  .filter((g) => activeGroup === null || g.name.replace("Group ", "") === activeGroup)
                  .map((group) => {
                    const unpredicted = group.matches.filter(
                      (m) => !m.userPrediction && m.status === "SCHEDULED"
                    ).length;
                    return (
                      <section key={group.name}>
                        <div className="flex items-center justify-between mb-2.5">
                          <h2 className="text-sm font-semibold">{group.name}</h2>
                          <UnpredictedBadge count={unpredicted} />
                        </div>
                        <StandingsTable standings={group.standings} groupName={group.name} />
                        <div className="space-y-2 mt-3">
                          {group.matches.map((m) => (
                            <MatchCard
                              key={m.id}
                              match={m as unknown as Match}
                              prediction={m.userPrediction as unknown as Prediction | null}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Knockout ── */}
      {tab === "knockout" && (
        <div>
          {knockout.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm">Knockout stage hasn&apos;t started yet</p>
            </div>
          ) : (
            <>
              {/* Stage selector — acts as a bracket navigator */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {knockout.map((section) => {
                  const isActive = activeKnockoutStage === section.stage;
                  const isLive = section.matches.some((m) => m.status === "LIVE");
                  const allDone = section.matches.every((m) => TERMINAL.has(m.status));
                  const unpredicted = section.matches.filter(
                    (m) => !m.userPrediction && m.status === "SCHEDULED"
                  ).length;
                  return (
                    <button
                      key={section.stage}
                      onClick={() => setActiveKnockoutStage(section.stage)}
                      className={cn(
                        "relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isLive
                          ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
                          : allDone
                          ? "bg-muted/50 text-muted-foreground/50"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {STAGE_SHORT[section.stage] ?? section.label}
                      {!isActive && isLive && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {!isActive && !isLive && unpredicted > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Matches for selected stage */}
              {knockout
                .filter((s) => s.stage === activeKnockoutStage)
                .map((section) => {
                  const unpredicted = section.matches.filter(
                    (m) => !m.userPrediction && m.status === "SCHEDULED"
                  ).length;
                  return (
                    <section key={section.stage}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {section.label}
                        </h2>
                        <UnpredictedBadge count={unpredicted} />
                      </div>
                      <div className="space-y-2">
                        {section.matches.map((m) => (
                          <MatchCard
                            key={m.id}
                            match={m as unknown as Match}
                            prediction={m.userPrediction as unknown as Prediction | null}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatAgo(isoString: string): string {
  const secs = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
