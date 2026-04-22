import { randomUUID } from "crypto";
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
  category: string;
  relevanceRank: number;
  libraryIndex: number;
};

type PlaybookGroup = {
  query: string;
  tips: PlaybookTip[];
};

const TOPIC_DEFS = [
  { id: "behavioral", label: "Behavioral answers", keywords: ["story", "behavioral", "example", "impact", "leadership"] },
  { id: "portfolio", label: "Portfolio presentation", keywords: ["portfolio", "presentation", "case study", "artifact", "walkthrough"] },
  { id: "domain", label: "Domain knowledge", keywords: ["domain", "industry", "systems", "analytics", "research"] },
  { id: "salary", label: "Salary negotiation", keywords: ["salary", "negotiation", "offer", "compensation", "equity"] },
  { id: "framing", label: "Career framing", keywords: ["career", "positioning", "intro", "narrative", "branding"] },
] as const;

function normalize(text: string) {
  return text.toLowerCase();
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

type GeminiResultsShape = {
  results?: Array<{
    query?: string;
    tips?: Array<{
      title?: string;
      body?: string;
      personaName?: string;
      personaRole?: string;
      actionLabel?: string;
    }>;
  }>;
};

function normalizeGeminiResults(parsed: GeminiResultsShape, rankedTopics: ReturnType<typeof buildTopicOrder>): PlaybookGroup[] {
  const list = Array.isArray(parsed.results) ? parsed.results : [];
  const out: PlaybookGroup[] = [];
  let libIdx = 0;

  for (let i = 0; i < rankedTopics.length; i++) {
    const topic = rankedTopics[i]!;
    const g = list[i];
    const query = (g?.query && String(g.query).trim()) || topic.label;
    const rawTips = Array.isArray(g?.tips) ? g.tips : [];
    const tips: PlaybookTip[] = [];

    for (let j = 0; j < 2; j++) {
      const t = rawTips[j];
      const title = String(t?.title || "").trim() || `Focus area ${j + 1}`;
      const body = String(t?.body || "").trim() || "Add more prep context and refresh for tailored advice.";
      tips.push({
        id: randomUUID(),
        title: title.slice(0, 140),
        body: body.slice(0, 720),
        actionLabel: String(t?.actionLabel || "Practice this week").slice(0, 72),
        personaName: String(t?.personaName || "Talent partner").slice(0, 80),
        personaRole: String(t?.personaRole || "Recruiting").slice(0, 90),
        category: query,
        relevanceRank: 100 * (rankedTopics.length - i) + (2 - j),
        libraryIndex: libIdx++,
      });
    }
    out.push({ query, tips });
  }
  return out;
}

function buildPlaybookPrompt(payload: PlaybookRequest, rankedTopics: ReturnType<typeof buildTopicOrder>) {
  const categoryOrder = rankedTopics.map((t) => `${t.label} (${t.id})`).join(" → ");
  return `You are Inro's recruiting-coach AI. Generate a personalized playbook for one candidate.

User context:
- Target role: ${payload.targetRole}
- Weakest prep module / focus: ${payload.weakestModule}
- Biggest risk / gap context: ${payload.biggestRiskArea}
- Interview readiness score: ${payload.readinessScore}%

Category order (most relevant first — output results in THIS exact order, 5 groups):
${categoryOrder}

Rules:
1. Return ONLY JSON (no markdown fences). Top-level shape: {"results":[...]} where results has length 5.
2. Exactly 5 objects in "results", in the same order as the category list above.
3. Each object has "query" (short pill label, 2–4 words, aligned to that category) and exactly 2 items in "tips".
4. Each tip: unique title and body. Body is 2–3 tight sentences of actionable recruiting/interview advice tied to THIS user's gap and role. No filler.
5. Do NOT repeat the same opening across tips. Do NOT use boilerplate like "For ${payload.targetRole}, this helps close your…" or any sentence that restates the user's gap verbatim as a repeated footer — weave relevance naturally inside the advice.
6. personaName / personaRole: plausible hiring-side names (vary across tips).
7. actionLabel: a short concrete next step (verb-first, under 8 words when possible).
8. Keep tone practical, human, and specific to ${payload.targetRole} and the risk context without quoting it back in every card.`;
}

async function generatePlaybookWithGemini(apiKey: string, payload: PlaybookRequest): Promise<PlaybookGroup[] | null> {
  const rankedTopics = buildTopicOrder(payload);
  const prompt = buildPlaybookPrompt(payload, rankedTopics);

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  if (data?.promptFeedback?.blockReason) return null;
  let text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  if (!text) return null;
  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(text) as GeminiResultsShape;
    return normalizeGeminiResults(parsed, rankedTopics);
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

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error:
            "Playbook uses AI-generated tips. Set GEMINI_API_KEY for your deployment (e.g. in Vercel env) and redeploy.",
        },
        { status: 503 }
      );
    }

    const results = await generatePlaybookWithGemini(geminiApiKey, payload);
    if (!results || results.length === 0) {
      return NextResponse.json({ error: "Could not generate tips. Try Refresh in a moment." }, { status: 502 });
    }

    const queries = results.map((g) => g.query);
    return NextResponse.json({ queries, results });
  } catch {
    return NextResponse.json({ error: "Could not generate playbook tips." }, { status: 500 });
  }
}
