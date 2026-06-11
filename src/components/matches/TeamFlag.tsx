import * as CountryFlags from "country-flag-icons/react/3x2";
import { TEAM_TO_FLAG_CODE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type FlagKey = keyof typeof CountryFlags;

interface TeamFlagProps {
  team: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  className?: string;
  nameClassName?: string;
}

const SIZE_CLASS: Record<string, string> = {
  xs: "w-5 h-[14px]",
  sm: "w-6 h-[18px]",
  md: "w-8 h-6",
  lg: "w-10 h-[30px]",
  xl: "w-14 h-[42px]",
};

export default function TeamFlag({
  team,
  size = "md",
  showName = true,
  className,
  nameClassName,
}: TeamFlagProps) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const FlagComponent = code ? (CountryFlags[code] as React.ComponentType<{ className?: string; title?: string }> | undefined) : undefined;

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0", className)}>
      <span className={cn(SIZE_CLASS[size], "flex-shrink-0 rounded-sm overflow-hidden shadow-sm")}>
        {FlagComponent ? (
          <FlagComponent className="w-full h-full object-cover" title={team} />
        ) : (
          <span className="w-full h-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground font-bold">
            {team.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      {showName && (
        <span className={cn("leading-tight", nameClassName)}>{team}</span>
      )}
    </span>
  );
}
