import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const bet = await prisma.sideBet.findUnique({ where: { id } });
  if (!bet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bet.resolved) return NextResponse.json({ error: "Cannot edit a resolved bet" }, { status: 400 });

  const updated = await prisma.sideBet.update({
    where: { id },
    data: {
      question: body.question?.trim() ?? bet.question,
      closesAt: body.closesAt ? new Date(body.closesAt) : bet.closesAt,
      pointsReward: typeof body.pointsReward === "number" ? body.pointsReward : bet.pointsReward,
    },
  });

  return NextResponse.json({ bet: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.sideBet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
