// /api/analyze.js  — Vercel serverless function
// Deploy at: api/analyze.js in your project root
// Set GEMINI_API_KEY in Vercel → Project Settings → Environment Variables

export default async function handler(req, res) {
  // CORS headers so the browser can call this from any origin during local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables.",
    });
  }

  const { jd, rv, company = "", stage = "" } = req.body || {};

  if (!jd || !rv) {
    return res.status(400).json({ error: "Both jd and rv are required." });
  }

  const companyNote = company ? `Target company: ${company}.` : "";
  const stageNote   = stage   ? `Interview stage: ${stage}.`   : "";

  const prompt = `You are an expert interview coach. Analyze the job description and resume.
${companyNote} ${stageNote}

Return ONLY a valid JSON object — no markdown, no code fences, no extra text.

{
  "role": "concise job title",
  "matchScore": 0-100,
  "summary": "2-3 sentences on fit and focus",
  "strongestAlignment": "one sentence on the strongest alignment",
  "biggestRisk": "one sentence on the biggest risk",
  "strengths": [
    { "title": "strength title", "desc": "2 sentences with specific coaching" },
    { "title": "...", "desc": "..." },
    { "title": "...", "desc": "..." }
  ],
  "gaps": [
    { "title": "gap title", "mitigation": "specific mitigation strategy" },
    { "title": "...", "mitigation": "..." }
  ],
  "questions": [
    { "type": "BEHAVIORAL",    "q": "question text", "insight": "why this matters" },
    { "type": "PRODUCT SENSE", "q": "...",            "insight": "..." },
    { "type": "SYSTEM DESIGN", "q": "...",            "insight": "..." }
  ]
}

JD:
${jd.substring(0, 4000)}

RESUME:
${rv.substring(0, 4000)}`.trim();

  try {
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: data.error?.message || "Gemini API error",
      });
    }

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const start = raw.indexOf("{");
      const end   = raw.lastIndexOf("}");
      if (start === -1 || end <= start) {
        return res.status(502).json({ error: "Gemini returned invalid JSON. Try again." });
      }
      parsed = JSON.parse(raw.slice(start, end + 1));
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}