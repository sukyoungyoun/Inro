"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

function FileDropZone({
  filled,
  active,
  text,
  onPick,
  onDragActive,
  onFile,
}: {
  filled: boolean;
  active: boolean;
  text: string;
  onPick: () => void;
  onDragActive: (v: boolean) => void;
  onFile: (file: File) => void;
}) {
  return (
    <div
      className={`drop-zone${filled ? " filled" : ""}${active ? " drop-zone-active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) onDragActive(false);
      }}
      onDrop={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        onDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <div style={{ wordBreak: "break-word" }}>{text}</div>
    </div>
  );
}

export default function NewSessionPage() {
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [jd, setJd] = useState("");
  const [rv, setRv] = useState("");
  const [jdFileName, setJdFileName] = useState("");
  const [rvFileName, setRvFileName] = useState("");
  const [jdDrag, setJdDrag] = useState(false);
  const [rvDrag, setRvDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const jdRef = useRef<HTMLInputElement>(null);
  const rvRef = useRef<HTMLInputElement>(null);

  const hasJd = useMemo(() => jd.trim().length > 0, [jd]);
  const hasRv = useMemo(() => rv.trim().length > 0, [rv]);
  const ready = hasJd && hasRv;

  async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
    const pdfjsModule = await import("pdfjs-dist");
    const pdfjs = (pdfjsModule as unknown as { default?: unknown }).default
      ? (pdfjsModule as unknown as { default: typeof pdfjsModule }).default
      : pdfjsModule;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pages: string[] = [];
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const items: Array<{ str?: string }> = Array.isArray(content.items)
        ? (content.items as Array<{ str?: string }>)
        : (Array.from(content.items || []) as Array<{ str?: string }>);
      const text = items
        .map((item) => item.str || "")
        .join(" ")
        .trim();
      if (text) pages.push(text);
    }
    return pages.join("\n\n");
  }

  async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
    const mammothModule = await import("mammoth/mammoth.browser");
    const extractRawText =
      (mammothModule as unknown as { extractRawText?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> })
        .extractRawText ||
      (mammothModule as unknown as { default?: { extractRawText?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } })
        .default?.extractRawText;
    if (!extractRawText) {
      throw new Error("DOCX parser unavailable in this build. Please paste text manually.");
    }
    const result = await extractRawText({ arrayBuffer });
    return (result.value || "").trim();
  }

  async function ingestFile(
    file: File,
    setText: (s: string) => void,
    setName: (s: string) => void,
    label: "Job Description" | "Resume"
  ) {
    setName(file.name);
    setError("");

    try {
      const lower = file.name.toLowerCase();
      let text = "";

      if (file.type === "text/plain" || lower.endsWith(".txt")) {
        text = (await file.text()).trim();
      } else if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        text = await extractPdfText(await file.arrayBuffer());
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        lower.endsWith(".docx")
      ) {
        text = await extractDocxText(await file.arrayBuffer());
      } else {
        throw new Error("Unsupported file format. Please upload PDF, DOCX, or TXT.");
      }

      const cleaned = text.trim();
      if (!cleaned) {
        throw new Error(`Could not extract text from ${label} file. Please paste text manually.`);
      }
      setText(cleaned);
    } catch (e) {
      setText("");
      const message = e instanceof Error ? e.message : "Could not process file.";
      setError(message);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) {
      setError("Please paste both Job Description and Resume text to run analysis.");
      return;
    }
    setLoading(true);
    setError("");

    const normalizedJd = jd.trim();
    const normalizedRv = rv.trim();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, stage, jd: normalizedJd, rv: normalizedRv }),
      });

      let data: { id?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* keep default */
      }

      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Could not analyze this session.");
        return;
      }
      if (!data.id) {
        setError("Analysis finished but no session id was returned.");
        return;
      }
      router.push(`/sessions/${data.id}`);
    } catch {
      setLoading(false);
      setError("Network error while contacting analysis API. Please try again.");
    }
  }

  return (
    <AppShell
      crumb="SETUP"
      active="prep"
      userName="You"
      roleTitle="New Role"
      roleCompany={company.trim() || "Company"}
    >
      <div id="view-setup" className="view">
        <div className="breadcrumb">
          <Link href="/dashboard">Prep Sessions</Link>
          <span aria-hidden>{" > "}</span>
          <span className="breadcrumb-current">New Role</span>
        </div>
        <div className="setup-hero">
          <div className="setup-title">Consult with inro</div>
          <div className="setup-sub">
            Upload your documents or paste the text directly to generate a personalized interview brief.
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="upload-grid">
            <div className="upload-panel">
              <div className="upload-label">Target Job Description</div>
              <input
                ref={jdRef}
                type="file"
                id="file-jd"
                accept=".pdf,.docx,.txt"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void ingestFile(f, setJd, setJdFileName, "Job Description");
                  else setJdFileName("");
                }}
              />
              <FileDropZone
                filled={!!jdFileName}
                active={jdDrag}
                text={jdFileName || "Drag PDF/DOCX or click to upload"}
                onPick={() => jdRef.current?.click()}
                onDragActive={setJdDrag}
                onFile={(f) => void ingestFile(f, setJd, setJdFileName, "Job Description")}
              />
              <textarea
                className="ta"
                id="ta-jd"
                placeholder="…or paste text here"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="upload-panel">
              <div className="upload-label">Your Resume / Background</div>
              <input
                ref={rvRef}
                type="file"
                id="file-rv"
                accept=".pdf,.docx,.txt"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void ingestFile(f, setRv, setRvFileName, "Resume");
                  else setRvFileName("");
                }}
              />
              <FileDropZone
                filled={!!rvFileName}
                active={rvDrag}
                text={rvFileName || "Drag PDF/DOCX or click to upload"}
                onPick={() => rvRef.current?.click()}
                onDragActive={setRvDrag}
                onFile={(f) => void ingestFile(f, setRv, setRvFileName, "Resume")}
              />
              <textarea
                className="ta"
                id="ta-rv"
                placeholder="…or paste text here"
                value={rv}
                onChange={(e) => setRv(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="context-section">
            <div className="context-title">
              Additional Context <span className="context-optional">(Optional)</span>
            </div>
            <div className="context-grid">
              <div>
                <div className="field-label">Target Company Name</div>
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <div>
                <div className="field-label">Interview Stage</div>
                <select className="field-select" id="field-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="">Select stage…</option>
                  <option value="RECRUITER_SCREEN">Recruiter Screen</option>
                  <option value="HIRING_MANAGER">Hiring Manager</option>
                  <option value="PORTFOLIO_REVIEW">Portfolio Review</option>
                  <option value="FINAL_LOOP">Final Loop</option>
                </select>
              </div>
            </div>
          </div>

          {error ? <div className="error-msg">{error}</div> : null}

          <button className="btn-primary" id="analyze-btn" type="submit" disabled={!ready || loading}>
            {loading ? "Consulting inro…" : ready ? "Begin Analysis →" : "Awaiting Data…"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
