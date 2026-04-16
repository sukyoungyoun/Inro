// Netlify serverless function to call Gemini securely.
// Expects POST body: { jdText, rvText, company?, stage? }

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const jdText = (payload.jdText || "").toString();
  const rvText = (payload.rvText || "").toString();
  const company = (payload.company || "").toString();
  const stage = (payload.stage || "").toString();

  if (!jdText || !rvText) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Both jdText and rvText are required." }),
    };
  }

  const companyNote = company ? `Target company: ${company}.` : "";
  const stageNote = stage ? `Interview stage: ${stage}.` : "";

  const prompt = `
Analyze this Job Description (JD) and Resume.

${companyNote} ${stageNote}

Return ONLY a JSON object, no markdown, no extra text.

The JSON schema:
{
  "role": "Concise role title",
  "summary": "2-3 sentence plain English summary of how this candidate fits the role.",
  "matchScore": 0-100,
  "strengths": ["bullet", "bullet", "bullet"],
  "gaps": ["bullet", "bullet", "bullet"],
  "questions": [
    { "q": "behavioral or technical interview question", "reason": "why this question matters" },
    { "q": "...", "reason": "..." },
    { "q": "...", "reason": "..." }
  ]
}

JD:
${jdText.substring(0, 4000)}

Resume:
${rvText.substring(0, 4000)}
  `.trim();

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: data.error?.message || "Gemini API error" }),
      };
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    rawText = rawText.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to salvage the first JSON object if extra text slipped in.
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) {
        return {
          statusCode: 502,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Gemini response was not valid JSON." }),
        };
      }
      parsed = JSON.parse(rawText.slice(start, end + 1));
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Unexpected server error" }),
    };
  }
};

