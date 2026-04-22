import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromUploadedFile, extractedTextLooksUsable } from "@/lib/text-extraction";

type GeminiResult = {
  role?: string;
  matchScore?: number;
  summary?: string;
  strongestAlignment?: string;
  biggestRisk?: string;
  /** Honest caveats: missing info, ambiguity, assumptions */
  limitations?: string;
  /** 1–3 short bullets: what in JD/resume you grounded claims in */
  evidenceSummary?: string;
  strengths?: Array<{ title: string; desc: string }>;
  gaps?: Array<{ title: string; mitigation: string }>;
  questions?: Array<{
    type?: string;
    q?: string;
    insight?: string;
    coachingTips?: {
      principle?: string;
      workflowExample?: string;
      collaboration?: string;
    };
    suggestedStructure?: {
      step1_mindset?: string;
      step2_example?: string;
      step3_outcome?: string;
    };
  }>;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithFallback(apiKey: string, prompt: string) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  let lastStatus = 500;
  let lastMessage = "Gemini API error";

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.22 },
          }),
        }
      );

      const data = await res.json();
      if (res.ok) return { ok: true as const, data };

      const message = String(data?.error?.message || "Gemini API error");
      lastStatus = res.status || 500;
      lastMessage = message;

      const retriable =
        res.status === 429 ||
        res.status === 503 ||
        /high demand|temporar|overloaded|unavailable|quota/i.test(message);
      if (!retriable) break;

      await sleep(600 * (attempt + 1));
    }
  }

  return { ok: false as const, status: lastStatus, message: lastMessage };
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

    const contentType = req.headers.get("content-type") || "";
    let jd = "";
    let rv = "";
    let company = "";
    let stage = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      jd = String(form.get("jd") || "").trim();
      rv = String(form.get("rv") || "").trim();
      company = String(form.get("company") || "").trim();
      stage = String(form.get("stage") || "").trim();
      const jdFile = form.get("jdFile");
      const rvFile = form.get("rvFile");
      if (!jd && jdFile instanceof File) {
        try {
          jd = await extractTextFromUploadedFile(jdFile);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg === "Unsupported format") {
            return NextResponse.json(
              { error: "Job description upload must be PDF, DOCX, or TXT." },
              { status: 400 }
            );
          }
          return NextResponse.json(
            {
              error:
                msg === "PdfExtractionFailed"
                  ? `We could not read text from JD PDF (${jdFile.name}). Please upload a text-based PDF, DOCX, TXT, or paste the JD text.`
                  : `Could not parse JD file (${jdFile.name}). Please upload DOCX/TXT or paste the JD text.`,
            },
            { status: 400 }
          );
        }
        if (!extractedTextLooksUsable(jd)) {
          return NextResponse.json(
            {
              error: `Extracted JD text from ${jdFile.name} is too low quality. Please paste JD text or upload DOCX/TXT.`,
            },
            { status: 400 }
          );
        }
      }
      if (!rv && rvFile instanceof File) {
        try {
          rv = await extractTextFromUploadedFile(rvFile);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg === "Unsupported format") {
            return NextResponse.json(
              { error: "Resume upload must be PDF, DOCX, or TXT." },
              { status: 400 }
            );
          }
          return NextResponse.json(
            {
              error:
                msg === "PdfExtractionFailed"
                  ? `We could not read text from resume PDF (${rvFile.name}). Please upload a text-based PDF, DOCX, TXT, or paste resume text.`
                  : `Could not parse resume file (${rvFile.name}). Please upload DOCX/TXT or paste resume text.`,
            },
            { status: 400 }
          );
        }
        if (!extractedTextLooksUsable(rv)) {
          return NextResponse.json(
            {
              error: `Extracted resume text from ${rvFile.name} is too low quality. Please paste resume text or upload DOCX/TXT.`,
            },
            { status: 400 }
          );
        }
      }
    } else {
      const body = await req.json();
      jd = String(body.jd || "").trim();
      rv = String(body.rv || "").trim();
      company = String(body.company || "").trim();
      stage = String(body.stage || "").trim();
    }

    if (!jd || !rv) {
      return NextResponse.json({ error: "Both jd and rv are required." }, { status: 400 });
    }

    const jdChunk = jd.length > 12000 ? `${jd.slice(0, 12000)}\n\n[JD truncated for length]` : jd;
    const rvChunk = rv.length > 12000 ? `${rv.slice(0, 12000)}\n\n[Resume truncated for length]` : rv;

    const prompt = `You are a careful interview-prep assistant. Your job is to help the candidate prepare — NOT to flatter, invent credentials, or claim certainty you do not have.

GROUND RULES (critical):
- Base every claim ONLY on the JD and resume text below. If something is not stated, do not imply the candidate did it.
- If the JD or resume is vague, thin, or contradictory, say so in "limitations" and lower confidence in your language (avoid absolute words like "proven" unless the resume explicitly shows it).
- "matchScore" is a rough heuristic estimate of narrative fit for interview prep — NOT a hiring decision or guarantee. Never present it as an objective hiring score.
- "evidenceSummary": 1–3 short clauses listing what you actually used (e.g. "JD asks for X; resume mentions Y").
- "limitations": one honest paragraph on gaps, ambiguity, missing company name, OCR noise, or anything that could make this brief wrong.

${company ? `Stated target company: ${company}.` : "No company name was provided — do not invent a company."}
${stage ? `Interview stage: ${stage}.` : ""}
Return ONLY a valid JSON object — no markdown, no code fences, no commentary before or after.

{
  "role": "concise inferred job title from JD (not from filename alone)",
  "matchScore": integer 0-100,
  "summary": "2-3 sentences; qualify uncertainty where needed",
  "strongestAlignment": "one sentence tied to explicit JD + resume overlap",
  "biggestRisk": "one sentence: concrete risk for this interview based on the materials",
  "limitations": "honest paragraph per rules above",
  "evidenceSummary": "1-3 short clauses on what you grounded the brief in",
  "strengths": [
    { "title": "short label", "desc": "2 sentences; cite themes from resume that map to JD requirements" },
    { "title": "...", "desc": "..." }
  ],
  "gaps": [
    { "title": "gap label", "mitigation": "actionable prep step" },
    { "title": "...", "mitigation": "..." }
  ],
  "questions": [
    { "type": "BEHAVIORAL", "q": "question text grounded in JD themes", "insight": "what interviewers are probing" },
    { "type": "PRODUCT SENSE", "q": "...", "insight": "..." },
    { "type": "SYSTEM DESIGN", "q": "...", "insight": "..." }
  ]
}

JOB DESCRIPTION (JD):
${jdChunk}

RESUME:
${rvChunk}`.trim();

    const gemini = await callGeminiWithFallback(apiKey, prompt);
    let parsed: GeminiResult;
    if (!gemini.ok) {
      return NextResponse.json(
        {
          error:
            "AI analysis is temporarily unavailable. Please retry in a moment; we only generate briefs from fully parsed text.",
        },
        { status: 503 }
      );
    } else {
      const rawData = gemini.data;
      let raw = rawData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      try {
        parsed = JSON.parse(raw);
      } catch {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        if (s === -1 || e <= s) {
          return NextResponse.json(
            {
              error:
                "AI returned an invalid response format. Please retry; analysis only proceeds with verifiable structured output.",
            },
            { status: 502 }
          );
        }
        parsed = JSON.parse(raw.slice(s, e + 1));
      }
    }

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.matchScore) || 0)));
    const rawPersist = {
      ...parsed,
      matchScore: score,
      limitations:
        parsed.limitations?.trim() ||
        "AI-generated from your pasted or extracted text; verify against the original JD and resume.",
      evidenceSummary:
        parsed.evidenceSummary?.trim() ||
        "Compare this brief side-by-side with your source documents to catch mistakes.",
    };

    const created = await prisma.prepSession.create({
      data: {
        userId: session.user.id,
        title: parsed.role || company || "Role Analysis",
        company: company || null,
        jdText: jd,
        resumeText: rv,
        matchScore: score,
        roleSummary: parsed.summary ?? null,
        status: "ANALYZED",
        analysis: {
          create: {
            strongestAlignment: parsed.strongestAlignment ?? null,
            biggestRisk: parsed.biggestRisk ?? null,
            strengthsJson: parsed.strengths ?? [],
            gapsJson: parsed.gaps ?? [],
            rawResponseJson: rawPersist as object,
          },
        },
        questions: {
          create: (parsed.questions || []).map((q, i) => ({
            category: q.type || "Behavioral",
            question: q.q || "",
            insight: q.insight || null,
            principle: q.coachingTips?.principle || null,
            workflow: q.coachingTips?.workflowExample || null,
            collaboration: q.coachingTips?.collaboration || null,
            step1: q.suggestedStructure?.step1_mindset || null,
            step2: q.suggestedStructure?.step2_example || null,
            step3: q.suggestedStructure?.step3_outcome || null,
            order: i,
          })),
        },
      },
      // Return only the ID to avoid selecting optional columns that might not yet exist
      // in lagging production DB schemas.
      select: { id: true },
    });

    return NextResponse.json({
      id: created.id,
      role: parsed.role || "Role Analysis",
      matchScore: score,
      summary: parsed.summary || "",
      strongestAlignment: parsed.strongestAlignment || "",
      biggestRisk: parsed.biggestRisk || "",
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
      questions: parsed.questions || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Server error during analysis. Please try again in a few seconds." },
      { status: 500 }
    );
  }
}

