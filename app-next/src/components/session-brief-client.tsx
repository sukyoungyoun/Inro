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
  const [summary, setSummary] = useState(roleSummary);
  const [align, setAlign] = useState(strongest);
  const [riskField, setRiskField] = useState(risk);
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
    try {
      const res = await fetch(`/api/sessions/${id}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleSummary: summary.trim(),
          strongestAlignment: align.trim() || null,
          biggestRisk: riskField.trim() || null,
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
  }, [id, summary, align, riskField, router]);

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

        <div className="mobile-prep-card">
          <div className="mobile-card-label">ROLE SUMMARY</div>
          <p className="mobile-card-copy">{cleanedSummary}</p>
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

        <div className="ai-transparency-footer" role="note">
          <div className="ai-transparency-title ai-transparency-title--compact">AI from your documents</div>
          <p className="ai-transparency-body ai-transparency-body--compact">
            Gemini may misread text. Match % is a prep hint only. Edit summary &amp; alignment on wider screens.
          </p>
          {usedFallback ? <p className="ai-transparency-warn ai-transparency-warn--compact">Fallback run—rough estimate.</p> : null}
        </div>
      </div>

      <div className="brief-main">
        <div className="brief-eyebrow">Role Overview</div>
        <div className="brief-role-row">
          <div>
            <div className="brief-role-name">{sessionTitle || "Role Brief"}</div>
            {company ? <div className="brief-meta">{company}</div> : null}
          </div>
          <div className="score-box">
            <div className="score-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
              {score}
              <span className="score-unit">%</span>
            </div>
            <div className="score-label">ROLE MATCH SCORE</div>
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
        {strengths.map((s, i) => (
          <div key={i} className="strength-item">
            <div className="strength-icon">✓</div>
            <div>
              <div className="strength-title">{s.title}</div>
              <div className="strength-desc">{s.desc}</div>
            </div>
          </div>
        ))}

        <div className="section-label" style={{ marginTop: 20 }}>
          Critical Gaps &amp; Mitigations
        </div>
        {gaps.map((g, i) => (
          <div key={i} className="gap-item">
            <div className="gap-icon">⚠</div>
            <div>
              <div className="gap-title">{g.title}</div>
              <div className="gap-strategy">{g.mitigation}</div>
            </div>
          </div>
        ))}

        <div className="ai-transparency-banner ai-transparency-banner--footer" role="note" aria-label="AI disclaimer">
          <div className="ai-transparency-title ai-transparency-title--compact">AI-generated from your documents</div>
          <p className="ai-transparency-body ai-transparency-body--compact">
            Gemini read your JD and resume—mistakes happen. Match % is a prep heuristic, not hiring advice. Edit the
            summary and alignment notes above if they look off.
          </p>
          {usedFallback ? (
            <p className="ai-transparency-warn ai-transparency-warn--compact">Fallback analysis—treat scores as rough.</p>
          ) : null}
          {limitations ? (
            <p className="ai-transparency-meta ai-transparency-meta--clamp" title={limitations}>
              <strong>Caveats:</strong> {limitations}
            </p>
          ) : null}
          {evidenceSummary ? (
            <p className="ai-transparency-meta ai-transparency-meta--clamp" title={evidenceSummary}>
              <strong>Grounding:</strong> {evidenceSummary}
            </p>
          ) : null}
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
