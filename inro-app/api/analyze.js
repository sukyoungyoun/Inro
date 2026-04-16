const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    role: { type: "STRING" },
    matchScore: { type: "NUMBER" },
    summary: { type: "STRING" },
    strongestAlignment: { type: "STRING" },
    biggestRisk: { type: "STRING" },
    strengths: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          desc: { type: "STRING" },
        },
        required: ["title", "desc"],
      },
    },
    gaps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          mitigation: { type: "STRING" },
        },
        required: ["title", "mitigation"],
      },
    },
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING" },
          q: { type: "STRING" },
          insight: { type: "STRING" },
          category: { type: "STRING" },
        },
        required: ["type", "q", "insight", "category"],
      },
    },
  },
  required: [
    "role",
    "matchScore",
    "summary",
    "strongestAlignment",
    "biggestRisk",
    "strengths",
    "gaps",
    "questions",
  ],
};

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeArray(arr, fallback) {
  if (!Array.isArray(arr) || arr.length === 0) return fallback;
  return arr;
}

function normalizePayload(payload = {}) {
  const strengths = normalizeArray(payload.strengths, [
    { title: "Transferable product depth", desc: "Highlight one concrete product decision with measurable impact and your rationale." },
  ]).map((item) => ({
    title: String(item?.title || "Strength"),
    desc: String(item?.desc || "Add concrete evidence and outcomes."),
  }));

  const gaps = normalizeArray(payload.gaps, [
    { title: "Story clarity gap", mitigation: "Prepare one STAR story proving how your UX decision shifted a key product KPI." },
  ]).map((item) => ({
    title: String(item?.title || "Gap"),
    mitigation: String(item?.mitigation || "Create a mitigation plan tied to a business outcome."),
  }));

  const questions = normalizeArray(payload.questions, [
    {
      type: "PRODUCT UX",
      q: "Tell me about a high-stakes product UX decision where you had incomplete data. How did you decide?",
      insight: "Assesses product judgment, ambiguity handling, and business-prioritization maturity.",
      category: "product",
    },
  ]).map((item) => ({
    type: String(item?.type || "PRODUCT UX"),
    q: String(item?.q || "Describe your highest-impact product UX decision and why it worked."),
    insight: String(item?.insight || "Reveals strategic product design thinking and decision quality."),
    category: String(item?.category || "product"),
  }));

  return {
    role: String(payload.role || "Product Design Role"),
    matchScore: clampScore(payload.matchScore),
    summary: String(payload.summary || "Candidate shows partial alignment and should sharpen product-level framing."),
    strongestAlignment: String(payload.strongestAlignment || "Strong UX execution with clear user-centered process evidence."),
    biggestRisk: String(payload.biggestRisk || "Product strategy depth may be under-signaled without stronger business linkage."),
    strengths,
    gaps,
    questions,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  const jdText = String(req.body?.jdText || "").trim();
  const rvText = String(req.body?.rvText || "").trim();
  const company = String(req.body?.company || "").trim();
  const stage = String(req.body?.stage || "").trim();

  if (!jdText || !rvText) {
    return res.status(400).json({ error: "Both jdText and rvText are required." });
  }

  const companyNote = company ? `Target company: ${company}.` : "";
  const stageNote = stage ? `Interview stage: ${stage}.` : "";

  const prompt = `
You are Inro, a senior interview coach for Product UX roles.
Prioritize strategic thinking, decision quality, systems thinking, collaboration maturity, and narrative coherence over keyword overlap.

${companyNote} ${stageNote}

Output must be valid JSON matching the provided schema.

Use JD and resume to infer:
- strongest strategic fit areas
- highest-risk cognitive or product judgment gaps
- interview questions that expose depth of Product UX thinking.

JD:
${jdText.substring(0, 6000)}

Resume:
${rvText.substring(0, 6000)}
`.trim();

  const geminiBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API error",
      });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ error: "Gemini response was not valid JSON." });
    }

    return res.status(200).setHeader("Cache-Control", "no-store").json(normalizePayload(parsed));
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unexpected server error.",
    });
  }
}
