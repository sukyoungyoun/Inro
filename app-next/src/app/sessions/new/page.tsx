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
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [rvFile, setRvFile] = useState<File | null>(null);
  const [jdFileName, setJdFileName] = useState("");
  const [rvFileName, setRvFileName] = useState("");
  const [jdDrag, setJdDrag] = useState(false);
  const [rvDrag, setRvDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const jdRef = useRef<HTMLInputElement>(null);
  const rvRef = useRef<HTMLInputElement>(null);

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
      setError("Please paste both Job Description and Resume text to run analysis.");
      return;
    }
    setLoading(true);
    setError("");

    const normalizedJd =
      jd.trim() || (jdFileName ? `Uploaded Job Description file: ${jdFileName}` : "");
    const normalizedRv =
      rv.trim() || (rvFileName ? `Uploaded Resume file: ${rvFileName}` : "");

    try {
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

          <button className="btn-primary" id="analyze-btn" type="submit" disabled={!ready || loading}>
            {loading ? "Consulting inro…" : ready ? "Begin Analysis →" : "Awaiting Data…"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
