"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Q = { id: string; category: string; question: string; insight: string | null };
type S = { title: string; desc: string };
type G = { title: string; mitigation: string };

export function SessionBriefClient({
  id,
  sessionTitle,
  company,
  score,
  roleSummary,
  strengths,
  gaps,
  questions,
  strongest,
  risk,
  usedFallback,
  limitations,
  evidenceSummary,
}: {
  id: string;
  sessionTitle: string;
  company: string;
  score: number;
  roleSummary: string;
  strengths: S[];
  gaps: G[];
  questions: Q[];
  strongest: string;
  risk: string;
  usedFallback: boolean;
  limitations: string;
  evidenceSummary: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"prep" | "questions">("prep");
  const [title, setTitle] = useState(sessionTitle);
  const [companyField, setCompanyField] = useState(company);
  const [matchScore, setMatchScore] = useState(String(score));
  const [summary, setSummary] = useState(roleSummary);
  const [align, setAlign] = useState(strongest);
  const [riskField, setRiskField] = useState(risk);
  const [strengthRows, setStrengthRows] = useState<S[]>(strengths.length ? strengths : [{ title: "", desc: "" }]);
  const [gapRows, setGapRows] = useState<G[]>(gaps.length ? gaps : [{ title: "", mitigation: "" }]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"idle" | "ok" | "err">("idle");

  useEffect(() => {
    if (saveMsg !== "ok") return;
    const t = window.setTimeout(() => setSaveMsg("idle"), 3200);
    return () => window.clearTimeout(t);
  }, [saveMsg]);

  const cleanedSummary = useMemo(
    () => summary.replace(/generated in fallback mode[\s\S]*/gi, "").trim() || "No summary yet.",
    [summary]
  );

  const saveBrief = useCallback(async () => {
    setSaving(true);
    setSaveMsg("idle");
    const ms = Math.min(100, Math.max(0, Math.round(Number(matchScore) || 0)));
    try {
      const res = await fetch(`/api/sessions/${id}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          company: companyField.trim() || null,
          matchScore: ms,
          roleSummary: summary.trim(),
          strongestAlignment: align.trim() || null,
          biggestRisk: riskField.trim() || null,
          strengths: strengthRows.filter((s) => s.title.trim() || s.desc.trim()),
          gaps: gapRows.filter((g) => g.title.trim() || g.mitigation.trim()),
        }),
      });
      if (!res.ok) {
        setSaveMsg("err");
        return;
      }
      setSaveMsg("ok");
      router.refresh();
    } catch {
      setSaveMsg("err");
    } finally {
      setSaving(false);
    }
  }, [
    id,
    title,
    companyField,
    matchScore,
    summary,
    align,
    riskField,
    strengthRows,
    gapRows,
    router,
  ]);

  return (
    <div id="view-brief" className="view">
      <div className="mobile-prep-view">
        <div className="mobile-prep-eyebrow">PRACTICE LAB</div>
        <h2 className="mobile-prep-title">Tailored Questions</h2>
        <p className="mobile-prep-sub">Review the most relevant prompts for this role and choose how you want to practice.</p>
        <div className="mobile-prep-tabs">
          <button type="button" className="mobile-prep-tab">
            Setup
          </button>
          <button type="button" className="mobile-prep-tab">
            Brief
          </button>
          <button type="button" className="mobile-prep-tab active">
            Prep Lab
          </button>
        </div>

        <div className="mobile-prep-card ai-transparency-card">
          <div className="mobile-card-label">AI-GENERATED BRIEF</div>
          <p className="mobile-card-copy" style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 10 }}>
            Built from your JD and resume. It can be wrong—edit the full brief on desktop or after we add a mobile editor.
            {usedFallback ? " This session used a fallback estimate (model unavailable or invalid response)." : ""}
          </p>
          {limitations ? (
            <p className="mobile-card-copy" style={{ fontSize: 12, marginBottom: 8 }}>
              <strong>Limits:</strong> {limitations}
            </p>
          ) : null}
          {evidenceSummary ? (
            <p className="mobile-card-copy" style={{ fontSize: 12 }}>
              <strong>Grounding:</strong> {evidenceSummary}
            </p>
          ) : null}
          <p className="mobile-card-copy" style={{ marginTop: 10 }}>
            {cleanedSummary}
          </p>
        </div>

        {questions.map((q, idx) => (
          <div key={`mobile-${q.id}`} className="mobile-prep-card">
            <div className="mobile-card-label">PRIORITY QUESTION</div>
            <div className="mobile-q-text">{q.question}</div>
            {q.insight ? (
              <div className="mobile-q-insight">
                <strong>Insight:</strong> {q.insight}
              </div>
            ) : null}
            {idx === 0 ? (
              <div className="mobile-q-actions">
                <Link href={`/sessions/${id}/practice`} className="mobile-btn-primary">
                  Practice
                </Link>
                <button type="button" className="mobile-btn-ghost">
                  Write draft
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="brief-main">
        <div className="ai-transparency-banner" role="region" aria-label="About this AI-generated brief">
          <div className="ai-transparency-title">AI-generated from your documents</div>
          <p className="ai-transparency-body">
            inro uses Google Gemini to read your job description and resume. It can misread files, miss nuance, or
            overstate fit. The match score is a <strong>prep heuristic</strong>, not a hiring verdict. Edit anything
            below so the brief matches what <em>you</em> believe is true.
          </p>
          {usedFallback ? (
            <p className="ai-transparency-warn">
              This brief used an automatic fallback (AI unavailable or unreadable response). Treat scores and bullets
              as rough guesses until you revise them.
            </p>
          ) : null}
          {limitations ? (
            <p className="ai-transparency-meta">
              <strong>Model caveats:</strong> {limitations}
            </p>
          ) : null}
          {evidenceSummary ? (
            <p className="ai-transparency-meta">
              <strong>What we grounded on:</strong> {evidenceSummary}
            </p>
          ) : null}
        </div>

        <div className="brief-eyebrow">Role Overview</div>
        <div className="brief-role-row brief-role-row--edit">
          <div className="brief-role-edit">
            <label className="brief-field-label" htmlFor="brief-title">
              Role title
            </label>
            <input id="brief-title" className="brief-field-input brief-field-input--title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="brief-field-label" htmlFor="brief-company">
              Company
            </label>
            <input
              id="brief-company"
              className="brief-field-input"
              value={companyField}
              onChange={(e) => setCompanyField(e.target.value)}
              placeholder="Company (optional)"
            />
          </div>
          <div className="score-box score-box--edit">
            <label className="brief-field-label" htmlFor="brief-score">
              Match (0–100)
            </label>
            <div className="score-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
              <input
                id="brief-score"
                className="brief-score-input"
                type="number"
                min={0}
                max={100}
                value={matchScore}
                onChange={(e) => setMatchScore(e.target.value)}
                aria-label="Role match score 0 to 100"
              />
              <span className="score-unit">%</span>
            </div>
            <div className="score-label">ROLE MATCH (EDITABLE)</div>
          </div>
        </div>

        <div className="brief-card brief-card--editable">
          <div className="brief-card-toolbar">
            <h3>Role Summary</h3>
            <button type="button" className="btn-terra brief-save-btn" onClick={() => void saveBrief()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
          {saveMsg === "ok" ? <p className="brief-save-hint ok">Saved — your brief is updated.</p> : null}
          {saveMsg === "err" ? <p className="brief-save-hint err">Could not save. Try again.</p> : null}
          <textarea className="brief-field-textarea" value={summary} onChange={(e) => setSummary(e.target.value)} rows={6} spellCheck />
          <div className="callout-grid" style={{ marginTop: 16 }}>
            <div className="callout-box callout-box--stack">
              <div className="callout-label">↗ Strongest Alignment</div>
              <textarea className="brief-field-textarea brief-field-textarea--sm" value={align} onChange={(e) => setAlign(e.target.value)} rows={3} />
            </div>
            <div className="callout-box callout-box--stack">
              <div className="callout-label">⚠ Biggest Risk Area</div>
              <textarea className="brief-field-textarea brief-field-textarea--sm" value={riskField} onChange={(e) => setRiskField(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        <div className="section-label">Top Strengths</div>
        {strengthRows.map((s, i) => (
          <div key={i} className="strength-item strength-item--edit">
            <div className="strength-icon">✓</div>
            <div className="brief-strength-grid">
              <input
                className="brief-field-input"
                value={s.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setStrengthRows((rows) => rows.map((row, j) => (j === i ? { ...row, title: v } : row)));
                }}
                placeholder="Strength title"
              />
              <textarea
                className="brief-field-textarea brief-field-textarea--sm"
                value={s.desc}
                onChange={(e) => {
                  const v = e.target.value;
                  setStrengthRows((rows) => rows.map((row, j) => (j === i ? { ...row, desc: v } : row)));
                }}
                placeholder="Description"
                rows={3}
              />
            </div>
          </div>
        ))}

        <div className="section-label" style={{ marginTop: 20 }}>
          Critical Gaps &amp; Mitigations
        </div>
        {gapRows.map((g, i) => (
          <div key={i} className="gap-item gap-item--edit">
            <div className="gap-icon">⚠</div>
            <div className="brief-gap-grid">
              <input
                className="brief-field-input"
                value={g.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setGapRows((rows) => rows.map((row, j) => (j === i ? { ...row, title: v } : row)));
                }}
                placeholder="Gap title"
              />
              <textarea
                className="brief-field-textarea brief-field-textarea--sm"
                value={g.mitigation}
                onChange={(e) => {
                  const v = e.target.value;
                  setGapRows((rows) => rows.map((row, j) => (j === i ? { ...row, mitigation: v } : row)));
                }}
                placeholder="Mitigation"
                rows={3}
              />
            </div>
          </div>
        ))}

        <div className="brief-bottom-save">
          <button type="button" className="btn-primary" onClick={() => void saveBrief()} disabled={saving}>
            {saving ? "Saving…" : "Save all edits"}
          </button>
        </div>
      </div>
      <div className="brief-sidebar">
        <div className="brief-tabs">
          <button type="button" className={`brief-tab${tab === "prep" ? " active" : ""}`} onClick={() => setTab("prep")}>
            Prep Lab
          </button>
          <button type="button" className={`brief-tab${tab === "questions" ? " active" : ""}`} onClick={() => setTab("questions")}>
            Recommended Questions
          </button>
        </div>
        {(tab === "questions" ? questions : questions.slice(0, 3)).map((q) => (
          <div key={q.id} className="q-mini">
            <div className="q-mini-tag">{q.category}</div>
            <div className="q-mini-text">{q.question}</div>
            {q.insight ? <div className="q-mini-insight">{q.insight}</div> : null}
            <div className="q-mini-actions">
              <Link href={`/sessions/${id}/practice`} className="q-mini-btn primary">
                Practice
              </Link>
              <Link href={`/sessions/${id}/evaluation`} className="q-mini-btn ghost">
                Evaluate
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
