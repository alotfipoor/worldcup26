import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  let answer: string = (body?.answer ?? "").trim();

  if (!answer) {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

  const bet = await prisma.sideBet.findUnique({ where: { id } });
  if (!bet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bet.resolved) return NextResponse.json({ error: "Bet already resolved" }, { status: 400 });
  if (new Date() > bet.closesAt) return NextResponse.json({ error: "Bet is closed" }, { status: 400 });

  if (bet.answerType === "MULTI_CHOICE") {
    const options = (bet.options as string[] | null) ?? [];
    const picks = answer.split(",").map((s: string) => s.trim()).filter(Boolean);
    const uniqueLower = [...new Set(picks.map((p) => p.toLowerCase()))];
    const matched = options.filter((o) => uniqueLower.includes(o.toLowerCase()));

    if (matched.length === 0) {
      return NextResponse.json({ error: "Pick at least one option" }, { status: 400 });
    }
    if (bet.maxPicks && matched.length > bet.maxPicks) {
      return NextResponse.json({ error: `Pick at most ${bet.maxPicks} options` }, { status: 400 });
    }
    answer = matched.join(", ");
  }

  const prediction = await prisma.sideBetPrediction.upsert({
    where: { userId_sideBetId: { userId: session.userId, sideBetId: id } },
    update: { answer },
    create: { userId: session.userId, sideBetId: id, answer },
  });

  return NextResponse.json({ prediction });
}
