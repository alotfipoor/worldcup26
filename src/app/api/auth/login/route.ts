import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const { inviteCode } = await req.json();

  if (!inviteCode || typeof inviteCode !== "string") {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 401 });
  }

  if (!user.name || !user.activatedAt) {
    return NextResponse.json({ status: "setup_required", userId: user.id });
  }

  await createSession(user.id, user.role);

  return NextResponse.json({ status: "ok" });
}
