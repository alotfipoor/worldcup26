"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TournamentVoteGroup } from "@/lib/tournament";

interface TournamentStatsChartsProps {
  totalRespondents: number;
  champion: TournamentVoteGroup[];
  topScorer: TournamentVoteGroup[];
  topAssist: TournamentVoteGroup[];
  bestGoalkeeper: TournamentVoteGroup[];
  currentUserId: string;
}

function VoteBar({
  group,
  maxCount,
  isOpen,
  onToggle,
  currentUserId,
}: {
  group: TournamentVoteGroup;
  maxCount: number;
  isOpen: boolean;
  onToggle: () => void;
  currentUserId: string;
}) {
  const pct = maxCount > 0 ? Math.round((group.count / maxCount) * 100) : 0;

  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium truncate">{group.label}</span>
          <span className="text-muted-foreground tabular-nums flex-shrink-0 ml-2">
            {group.count}
          </span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-primary/60", isOpen && "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-popover shadow-md p-2.5 space-y-1">
          {group.voters
            .slice()
            .sort((a, b) => a.userName.localeCompare(b.userName))
            .map((v) => (
              <div key={v.userId} className="text-xs">
                <span className={cn(v.userId === currentUserId && "text-primary font-medium")}>
                  {v.userName}
                  {v.userId === currentUserId && (
                    <span className="text-muted-foreground font-normal ml-1">(you)</span>
                  )}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function QuestionChart({
  title,
  groups,
  chartKey,
  openKey,
  setOpenKey,
  currentUserId,
}: {
  title: string;
  groups: TournamentVoteGroup[];
  chartKey: string;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  currentUserId: string;
}) {
  const maxCount = groups.length > 0 ? groups[0].count : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">No predictions yet</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const key = `${chartKey}:${group.label}`;
            return (
              <VoteBar
                key={key}
                group={group}
                maxCount={maxCount}
                isOpen={openKey === key}
                onToggle={() => setOpenKey(openKey === key ? null : key)}
                currentUserId={currentUserId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TournamentStatsCharts({
  totalRespondents,
  champion,
  topScorer,
  topAssist,
  bestGoalkeeper,
  currentUserId,
}: TournamentStatsChartsProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (totalRespondents === 0) return null;

  return (
    <div ref={containerRef} className="space-y-3">
      <div>
        <h2 className="font-semibold text-sm">What everyone predicted</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {totalRespondents} player{totalRespondents !== 1 ? "s" : ""} predicted · tap a bar to see who picked it
        </p>
      </div>

      <QuestionChart
        title="World Cup Champion"
        groups={champion}
        chartKey="champion"
        openKey={openKey}
        setOpenKey={setOpenKey}
        currentUserId={currentUserId}
      />
      <QuestionChart
        title="Golden Boot (Top Scorer)"
        groups={topScorer}
        chartKey="topScorer"
        openKey={openKey}
        setOpenKey={setOpenKey}
        currentUserId={currentUserId}
      />
      <QuestionChart
        title="Top Assists"
        groups={topAssist}
        chartKey="topAssist"
        openKey={openKey}
        setOpenKey={setOpenKey}
        currentUserId={currentUserId}
      />
      <QuestionChart
        title="Best Goalkeeper"
        groups={bestGoalkeeper}
        chartKey="bestGoalkeeper"
        openKey={openKey}
        setOpenKey={setOpenKey}
        currentUserId={currentUserId}
      />
    </div>
  );
}
