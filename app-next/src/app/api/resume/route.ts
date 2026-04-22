import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromUploadedFile } from "@/lib/text-extraction";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sessionId = String(body.sessionId || "").trim();
  const company = body.company == null ? null : String(body.company).trim();
  const resumeText = body.resumeText == null ? null : String(body.resumeText).trim();

  if (!sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });

  const updated = await prisma.prepSession.updateMany({
    where: { id: sessionId, userId: session.user.id },
    data: {
      ...(company !== null ? { company: company || null } : {}),
      ...(resumeText !== null ? { resumeText: resumeText || "" } : {}),
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const sessionId = String(form.get("sessionId") || "").trim();
  const file = form.get("file");

  if (!sessionId || !(file instanceof File)) {
    return NextResponse.json({ error: "sessionId and file are required." }, { status: 400 });
  }

  let resumeText = "";
  try {
    resumeText = await extractTextFromUploadedFile(file);
  } catch {
    resumeText = "";
  }
  if (!resumeText) {
    return NextResponse.json(
      { error: "Could not extract text from file. Please upload TXT/PDF/DOCX with readable text." },
      { status: 422 }
    );
  }

  const updated = await prisma.prepSession.updateMany({
    where: { id: sessionId, userId: session.user.id },
    data: { resumeText },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, length: resumeText.length });
}

