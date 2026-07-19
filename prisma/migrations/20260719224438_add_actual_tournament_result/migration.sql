-- CreateTable
CREATE TABLE "ActualTournamentResult" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "champion" TEXT,
    "topScorer" TEXT,
    "topAssist" TEXT,
    "bestGoalkeeper" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualTournamentResult_pkey" PRIMARY KEY ("id")
);
