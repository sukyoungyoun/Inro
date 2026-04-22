import { NextResponse } from "next/server";
import { auth } from "@/auth";

type PlaybookRequest = {
  weakestModule: string;
  biggestRiskArea: string;
  targetRole: string;
  readinessScore: number;
};

type PlaybookTip = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  personaName: string;
  personaRole: string;
  /** Filter category label (e.g. "Behavioral answers") */
  category: string;
  /** Stable ordering for "most relevant" (higher = more relevant) */
  relevanceRank: number;
  /** Order in static library (higher ≈ more recent templates) */
  libraryIndex: number;
};

type TipTemplate = {
  id: string;
  topic: string;
  title: string;
  body: string;
  actionLabel: string;
  personaName: string;
  personaRole: string;
  keywords: string[];
  readinessBand: "all" | "early" | "mid" | "late";
};

const TOPIC_DEFS = [
  { id: "behavioral", label: "Behavioral answers", keywords: ["story", "behavioral", "example", "impact", "leadership"] },
  { id: "portfolio", label: "Portfolio presentation", keywords: ["portfolio", "presentation", "case study", "artifact", "walkthrough"] },
  { id: "domain", label: "Domain knowledge", keywords: ["domain", "industry", "systems", "analytics", "research"] },
  { id: "salary", label: "Salary negotiation", keywords: ["salary", "negotiation", "offer", "compensation", "equity"] },
  { id: "framing", label: "Career framing", keywords: ["career", "positioning", "intro", "narrative", "branding"] },
] as const;

const TIP_LIBRARY: TipTemplate[] = [
  {
    id: "b1",
    topic: "behavioral",
    title: "Lead with decision, then evidence",
    body: "Start each story with the decision you made, then show one metric and one trade-off. This keeps interviewers oriented and prevents long setup.",
    actionLabel: "Draft a 60-second story",
    personaName: "Maya Torres",
    personaRole: "Senior Product Recruiter",
    keywords: ["quantified", "outcomes", "clarity", "example", "behavioral"],
    readinessBand: "all",
  },
  {
    id: "b2",
    topic: "behavioral",
    title: "Build a failure story with recovery detail",
    body: "Use one real miss, name what signal you ignored, and explain the correction loop you put in place. Recovery is often scored higher than perfect outcomes.",
    actionLabel: "Outline failure-to-recovery",
    personaName: "Jon Park",
    personaRole: "Hiring Manager, Product Design",
    keywords: ["risk", "mistake", "learning", "execution"],
    readinessBand: "mid",
  },
  {
    id: "p1",
    topic: "portfolio",
    title: "Open every case study with business context",
    body: "In the first 20 seconds, state user, business goal, and your role. This frames your decisions before screenshots distract the panel.",
    actionLabel: "Rewrite case intros",
    personaName: "Lena Kim",
    personaRole: "Staff UX Design Lead",
    keywords: ["portfolio", "presentation", "context", "role scope"],
    readinessBand: "all",
  },
  {
    id: "p2",
    topic: "portfolio",
    title: "Show trade-offs, not just polished screens",
    body: "Present one rejected direction and why it lost. Interviewers use this to evaluate judgment, collaboration, and prioritization.",
    actionLabel: "Add rejected concept slide",
    personaName: "Ravi Menon",
    personaRole: "Principal Product Designer",
    keywords: ["trade-off", "decision", "stakeholder", "portfolio"],
    readinessBand: "all",
  },
  {
    id: "d1",
    topic: "domain",
    title: "Prepare 3 role-specific domain signals",
    body: "Select three domain patterns relevant to the job and pair each with one real project decision you made. This turns generic answers into targeted evidence.",
    actionLabel: "Create domain evidence sheet",
    personaName: "Iris Chen",
    personaRole: "UX Research Manager",
    keywords: ["domain", "industry", "analyst", "product sense"],
    readinessBand: "all",
  },
  {
    id: "d2",
    topic: "domain",
    title: "Translate technical terms into user impact",
    body: "For each framework you mention, add one sentence on user impact and one sentence on business impact. This bridges cross-functional interviews.",
    actionLabel: "Practice impact translation",
    personaName: "Sofia Hale",
    personaRole: "Director of Design Operations",
    keywords: ["technical", "impact", "cross-functional", "communication"],
    readinessBand: "early",
  },
  {
    id: "s1",
    topic: "salary",
    title: "Anchor with scope, not just market median",
    body: "Frame compensation around role scope and expected outcomes. Scope-based anchors feel more credible than copying public salary ranges.",
    actionLabel: "Draft negotiation anchor",
    personaName: "Noah Bennett",
    personaRole: "Recruiting Partner",
    keywords: ["salary", "negotiation", "offer", "compensation"],
    readinessBand: "mid",
  },
  {
    id: "s2",
    topic: "salary",
    title: "Prepare your walk-away criteria early",
    body: "Define minimum acceptable base, growth path, and role scope before final rounds. Decisions get harder when offer pressure increases.",
    actionLabel: "Set walk-away criteria",
    personaName: "Elena Brooks",
    personaRole: "Career Coach, Product Talent",
    keywords: ["offer", "criteria", "final round", "negotiation"],
    readinessBand: "late",
  },
  {
    id: "f1",
    topic: "framing",
    title: "Use one career narrative across all answers",
    body: "State your through-line once, then connect each example back to it. Consistency helps panels remember your fit after interview loops.",
    actionLabel: "Write 30-second narrative",
    personaName: "Avery Cole",
    personaRole: "Design Program Lead",
    keywords: ["career", "framing", "narrative", "positioning"],
    readinessBand: "all",
  },
  {
    id: "f2",
    topic: "framing",
    title: "Tailor your intro to this exact role",
    body: "Make your opening statement role-first: who you are, the problem types you solve, and why this job is the logical next step.",
    actionLabel: "Tailor opening pitch",
    personaName: "Mina Patel",
    personaRole: "Senior Recruiting Manager",
    keywords: ["target role", "intro", "framing", "fit"],
    readinessBand: "all",
  },
];

