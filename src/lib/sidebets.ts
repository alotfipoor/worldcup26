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
