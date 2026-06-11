import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { inviteCode, name } = await req.json();

  if (!inviteCode || !name || typeof name !== "string") {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 30) {
    return NextResponse.json(
      { error: "Name must be between 2 and 30 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 401 });
  }

  if (user.name && user.activatedAt) {
    await createSession(user.id, user.role);
    return NextResponse.json({ status: "ok" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: trimmedName, activatedAt: new Date() },
  });

  await createSession(user.id, user.role);

  return NextResponse.json({ status: "ok" });
}
