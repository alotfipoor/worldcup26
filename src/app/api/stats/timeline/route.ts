import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTimelineData } from "@/lib/timeline";

export interface TimelineMatch {
  id: string;
  label: string;
  kickoff: string;
}

export interface TimelinePlayer {
  id: string;
  name: string;
  cumulative: number[];
}

export interface TimelineData {
  matches: TimelineMatch[];
  players: TimelinePlayer[];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getTimelineData();
  return NextResponse.json(data);
}
