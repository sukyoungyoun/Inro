export function extractedTextLooksUsable(text: string) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  const words = cleaned.split(" ").filter(Boolean);
  const alphaChars = cleaned.replace(/[^A-Za-z]/g, "").length;
  const ratio = alphaChars / Math.max(1, cleaned.length);
  return cleaned.length >= 120 && words.length >= 18 && ratio >= 0.35;
}

async function extractPdfViaGemini(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const base64Data = buffer.toString("base64");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: "application/pdf", data: base64Data } }, { text: "Extract all text from this document. Return only the raw extracted text with no commentary, formatting, or markdown. Preserve paragraph breaks with newlines." }] }],
        generationConfig: { temperature: 0 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini PDF extraction failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("PdfExtractionFailed");
  return text;
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
    return await extractPdfViaGemini(buffer);
  }
  throw new Error("Unsupported format");
}
