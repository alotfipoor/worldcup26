"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TimelineData } from "@/app/api/stats/timeline/route";

const PLAYER_COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#f97316", "#ec4899", "#06b6d4",
];

interface TimelineChartProps {
  data: TimelineData;
  currentUserId: string;
}

export default function TimelineChart({ data, currentUserId }: TimelineChartProps) {
  if (data.matches.length < 3) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Chart available after 3+ matches are scored.
      </p>
    );
  }

  // Build recharts data: array of { label, [playerId]: cumulative_pts, ... }
  const chartData = data.matches.map((match, matchIdx) => {
    const entry: Record<string, string | number> = { label: match.label };
    data.players.forEach((player) => {
      entry[player.id] = player.cumulative[matchIdx];
    });
    return entry;
  });

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={28}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: 12,
            }}
            labelFormatter={(label) => String(label)}
            formatter={(value, name) => {
              const player = data.players.find((p) => p.id === name);
              return [`${value}pt`, player?.name ?? String(name)];
            }}
          />
          <Legend
            formatter={(value) => {
              const player = data.players.find((p) => p.id === value);
              return (
                <span style={{ fontSize: 11 }}>{player?.name ?? value}</span>
              );
            }}
          />
          {data.players.map((player, i) => (
            <Line
              key={player.id}
              type="monotone"
              dataKey={player.id}
              stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
              strokeWidth={player.id === currentUserId ? 2.5 : 1.5}
              strokeOpacity={player.id === currentUserId ? 1 : 0.65}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
