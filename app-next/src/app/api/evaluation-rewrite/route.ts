import { NextResponse } from "next/server";
import { auth } from "@/auth";

type RewriteBody = {
  transcript?: string;
  roleTitle?: string;
  company?: string;
};

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

    const body = (await req.json()) as RewriteBody;
    const transcript = String(body.transcript || "").trim();
    const roleTitle = String(body.roleTitle || "Candidate").trim();
    const company = String(body.company || "the company").trim();

    if (!transcript) {
      return NextResponse.json({ error: "Transcript required." }, { status: 400 });
    }

    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    if (wordCount < 30) {
      return NextResponse.json({ error: "Transcript too short." }, { status: 400 });
    }

    const prompt = `The user gave the following interview answer (raw speech-to-text, may have transcription errors): ${transcript}. Rewrite it as a strong, concise interview answer that follows Context → Action → Insight → Outcome structure. Fix any speech recognition errors based on context. Keep it in first person. Match the role context: ${roleTitle} at ${company}. Return only the rewritten answer, no preamble.`.replace(
      /\n/g,
      " "
    );

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
          generationConfig: { temperature: 0.35 },
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String((data as { error?: { message?: string } })?.error?.message || "Gemini API error");
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const rewrite = String(
      (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    ).trim();

    if (!rewrite) {
      return NextResponse.json({ error: "Empty rewrite." }, { status: 502 });
    }

    return NextResponse.json({ rewrite });
  } catch {
    return NextResponse.json({ error: "Rewrite failed." }, { status: 500 });
  }
}
