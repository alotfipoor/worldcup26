import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateAiPrediction } from "@/lib/ai-prediction";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;

  try {
    const result = await generateAiPrediction(matchId);

    const prediction = await prisma.aiPrediction.upsert({
      where: { matchId },
      create: {
        matchId,
        predictedHomeScore: result.predictedHomeScore,
        predictedAwayScore: result.predictedAwayScore,
        predictedWinner: result.predictedWinner,
        confidence: result.confidence,
        homeWinProbability: result.homeWinProbability,
        drawProbability: result.drawProbability,
        awayWinProbability: result.awayWinProbability,
        reasoning: result.reasoning,
        keyFactors: result.keyFactors,
        riskFactors: result.riskFactors,
        dataSourcesUsed: result.dataSourcesUsed,
      },
      update: {
        predictedHomeScore: result.predictedHomeScore,
        predictedAwayScore: result.predictedAwayScore,
        predictedWinner: result.predictedWinner,
        confidence: result.confidence,
        homeWinProbability: result.homeWinProbability,
        drawProbability: result.drawProbability,
        awayWinProbability: result.awayWinProbability,
        reasoning: result.reasoning,
        keyFactors: result.keyFactors,
        riskFactors: result.riskFactors,
        dataSourcesUsed: result.dataSourcesUsed,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({
      prediction: {
        ...prediction,
        generatedAt: prediction.generatedAt.toISOString(),
        updatedAt: prediction.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate prediction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;

  await prisma.aiPrediction.deleteMany({ where: { matchId } });

  return NextResponse.json({ ok: true });
}
