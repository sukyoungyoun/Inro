import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

function buildHeuristicFallback(jd: string, rv: string, company: string): GeminiResult {
  const lowerJd = jd.toLowerCase();
  const lowerRv = rv.toLowerCase();
  const keywords = [
    "design",
    "product",
    "research",
    "analytics",
    "leadership",
    "system",
    "accessibility",
    "collaboration",
    "strategy",
  ];
  const overlap = keywords.filter((k) => lowerJd.includes(k) && lowerRv.includes(k));
  const roleGuess =
    (jd.match(/(?:senior|staff|lead)?\s*(product|ux|ui|design|research)[^,\n]*/i)?.[0] || "")
      .trim() || "Role Analysis";
  const score = Math.max(52, Math.min(88, 52 + overlap.length * 4));

  return {
    role: roleGuess,
    matchScore: score,
    limitations:
      "Automatic fallback ran (AI model unavailable or response invalid). Scores and bullets are heuristic guesses from keyword overlap—not verified against your full documents.",
    evidenceSummary:
      overlap.length > 0
        ? `Keyword overlap detected: ${overlap.slice(0, 5).join(", ")}.`
        : "Limited keyword overlap between pasted JD and resume text.",
    summary:
      `Generated in fallback mode due to model capacity limits. You show ${overlap.length} direct skill overlaps with the role requirements; prioritize concrete examples tailored to this job.`,
    strongestAlignment:
      overlap[0]
        ? `Clear overlap in ${overlap[0]} between your resume and the job description.`
        : "General role-relevant experience appears in your profile.",
    biggestRisk:
      "Evidence specificity may be too generic; quantify outcomes and tie each story to role requirements.",
    strengths: [
      {
        title: "Keyword alignment",
        desc: "Resume language overlaps with job requirements, giving a usable base for interview story framing.",
      },
      {
        title: "Role relevance",
        desc: "Your materials suggest transferable experience for this position and company context.",
      },
    ],
    gaps: [
      {
        title: "Specificity gap",
        mitigation: "Prepare STAR examples with measurable outcomes for each priority requirement.",
      },
      {
        title: "Company tailoring",
        mitigation: `Connect your examples to ${company || "the target company"} product domain and collaboration model.`,
      },
    ],
    questions: [
      {
        type: "BEHAVIORAL",
        q: "Tell me about a project where you had to balance quality, speed, and stakeholder constraints.",
        insight: "Tests prioritization and cross-functional communication.",
      },
      {
        type: "PRODUCT SENSE",
        q: "How would you evaluate whether your solution improved user outcomes after launch?",
        insight: "Tests metric design and decision-making rigor.",
      },
      {
        type: "SYSTEM DESIGN",
        q: "Walk through how you would structure a scalable workflow for this role’s core responsibilities.",
        insight: "Tests systems thinking and execution planning.",
      },
    ],
  };
}

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

async function extractTextFromFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === "text/plain" || lower.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse =
        (pdfParseModule as unknown as { default?: (b: Buffer) => Promise<{ text?: string }> }).default ||
        (pdfParseModule as unknown as (b: Buffer) => Promise<{ text?: string }>);
      const parsed = await pdfParse(buffer);
      const text = (parsed?.text || "").trim();
      if (text) return text;
    } catch {
      // Fallback below
    }

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
      });
      const doc = await loadingTask.promise;
      const chunks: string[] = [];
      for (let p = 1; p <= doc.numPages; p += 1) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const pageText = (content.items as Array<{ str?: string }>)
          .map((i) => i.str || "")
          .join(" ")
          .trim();
        if (pageText) chunks.push(pageText);
      }
      const merged = chunks.join("\n").trim();
      if (merged) return merged;
    } catch {
      // handled by error below
    }

    throw new Error("PdfExtractionFailed");
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return (parsed.value || "").trim();
  }
  throw new Error("Unsupported format");
}

function extractedTextLooksUsable(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  const words = cleaned.split(" ").filter(Boolean);
  const alphaChars = cleaned.replace(/[^A-Za-z]/g, "").length;
  const ratio = alphaChars / Math.max(1, cleaned.length);
  return cleaned.length >= 120 && words.length >= 18 && ratio >= 0.35;
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
          jd = await extractTextFromFile(jdFile);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          return NextResponse.json(
            {
              error:
                msg === "Unsupported format"
                  ? "Job description upload must be PDF, DOCX, or TXT."
                  : msg === "PdfExtractionFailed"
                    ? "We couldn't reliably read that JD PDF. Try re-exporting as text-based PDF, or upload DOCX/TXT."
                  : "Could not read the uploaded job description file. Try DOCX/TXT, or paste text directly.",
            },
            { status: 400 }
          );
        }
        if (!extractedTextLooksUsable(jd)) {
          return NextResponse.json(
            {
              error:
                "We could not extract enough readable text from the uploaded job description. Try DOCX/TXT, or paste the JD text directly for better results.",
            },
            { status: 400 }
          );
        }
      }
      if (!rv && rvFile instanceof File) {
        try {
          rv = await extractTextFromFile(rvFile);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          return NextResponse.json(
            {
              error:
                msg === "Unsupported format"
                  ? "Resume upload must be PDF, DOCX, or TXT."
                  : msg === "PdfExtractionFailed"
                    ? "We couldn't reliably read that resume PDF. Try re-exporting as text-based PDF, or upload DOCX/TXT."
                  : "Could not read the uploaded resume file. Try DOCX/TXT, or paste text directly.",
            },
            { status: 400 }
          );
        }
        if (!extractedTextLooksUsable(rv)) {
          return NextResponse.json(
            {
              error:
                "We could not extract enough readable text from the uploaded resume. Try DOCX/TXT, or paste your resume text directly.",
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
    const usedFallbackAnalysis = !gemini.ok;
    let parsed: GeminiResult;
    if (!gemini.ok) {
      parsed = buildHeuristicFallback(jd, rv, company);
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
          parsed = buildHeuristicFallback(jd, rv, company);
        } else {
          parsed = JSON.parse(raw.slice(s, e + 1));
        }
      }
    }

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.matchScore) || 0)));
    const rawPersist = {
      ...parsed,
      matchScore: score,
      usedFallbackAnalysis,
      limitations:
        parsed.limitations?.trim() ||
        (usedFallbackAnalysis
          ? "Heuristic fallback was used."
          : "AI-generated from your pasted or extracted text; verify against the original JD and resume."),
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

