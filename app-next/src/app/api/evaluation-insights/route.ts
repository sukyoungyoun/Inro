import { NextResponse } from "next/server";
import { auth } from "@/auth";

type InsightsBody = {
  transcript?: string;
  question?: string;
  category?: string;
  roleTitle?: string;
  company?: string;
};

type InsightsResult = {
  score: number;
  strengths: Array<{ title: string; desc: string }>;
  gaps: Array<{ title: string; mitigation: string }>;
};

function parseInsightsJson(raw: string): InsightsResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<InsightsResult>;
    const score = Number(parsed.score);
    if (!Number.isFinite(score)) return null;
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];
    const normStrengths = strengths
      .map((s) => ({
        title: String((s as { title?: string })?.title || "").trim(),
        desc: String((s as { desc?: string })?.desc || "").trim(),
      }))
      .filter((s) => s.title && s.desc)
      .slice(0, 3);
    const normGaps = gaps
      .map((g) => ({
        title: String((g as { title?: string })?.title || "").trim(),
        mitigation: String((g as { mitigation?: string })?.mitigation || "").trim(),
      }))
      .filter((g) => g.title && g.mitigation)
      .slice(0, 3);
    if (normStrengths.length < 1 || normGaps.length < 1) return null;
    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      strengths: normStrengths,
      gaps: normGaps,
    };
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY missing in server env." }, { status: 500 });
    }

    const body = (await req.json()) as InsightsBody;
    const transcript = String(body.transcript || "").trim();
    const question = String(body.question || "").trim();
    const category = String(body.category || "").trim();
    const roleTitle = String(body.roleTitle || "Candidate").trim();
    const company = String(body.company || "the company").trim();

    if (!transcript) {
      return NextResponse.json({ error: "Transcript required." }, { status: 400 });
    }

    const prompt = `You are an expert interview coach. Evaluate ONLY the candidate's answer to the behavioral or experience-based question below — not their resume or full job fit.

Interview question (${category || "general"}):
${question || "(not provided)"}

Role context for tone: ${roleTitle} at ${company}.

Candidate answer (raw speech-to-text; may contain errors):
${transcript}

Return ONLY valid JSON (no markdown) with this shape:
{
  "score": <integer 0-100 based on answer quality for THIS question: structure, clarity, specificity, insight, ownership, impact>,
  "strengths": [
    { "title": "<short label>", "desc": "<1-2 sentences tied to what they actually said>" }
  ],
  "gaps": [
    { "title": "<short label>", "mitigation": "<1-2 actionable sentences>" }
  ]
}

Rules:
- Include exactly 2 items in strengths and exactly 2 in gaps.
- Ground every point in the candidate's answer; do not invent projects or employers not implied by the transcript.
- If the answer is very short or vague, score low and say so in gaps.`;

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
          generationConfig: { temperature: 0.25 },
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String((data as { error?: { message?: string } })?.error?.message || "Gemini API error");
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const raw = String((data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts?.[0]?.text || "");
    const parsed = parseInsightsJson(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse evaluation." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Evaluation failed." }, { status: 500 });
  }
}
