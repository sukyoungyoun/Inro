export function extractedTextLooksUsable(text: string) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  const words = cleaned.split(" ").filter(Boolean);
  const alphaChars = cleaned.replace(/[^A-Za-z]/g, "").length;
  const ratio = alphaChars / Math.max(1, cleaned.length);
  return cleaned.length >= 120 && words.length >= 18 && ratio >= 0.35;
}

export async function extractTextFromUploadedFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === "text/plain" || lower.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return (parsed.value || "").trim();
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
      // fallback parser below
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
      // handled below
    }

    throw new Error("PdfExtractionFailed");
  }

  throw new Error("Unsupported format");
}