function normalize(text: string) {
  return text.toLowerCase();
}

function inferReadinessBand(score: number): "early" | "mid" | "late" {
  if (score < 45) return "early";
  if (score < 75) return "mid";
  return "late";
}

function scoreTemplate(template: TipTemplate, payload: PlaybookRequest, topicKeywords: string[]) {
  const context = normalize(`${payload.weakestModule} ${payload.biggestRiskArea} ${payload.targetRole}`);
  let score = 0;

  for (const kw of template.keywords) {
    if (context.includes(normalize(kw))) score += 4;
  }
  for (const kw of topicKeywords) {
    if (context.includes(normalize(kw))) score += 2;
  }

  const band = inferReadinessBand(payload.readinessScore);
  if (template.readinessBand === "all") score += 2;
  if (template.readinessBand === band) score += 3;

  return score;
}

function selectTipsForTopic(
  payload: PlaybookRequest,
  topicId: string,
  topicKeywords: string[],
  topicLabel: string,
  rankOffset: { n: number }
): PlaybookTip[] {
  return TIP_LIBRARY.filter((item) => item.topic === topicId)
    .map((item) => ({ item, score: scoreTemplate(item, payload, topicKeywords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ item, score }) => {
      rankOffset.n += 1;
      const libraryIndex = TIP_LIBRARY.findIndex((t) => t.id === item.id);
      return {
        id: item.id,
        title: item.title,
        body: item.body,
        actionLabel: item.actionLabel,
        personaName: item.personaName,
        personaRole: item.personaRole,
        category: topicLabel,
        relevanceRank: score * 1000 + rankOffset.n,
        libraryIndex: libraryIndex >= 0 ? libraryIndex : 0,
      };
    });
}

function sanitizePayload(body: Partial<PlaybookRequest>): PlaybookRequest {
  return {
    weakestModule: String(body.weakestModule || "").trim(),
    biggestRiskArea: String(body.biggestRiskArea || "").trim(),
    targetRole: String(body.targetRole || "").trim(),
    readinessScore: Math.max(0, Math.min(100, Number(body.readinessScore || 0))),
  };
}

function buildTopicOrder(payload: PlaybookRequest) {
  const context = normalize(`${payload.weakestModule} ${payload.biggestRiskArea}`);
  return [...TOPIC_DEFS]
    .map((topic) => {
      const keywordHits = topic.keywords.reduce((sum, kw) => sum + (context.includes(normalize(kw)) ? 1 : 0), 0);
      return { ...topic, keywordHits };
    })
    .sort((a, b) => b.keywordHits - a.keywordHits)
    .slice(0, 5);
}

async function generateTopicLabelsWithGemini(apiKey: string, payload: PlaybookRequest): Promise<string[] | null> {
  const prompt = `You are a career coaching assistant. Based on this user's interview prep data, generate 5 concise topic labels for a recruiting tips feed.

Rules:
- Return only a JSON array of exactly 5 strings.
- 2 to 4 words each.
- Focus on: behavioral answers, portfolio presentation, domain knowledge, salary negotiation, and career framing.

User context:
- weakest module: ${payload.weakestModule}
- biggest risk area: ${payload.biggestRiskArea}
- target role: ${payload.targetRole}
- readiness score: ${payload.readinessScore}%`;

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const raw = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const labels = parsed.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5);
    return labels.length === 5 ? labels : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<PlaybookRequest>;
    const payload = sanitizePayload(body);

    if (!payload.weakestModule && !payload.biggestRiskArea && !payload.targetRole) {
      return NextResponse.json({ error: "Missing personalization data." }, { status: 400 });
    }

    const rankedTopics = buildTopicOrder(payload);
    const rankOffset = { n: 0 };
    const results = rankedTopics.map((topic) => ({
      query: topic.label,
      tips: selectTipsForTopic(payload, topic.id, [...topic.keywords], topic.label, rankOffset),
    }));

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiQueries = geminiApiKey ? await generateTopicLabelsWithGemini(geminiApiKey, payload) : null;
    const queries = geminiQueries && geminiQueries.length === results.length ? geminiQueries : results.map((group) => group.query);

    return NextResponse.json({ queries, results });
  } catch {
    return NextResponse.json({ error: "Could not generate playbook tips." }, { status: 500 });
  }
}
