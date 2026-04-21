import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type GeminiResult = {
  role?: string;
  matchScore?: number;
  summary?: string;
  strongestAlignment?: string;
  biggestRisk?: string;
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
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
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
            generationConfig: { temperature: 0.4 },
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
    const pdfParseModule = await import("pdf-parse");
    const pdfParse =
      (pdfParseModule as unknown as { default?: (b: Buffer) => Promise<{ text?: string }> }).default ||
      (pdfParseModule as unknown as (b: Buffer) => Promise<{ text?: string }>);
    const parsed = await pdfParse(buffer);
    return (parsed?.text || "").trim();
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return (parsed.value || "").trim();
  }
  return "";
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
        } catch {
          jd = "";
        }
        if (!jd) {
          jd = `Uploaded Job Description file: ${jdFile.name}. Text extraction was unavailable, so analysis should infer likely role context from filename and other provided fields.`;
        }
      }
      if (!rv && rvFile instanceof File) {
        try {
          rv = await extractTextFromFile(rvFile);
        } catch {
          rv = "";
        }
        if (!rv) {
          rv = `Uploaded Resume file: ${rvFile.name}. Text extraction was unavailable, so analysis should proceed with conservative assumptions and highlight uncertainty.`;
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

    const prompt = `You are an expert interview coach. Analyze the job description and resume.
${company ? `Target company: ${company}.` : ""} ${stage ? `Interview stage: ${stage}.` : ""}

Return ONLY a valid JSON object — no markdown, no code fences, no extra text.

{
  "role": "concise job title",
  "matchScore": 0-100,
  "summary": "2-3 sentences on fit and focus",
  "strongestAlignment": "one sentence on the strongest alignment",
  "biggestRisk": "one sentence on the biggest risk",
  "strengths": [
    { "title": "strength title", "desc": "2 sentences with specific coaching" },
    { "title": "...", "desc": "..." }
  ],
  "gaps": [
    { "title": "gap title", "mitigation": "specific mitigation strategy" },
    { "title": "...", "mitigation": "..." }
  ],
  "questions": [
    { "type": "BEHAVIORAL", "q": "question text", "insight": "why this matters" },
    { "type": "PRODUCT SENSE", "q": "...", "insight": "..." },
    { "type": "SYSTEM DESIGN", "q": "...", "insight": "..." }
  ]
}

JD:
${jd.substring(0, 4000)}

RESUME:
${rv.substring(0, 4000)}`.trim();

    const gemini = await callGeminiWithFallback(apiKey, prompt);
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

    const created = await prisma.prepSession.create({
    data: {
      userId: session.user.id,
      title: parsed.role || company || "Role Analysis",
      company: company || null,
      jdText: jd,
      resumeText: rv,
      matchScore: parsed.matchScore ?? null,
      roleSummary: parsed.summary ?? null,
      status: "ANALYZED",
      analysis: {
        create: {
          strongestAlignment: parsed.strongestAlignment ?? null,
          biggestRisk: parsed.biggestRisk ?? null,
          strengthsJson: parsed.strengths ?? [],
          gapsJson: parsed.gaps ?? [],
          rawResponseJson: parsed as object,
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
    include: {
      analysis: true,
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

    return NextResponse.json({
      id: created.id,
      role: parsed.role || "Role Analysis",
      matchScore: parsed.matchScore ?? 0,
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

