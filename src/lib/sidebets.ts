export function parseAcceptedAnswers(correctAnswer: string): string[] {
  return correctAnswer
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSideBetAnswerCorrect(
  answer: string,
  correctAnswer: string | null,
  answerType: "TEXT" | "CHOICE"
): boolean {
  if (!correctAnswer) return false;
  const a = answer.toLowerCase().trim();
  const accepted = parseAcceptedAnswers(correctAnswer);

  if (answerType === "CHOICE") return accepted.includes(a);
  return accepted.some((acc) => a.includes(acc) || acc.includes(a));
}

export function calculateSideBetPoints(
  answer: string,
  correctAnswer: string | null,
  answerType: "TEXT" | "CHOICE" | "MULTI_CHOICE",
  pointsReward: number
): number {
  if (!correctAnswer) return 0;

  if (answerType === "MULTI_CHOICE") {
    const picks = parseAcceptedAnswers(answer);
    const accepted = parseAcceptedAnswers(correctAnswer);
    const matches = picks.filter((p) => accepted.includes(p)).length;
    return matches * pointsReward;
  }

  return isSideBetAnswerCorrect(answer, correctAnswer, answerType) ? pointsReward : 0;
}
