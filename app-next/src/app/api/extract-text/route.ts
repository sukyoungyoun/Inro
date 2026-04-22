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
    const message = err instanceof Error ? err.message : "";
    return NextResponse.json(
      {
        error:
          message === "Unsupported format"
            ? "Unsupported file format. Please upload PDF, DOCX, or TXT."
            : message === "PdfExtractionFailed"
              ? "We could not read text from this PDF (it may be scanned/image-based). Please upload DOCX/TXT or paste text."
              : "Could not extract text from the uploaded file. Please paste text manually.",
      },
      { status: message === "Unsupported format" ? 400 : 422 }
    );
  }
}

