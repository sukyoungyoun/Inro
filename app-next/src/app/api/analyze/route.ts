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
      jd = await extractTextFromFile(jdFile);
      if (!jd) {
        jd = `Uploaded Job Description file: ${jdFile.name}. Text extraction was unavailable, so analysis should infer likely role context from filename and other provided fields.`;
      }
    }
    if (!rv && rvFile instanceof File) {
      rv = await extractTextFromFile(rvFile);
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

  const geminiRes = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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

  const rawData = await geminiRes.json();
  if (!geminiRes.ok) {
    return NextResponse.json(
      { error: rawData.error?.message || "Gemini API error" },
      { status: geminiRes.status }
    );
  }

  let raw = rawData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  let parsed: GeminiResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s === -1 || e <= s) {
      return NextResponse.json({ error: "Gemini returned invalid JSON." }, { status: 502 });
    }
    parsed = JSON.parse(raw.slice(s, e + 1));
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
}

