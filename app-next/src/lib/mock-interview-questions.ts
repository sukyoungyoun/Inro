export type MockInterviewCategory = "behavioral" | "product_sense" | "portfolio";

export type MockInterviewQuestion = {
  id: string;
  category: MockInterviewCategory;
  text: string;
  difficulty: "hard" | "medium" | "easy";
  duration: string;
  tags: string[];
  status: "pending" | "done" | "skipped";
  insight: string | null;
};

export type DbQuestionShape = {
  id: string;
  category: string;
  question: string;
  insight: string | null;
};

const CATEGORY_ORDER: MockInterviewCategory[] = ["behavioral", "product_sense", "portfolio"];

export function normalizeMockCategory(raw: string): MockInterviewCategory {
  const t = (raw || "").toLowerCase();
  if (t.includes("product") && (t.includes("sense") || t.includes("thinking"))) return "product_sense";
  if (t.includes("portfolio") || t.includes("case study") || t.includes("work sample")) return "portfolio";
  if (t.includes("behavioral") || t.includes("experience") || t.includes("leadership")) return "behavioral";
  if (t.includes("technical") || t.includes("system")) return "product_sense";
  return "behavioral";
}

function stableDifficulty(id: string): "hard" | "medium" | "easy" {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % 3;
  return (["easy", "medium", "hard"] as const)[h];
}

function inferTags(category: MockInterviewCategory, q: DbQuestionShape): string[] {
  const tags: string[] = [];
  if (category === "behavioral") tags.push("STAR format");
  if (category === "product_sense") tags.push("Product thinking");
  if (category === "portfolio") tags.push("Work sample");
  const insight = (q.insight || "").toLowerCase();
  if (/resume|cv|document/i.test(insight + q.question)) tags.push("Resume-specific");
  return tags.length ? tags : ["Role-specific"];
}

export function mapDbQuestionsToMock(
  rows: DbQuestionShape[],
  progress: Record<string, "pending" | "done" | "skipped">
): MockInterviewQuestion[] {
  return rows.map((q) => {
    const category = normalizeMockCategory(q.category);
    const st = progress[q.id];
    return {
      id: q.id,
      category,
      text: q.question,
      difficulty: stableDifficulty(q.id),
      duration: "2–3 min",
      tags: inferTags(category, q),
      status: st || "pending",
      insight: q.insight,
    };
  });
}

export function sortCategoriesForDisplay(cats: MockInterviewCategory[]): MockInterviewCategory[] {
  const rest = cats.filter((c) => !CATEGORY_ORDER.includes(c));
  const ordered = CATEGORY_ORDER.filter((c) => cats.includes(c));
  return [...ordered, ...rest];
}

export function groupQuestionsByCategory(questions: MockInterviewQuestion[]): [MockInterviewCategory, MockInterviewQuestion[]][] {
  const map = new Map<MockInterviewCategory, MockInterviewQuestion[]>();
  const keyOrder: MockInterviewCategory[] = [];
  for (const q of questions) {
    if (!map.has(q.category)) {
      map.set(q.category, []);
      keyOrder.push(q.category);
    }
    map.get(q.category)!.push(q);
  }
  const keys = sortCategoriesForDisplay(keyOrder);
  return keys.map((k) => [k, map.get(k)!]);
}

export const MOCK_PROGRESS_KEY = (sessionId: string) => `inro-mock-progress-${sessionId}`;
export const MOCK_TOAST_FLAG_KEY = (sessionId: string) => `inro-brief-toast-${sessionId}`;

export function readMockProgress(sessionId: string): Record<string, "pending" | "done" | "skipped"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MOCK_PROGRESS_KEY(sessionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, "pending" | "done" | "skipped"> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "done" || v === "skipped" || v === "pending") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeMockProgress(sessionId: string, progress: Record<string, "pending" | "done" | "skipped">) {
  localStorage.setItem(MOCK_PROGRESS_KEY(sessionId), JSON.stringify(progress));
}

export function setQuestionProgress(
  sessionId: string,
  questionId: string,
  status: "pending" | "done" | "skipped"
) {
  const next = { ...readMockProgress(sessionId), [questionId]: status };
  writeMockProgress(sessionId, next);
}

export function flagBriefToast(sessionId: string) {
  sessionStorage.setItem(MOCK_TOAST_FLAG_KEY(sessionId), "1");
}

export function consumeBriefToast(sessionId: string): boolean {
  const k = MOCK_TOAST_FLAG_KEY(sessionId);
  if (sessionStorage.getItem(k)) {
    sessionStorage.removeItem(k);
    return true;
  }
  return false;
}
