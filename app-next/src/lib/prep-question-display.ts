import type { MockInterviewQuestion } from "@/lib/mock-interview-questions";

/** Show per-question difficulty only when the set is not uniform (stable hash produced ties). */
export function shouldShowDifficultyTags(rows: Pick<MockInterviewQuestion, "difficulty">[]): boolean {
  if (rows.length === 0) return false;
  const first = rows[0].difficulty;
  return rows.some((q) => q.difficulty !== first);
}
