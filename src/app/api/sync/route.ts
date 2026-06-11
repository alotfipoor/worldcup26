import { NextRequest, NextResponse } from "next/server";
import { syncMatches } from "@/lib/sync";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const syncSecret = process.env.SYNC_SECRET;

  const isAdminSession = async () => {
    const session = await getSession();
    return session?.user?.role === "ADMIN";
  };

  const isCronCall =
    syncSecret && authHeader === `Bearer ${syncSecret}`;

  if (!isCronCall && !(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMatches();
    return NextResponse.json({ ok: true, ...result, syncedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
