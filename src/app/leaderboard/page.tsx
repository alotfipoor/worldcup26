import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import type { LeaderboardUser } from "@/types";

export const revalidate = 60;

async function getLeaderboard(): Promise<LeaderboardUser[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/leaderboard`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.users ?? [];
}

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const users = await getLeaderboard();

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Standings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap a player to see their predictions
          </p>
        </div>
        <LeaderboardTable
          users={users}
          currentUserId={session.userId}
        />
      </div>
    </PageWrapper>
  );
}
