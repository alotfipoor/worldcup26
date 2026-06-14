"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WC2026_TEAMS, TEAM_TO_FLAG_CODE, WC2026_PLAYERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PlayerAutocomplete from "@/components/ui/player-autocomplete";
import type { TournamentPrediction } from "@prisma/client";
import * as CountryFlags from "country-flag-icons/react/3x2";

type FlagKey = keyof typeof CountryFlags;

function TeamFlag({ team }: { team: string }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const FlagComponent = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;

  return (
    <span className="w-5 h-[15px] flex-shrink-0 rounded-sm overflow-hidden shadow-sm inline-block">
      {FlagComponent ? (
        <FlagComponent className="w-full h-full" />
      ) : (
        <span className="w-full h-full bg-muted flex items-center justify-center text-[7px] font-bold text-muted-foreground">
          {team.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

interface TournamentFormProps {
  window: "INITIAL" | "POST_GROUP";
  locked: boolean;
  initialPrediction: TournamentPrediction | null;
  postGroupPrediction: TournamentPrediction | null;
}

function TeamOption({
  team,
  selected,
  onSelect,
}: {
  team: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        selected
          ? "bg-primary/10 border border-primary text-primary"
          : "hover:bg-muted border border-transparent"
      )}
    >
      <TeamFlag team={team} />
      <span className="text-sm">{team}</span>
      {selected && <CheckCircle2 className="h-4 w-4 ml-auto flex-shrink-0" />}
    </button>
  );
}

export default function TournamentForm({
  window,
  locked,
  initialPrediction,
  postGroupPrediction,
}: TournamentFormProps) {
  const activePrediction =
    window === "POST_GROUP" ? postGroupPrediction : initialPrediction;

  const [champion, setChampion] = useState(activePrediction?.champion ?? "");
  const [topScorer, setTopScorer] = useState(activePrediction?.topScorer ?? "");
  const [topAssist, setTopAssist] = useState(activePrediction?.topAssist ?? "");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredTeams = WC2026_TEAMS.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    setSaving(true);
    const res = await fetch("/api/tournament", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champion, topScorer, topAssist }),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    toast.success("Tournament prediction saved!");
    setTimeout(() => setSaved(false), 3000);
  }

  if (locked) {
    return (
      <div className="space-y-4">
        <Section title="World Cup Champion">
          <div className="flex items-center gap-2 text-sm">
            {activePrediction?.champion ? (
              <>
                <TeamFlag team={activePrediction.champion} />
                <span className="font-medium">{activePrediction.champion}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No prediction made</span>
            )}
          </div>
        </Section>
        <Section title="Golden Boot (Top Scorer)">
          <span className="text-sm font-medium">
            {activePrediction?.topScorer || (
              <span className="text-muted-foreground">No prediction made</span>
            )}
          </span>
        </Section>
        <Section title="Top Assists">
          <span className="text-sm font-medium">
            {activePrediction?.topAssist || (
              <span className="text-muted-foreground">No prediction made</span>
            )}
          </span>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prior window summary */}
      {window === "POST_GROUP" && initialPrediction && (
        <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your initial prediction
          </p>
          <p>Champion: {initialPrediction.champion ?? "–"}</p>
          <p>Top scorer: {initialPrediction.topScorer ?? "–"}</p>
          <p>Top assists: {initialPrediction.topAssist ?? "–"}</p>
        </div>
      )}

      {/* Champion picker */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">World Cup Champion</Label>
        {champion && (
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{champion}</span>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team…"
            className="pl-9"
          />
        </div>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {filteredTeams.map((team) => (
            <TeamOption
              key={team}
              team={team}
              selected={champion === team}
              onSelect={() => setChampion(team)}
            />
          ))}
        </div>
      </div>

      {/* Golden Boot */}
      <div className="space-y-2">
        <Label htmlFor="topScorer" className="text-base font-semibold">
          Golden Boot (Top Scorer)
        </Label>
        <PlayerAutocomplete
          id="topScorer"
          value={topScorer}
          onChange={setTopScorer}
          players={WC2026_PLAYERS}
          placeholder="Player name…"
        />
      </div>

      {/* Top Assists */}
      <div className="space-y-2">
        <Label htmlFor="topAssist" className="text-base font-semibold">
          Top Assists
        </Label>
        <PlayerAutocomplete
          id="topAssist"
          value={topAssist}
          onChange={setTopAssist}
          players={WC2026_PLAYERS}
          placeholder="Player name…"
        />
      </div>

      <Button
        onClick={save}
        disabled={saving || !champion}
        className="w-full h-12 text-base"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save prediction"}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        15 pts for correct champion · 15 pts for correct top scorer · 10 pts for correct top assists
        {window === "INITIAL"
          ? " · Can update after group stage"
          : " · Locks when knockouts begin"}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
