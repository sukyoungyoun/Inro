"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default function NewSessionPage() {
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [jd, setJd] = useState("");
  const [rv, setRv] = useState("");
  const [jdFileName, setJdFileName] = useState("");
  const [rvFileName, setRvFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const ready = useMemo(() => jd.trim().length > 0 && rv.trim().length > 0, [jd, rv]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, stage, jd, rv }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not analyze this session.");
      return;
    }
    router.push(`/sessions/${data.id}`);
  }

  return (
    <AppShell
      crumb="SETUP"
      active="prep"
      userName="You"
      roleTitle="New Role"
      roleCompany={company || "Company"}
    >
      <div id="view-setup" className="view">
        <div className="breadcrumb">
          <Link href="/dashboard">Prep Sessions</Link> › New Role
        </div>
        <div className="setup-title">Consult with inro</div>
        <div className="setup-sub">
          Upload your documents or paste the text directly to generate a personalized interview brief.
        </div>

        <form onSubmit={onSubmit}>
          <div className="upload-grid">
            <div className="upload-panel">
              <div className="upload-label">Target Job Description</div>
              <label
                className={`drop-zone${jdFileName ? " filled" : ""}`}
                htmlFor="file-jd"
              >
                <div>{jdFileName || "Drag PDF/DOCX or click to upload"}</div>
                <input
                  type="file"
                  id="file-jd"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setJdFileName(f ? f.name : "");
                  }}
                />
              </label>
              <textarea
                className="ta"
                placeholder="…or paste text here"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>
            <div className="upload-panel">
              <div className="upload-label">Your Resume / Background</div>
              <label
                className={`drop-zone${rvFileName ? " filled" : ""}`}
                htmlFor="file-rv"
              >
                <div>{rvFileName || "Drag PDF/DOCX or click to upload"}</div>
                <input
                  type="file"
                  id="file-rv"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setRvFileName(f ? f.name : "");
                  }}
                />
              </label>
              <textarea
                className="ta"
                placeholder="…or paste text here"
                value={rv}
                onChange={(e) => setRv(e.target.value)}
              />
            </div>
          </div>

          <div className="context-section">
            <div className="context-title">
              Additional Context{" "}
              <span style={{ fontSize: 13, color: "var(--ink3)", fontFamily: "var(--ui)", fontWeight: 400 }}>
                (Optional)
              </span>
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
                />
              </div>
              <div>
                <div className="field-label">Interview Stage</div>
                <select className="field-select" value={stage} onChange={(e) => setStage(e.target.value)}>
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

          <button className="btn-primary" type="submit" disabled={!ready || loading}>
            {loading ? "Consulting…" : ready ? "Begin Analysis →" : "Awaiting Data…"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
