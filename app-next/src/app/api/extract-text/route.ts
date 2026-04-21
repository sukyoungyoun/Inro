import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const lower = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    if (file.type === "text/plain" || lower.endsWith(".txt")) {
      return NextResponse.json({ text: buffer.toString("utf-8").trim() });
    }

    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse =
        (pdfParseModule as unknown as { default?: (b: Buffer) => Promise<{ text?: string }> }).default ||
        (pdfParseModule as unknown as (b: Buffer) => Promise<{ text?: string }>);
      const parsed = await pdfParse(buffer);
      return NextResponse.json({ text: (parsed?.text || "").trim() });
    }

    if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: (parsed.value || "").trim() });
    }

    return NextResponse.json(
      { error: "Unsupported file format. Please upload PDF, DOCX, or TXT." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not extract text from the uploaded file. Please paste text manually." },
      { status: 422 }
    );
  }
}

