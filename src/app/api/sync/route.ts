import { NextRequest, NextResponse } from "next/server";
import { syncMatches } from "@/lib/sync";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const syncSecret = process.env.SYNC_SECRET;

  const isCronCall =
    syncSecret && authHeader === `Bearer ${syncSecret}`;

  let isAdmin = false;
  if (!isCronCall) {
    const session = await getSession();
    isAdmin = session?.user?.role === "ADMIN";
  }

  if (!isCronCall && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Admin-triggered syncs always hit the API; cron/background-triggered
    // ones only do so once a match is expected to have finished.
    const result = await syncMatches({ force: isAdmin });
    return NextResponse.json({ ok: true, ...result, syncedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
