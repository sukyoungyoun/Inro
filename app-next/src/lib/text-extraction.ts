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

  // ── TXT ──────────────────────────────────────────────────────────────────
  if (file.type === "text/plain" || lower.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return (parsed.value || "").trim();
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    try {
      // Use pdfjs-dist legacy build — works reliably in Next.js serverless.
      // We must set the worker src to a no-op because there is no DOM/worker in Node.
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      // Disable the worker entirely for server-side use
      (pdfjsLib as { GlobalWorkerOptions?: { workerSrc: string } }).GlobalWorkerOptions!.workerSrc = "";

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableWorker: true,       // ← key flag: run in-thread, no worker
      } as unknown as Parameters<typeof pdfjsLib.getDocument>[0]);

      const doc = await loadingTask.promise;
      const chunks: string[] = [];

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const pageText = (content.items as Array<{ str?: string }>)
          .map((i) => i.str ?? "")
          .join(" ")
          .trim();
        if (pageText) chunks.push(pageText);
      }

      const merged = chunks.join("\n").trim();
      if (merged) return merged;
    } catch (err) {
      console.error("[text-extraction] pdfjs failed:", err);
    }

    throw new Error("PdfExtractionFailed");
  }

  throw new Error("Unsupported format");
}
