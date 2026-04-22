import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractTextFromUploadedFile } from "@/lib/text-extraction";

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

  try {
    const text = await extractTextFromUploadedFile(file);
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "Unsupported format") {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload PDF, DOCX, or TXT." },
        { status: 422 }
      );
    }
    if (message === "PdfExtractionFailed") {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from this PDF. Please upload a text-based PDF, DOCX, or TXT, or paste the text manually.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Could not parse this file. Please try DOCX/TXT or paste text manually." },
      { status: 422 }
    );
  }
}
