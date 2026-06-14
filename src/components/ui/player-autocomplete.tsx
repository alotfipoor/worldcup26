"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlayerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  players: string[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function PlayerAutocomplete({
  value,
  onChange,
  players,
  placeholder = "Player name…",
  id,
  className,
}: PlayerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.length > 0
      ? players
          .filter((p) => p.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 8)
      : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="h-11"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-md">
          {filtered.map((player) => (
            <li key={player}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                  value === player && "bg-primary/10 text-primary font-medium"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(player);
                  setOpen(false);
                }}
              >
                {player}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
