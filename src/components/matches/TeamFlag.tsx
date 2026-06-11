import { TEAM_TO_FLAG_CODE } from "@/lib/constants";

interface TeamFlagProps {
  team: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  nameClass?: string;
}

const SIZE_MAP = {
  sm: { w: 20, h: 14, text: "text-xs" },
  md: { w: 28, h: 20, text: "text-sm" },
  lg: { w: 40, h: 28, text: "text-base" },
};

export default function TeamFlag({
  team,
  size = "md",
  showName = true,
  nameClass,
}: TeamFlagProps) {
  const code = TEAM_TO_FLAG_CODE[team];
  const { w, h, text } = SIZE_MAP[size];

  return (
    <span className="inline-flex items-center gap-2">
      {code ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/${w}x${h}/${code.toLowerCase().replace("gb-eng", "gb")}.png`}
          width={w}
          height={h}
          alt={team}
          className="rounded-sm object-cover flex-shrink-0"
          style={{ width: w, height: h }}
        />
      ) : (
        <span
          className="rounded-sm bg-muted flex-shrink-0 inline-block"
          style={{ width: w, height: h }}
        />
      )}
      {showName && (
        <span className={nameClass ?? cn(text, "font-medium")}>{team}</span>
      )}
    </span>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
