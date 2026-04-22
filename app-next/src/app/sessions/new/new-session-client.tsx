"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

const ANALYSIS_PIPELINE = [
  { id: "send", label: "Sending your documents" },
  { id: "jd", label: "Extracting job description text" },
  { id: "resume", label: "Extracting resume text" },
  { id: "ai", label: "Running AI fit analysis" },
  { id: "save", label: "Saving your role brief" },
] as const;

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

export function NewSessionClient({ sidebarUserName }: { sidebarUserName: string }) {
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [jd, setJd] = useState("");
  const [rv, setRv] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [rvFile, setRvFile] = useState<File | null>(null);
  const [jdFileName, setJdFileName] = useState("");
  const [rvFileName, setRvFileName] = useState("");
  const [jdDrag, setJdDrag] = useState(false);
  const [rvDrag, setRvDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  const jdRef = useRef<HTMLInputElement>(null);
  const rvRef = useRef<HTMLInputElement>(null);

  function normalizeErrorMessage(raw: string) {
    const text = (raw || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    const pieces = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const unique: string[] = [];
    for (const part of pieces) {
      if (!unique.includes(part)) unique.push(part);
    }
    return unique.join(" ");
  }

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setLoadStep((s) => Math.min(s + 1, ANALYSIS_PIPELINE.length - 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, [loading]);

  const hasJd = useMemo(() => jd.trim().length > 0 || !!jdFile, [jd, jdFile]);
  const hasRv = useMemo(() => rv.trim().length > 0 || !!rvFile, [rv, rvFile]);
  const ready = hasJd && hasRv;

  async function ingestFile(
    file: File,
    setFile: (f: File | null) => void,
    setName: (s: string) => void,
    label: "Job Description" | "Resume",
    clearText: () => void
  ) {
    setFile(file);
    setName(file.name);
    setError("");
    // Server-side extraction happens on submit to avoid client runtime parser issues.
    clearText();
    if (!file.name.toLowerCase().match(/\.(pdf|docx|txt)$/)) {
      setError(`Unsupported ${label} format. Please upload PDF, DOCX, or TXT.`);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) {
      setError("Add a job description and resume—paste text, upload files, or both for each.");
      return;
    }
    setError("");

    try {
      async function extractViaApi(file: File, label: "job description" | "resume") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/extract-text", { method: "POST", body: fd });
        let payload: { text?: string; error?: string } = {};
        try {
          payload = (await res.json()) as { text?: string; error?: string };
        } catch {
          /* noop */
        }
        if (!res.ok || !payload.text?.trim()) {
          const reason = normalizeErrorMessage(payload.error || `${res.status} ${res.statusText}`.trim());
          return {
            text: "",
            warning: reason || `Could not read the uploaded ${label}.`,
          };
        }
        return { text: payload.text.trim(), warning: "" };
      }

      let normalizedJd = jd.trim();
      let normalizedRv = rv.trim();
      const warnings: string[] = [];

      if (!normalizedJd && jdFile) {
        const parsed = await extractViaApi(jdFile, "job description");
        normalizedJd = parsed.text;
        if (parsed.warning) {
          warnings.push(
            normalizeErrorMessage(
              `We couldn't read your uploaded job description (${jdFile.name}). ${parsed.warning} Analysis will proceed with low-confidence file context.`
            )
          );
          normalizedJd = `Uploaded JD filename: ${jdFile.name}. Full text extraction failed; infer role context conservatively and highlight uncertainty.`;
        }
      }
      if (!normalizedRv && rvFile) {
        const parsed = await extractViaApi(rvFile, "resume");
        normalizedRv = parsed.text;
        if (parsed.warning) {
          warnings.push(
            normalizeErrorMessage(
              `We couldn't read your uploaded resume (${rvFile.name}). ${parsed.warning} Analysis will proceed with low-confidence file context.`
            )
          );
          normalizedRv = `Uploaded resume filename: ${rvFile.name}. Full text extraction failed; analysis should proceed conservatively and call out uncertainty.`;
        }
      }

      if (!normalizedJd || !normalizedRv) {
        setError(
          "We still need both JD and resume text. Paste missing text manually, or upload a more readable file."
        );
        return;
      }

      if (warnings.length > 0) {
        setError(normalizeErrorMessage(warnings.join(" ")));
      }

      setLoading(true);
      setLoadStep(0);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          stage,
          jd: normalizedJd,
          rv: normalizedRv,
        }),
      });

      let data: { id?: string; error?: string } = {};
      let rawText = "";
      try {
        rawText = await res.text();
        data = rawText ? (JSON.parse(rawText) as { id?: string; error?: string }) : {};
      } catch {
        /* keep defaults */
      }

      setLoadStep(ANALYSIS_PIPELINE.length - 1);
      setLoading(false);
      if (!res.ok) {
        const explicit =
          data.error ||
          rawText ||
          `${res.status} ${res.statusText}`.trim() ||
          "Could not analyze this session.";
        setError(explicit);
        return;
      }
      if (!data.id) {
        setError("Analysis finished but no session id was returned.");
        return;
      }
      router.push(`/sessions/${data.id}`);
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message.trim() : "";
      setError(message || "Network error while contacting analysis API. Please try again.");
    }
  }

  return (
    <AppShell
      crumb="SETUP"
      active="prep"
      userName={sidebarUserName}
      roleTitle="New Role"
      roleCompany={company.trim() || "Company"}
      prepHref="/sessions/new"
      briefHref="/sessions/new"
      mockInterviewHref="/sessions/new"
      mobileTab="role"
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
            Upload your documents or paste the text directly. Analysis uses AI (Gemini)—it can misread files or miss
            nuance. You will be able to edit the brief after it is generated.
          </div>
        </div>

        <form onSubmit={onSubmit} aria-busy={loading}>
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
                  if (f) void ingestFile(f, setJdFile, setJdFileName, "Job Description", () => setJd(""));
                  else {
                    setJdFileName("");
                    setJdFile(null);
                  }
                }}
              />
              <FileDropZone
                filled={!!jdFileName}
                active={jdDrag}
                text={jdFileName || "Drag PDF/DOCX or click to upload"}
                onPick={() => jdRef.current?.click()}
                onDragActive={setJdDrag}
                onFile={(f) => void ingestFile(f, setJdFile, setJdFileName, "Job Description", () => setJd(""))}
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
                  if (f) void ingestFile(f, setRvFile, setRvFileName, "Resume", () => setRv(""));
                  else {
                    setRvFileName("");
                    setRvFile(null);
                  }
                }}
              />
              <FileDropZone
                filled={!!rvFileName}
                active={rvDrag}
                text={rvFileName || "Drag PDF/DOCX or click to upload"}
                onPick={() => rvRef.current?.click()}
                onDragActive={setRvDrag}
                onFile={(f) => void ingestFile(f, setRvFile, setRvFileName, "Resume", () => setRv(""))}
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

          <div className="analyze-actions">
            <button className="btn-primary" id="analyze-btn" type="submit" disabled={!ready || loading}>
              {loading ? "Analyzing…" : ready ? "Begin Analysis →" : "Awaiting Data…"}
            </button>
            {loading ? (
              <span className="analyze-spinner" aria-hidden>
                <span className="analyze-spinner-dot" />
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="analysis-progress" role="status" aria-live="polite" aria-label="Analysis progress">
              <p className="analysis-progress-note">
                Typical steps inro runs (timing is approximate while the server works):
              </p>
              <div className="analysis-pills">
                {ANALYSIS_PIPELINE.map((step, i) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`analysis-pill${i < loadStep ? " done" : ""}${i === loadStep ? " active" : ""}`}
                    tabIndex={-1}
                  >
                    <span className="analysis-pill-index" aria-hidden>
                      {i < loadStep ? "✓" : i + 1}
                    </span>
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </AppShell>
  );
}
