"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PrepLabMockInterviews } from "@/components/prep-lab-mock-interviews";

type Q = { id: string; category: string; question: string; insight: string | null };
type S = { title: string; desc: string };
type G = { title: string; mitigation: string };

const MATCH_SCORE_HELP =
  "Match % compares your resume to the job description (skills, scope, and language). It is a practice hint only—not hiring advice or a prediction of outcomes.";

function formatCategoryLabel(raw: string) {
  const t = (raw || "").trim();
  if (!t) return "QUESTIONS";
  return t.toUpperCase();
}

function WhyThisQuestion({ insight }: { insight: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="q-why-accordion">
      <button type="button" className="q-why-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="q-why-chevron" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        Why this question
      </button>
      {open ? <div className="q-why-body">{insight}</div> : null}
    </div>
  );
}

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
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const [summary, setSummary] = useState(roleSummary);
  const [align, setAlign] = useState(strongest);
  const [riskField, setRiskField] = useState(risk);
  const [briefEditMode, setBriefEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"idle" | "ok" | "err">("idle");

  useEffect(() => {
    if (briefEditMode) return;
    setSummary(roleSummary);
    setAlign(strongest);
    setRiskField(risk);
  }, [roleSummary, strongest, risk, briefEditMode]);

  useEffect(() => {
    if (saveMsg !== "ok") return;
    const t = window.setTimeout(() => setSaveMsg("idle"), 3200);
    return () => window.clearTimeout(t);
  }, [saveMsg]);

  const cleanedSummary = useMemo(
    () => summary.replace(/generated in fallback mode[\s\S]*/gi, "").trim() || "No summary yet.",
    [summary]
  );

  const visibleQuestions = useMemo(() => {
    if (tab === "questions") return questions;
    return questions.slice(0, 3);
  }, [tab, questions]);

  const briefDirty = useMemo(() => {
    const s = summary.trim();
    const a = align.trim();
    const r = riskField.trim();
    const s0 = (roleSummary || "").trim();
    const a0 = (strongest || "").trim();
    const r0 = (risk || "").trim();
    return s !== s0 || a !== a0 || r !== r0;
  }, [summary, align, riskField, roleSummary, strongest, risk]);

  const cancelBriefEdit = useCallback(() => {
    setSummary(roleSummary);
    setAlign(strongest);
    setRiskField(risk);
    setBriefEditMode(false);
    setSaveMsg("idle");
  }, [roleSummary, strongest, risk]);

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
      setBriefEditMode(false);
      router.refresh();
    } catch {
      setSaveMsg("err");
    } finally {
      setSaving(false);
    }
  }, [id, summary, align, riskField, router]);

  return (
    <div id="view-brief" className="view">
      <div className="mobile-prep-view" aria-label="Mobile prep overview">
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
          <div className="mobile-card-label">ROLE</div>
          <p className="mobile-prep-role-title">{sessionTitle || "Role Brief"}</p>
          {company ? <p className="mobile-prep-role-co">{company}</p> : null}
          <p className="mobile-match-pill" title={MATCH_SCORE_HELP}>
            {score}% match
          </p>
          <p className="mobile-match-hint">Based on resume vs. JD alignment.</p>
        </div>

        <div className="mobile-prep-card">
          <div className="mobile-card-label">ROLE SUMMARY</div>
          <p className="mobile-card-copy">{cleanedSummary}</p>
        </div>

        {questions.map((q, qi) => (
          <div key={`mobile-${q.id}`} className="mobile-prep-card">
            <div className="mobile-prep-cat">{formatCategoryLabel(q.category)}</div>
            <div className="mobile-q-text">{q.question}</div>
            <div className="mobile-q-actions mobile-q-actions--stack">
              <Link
                href={`/sessions/${id}/practice?q=${qi}`}
                className="mobile-btn-primary mobile-btn-practice"
                title="Practice this question only"
              >
                Practice
              </Link>
              <Link href={`/sessions/${id}/evaluation?q=${qi}&qid=${encodeURIComponent(q.id)}`} className="mobile-btn-ghost">
                Evaluate
              </Link>
            </div>
            {q.insight ? <WhyThisQuestion insight={q.insight} /> : null}
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

      <div className="brief-main" role="region" aria-label="Role overview and coaching notes">
        <div className="brief-eyebrow">Role Overview</div>
        <div className="brief-role-head">
          <h2 className="brief-role-name">{sessionTitle || "Role Brief"}</h2>
          {company ? <div className="brief-meta brief-meta--tight">{company}</div> : null}
          <div className="brief-match-row">
            <span className="brief-match-pill" title={MATCH_SCORE_HELP}>
              {score}% match
            </span>
            <span className="brief-match-hint" role="note">
              Based on resume vs. JD alignment.
            </span>
          </div>
        </div>

        <div className="brief-card brief-card--editable">
          <div className="brief-card-toolbar">
            <h3>Role Summary</h3>
            <div className="brief-card-toolbar-actions">
              {!briefEditMode ? (
                <button type="button" className="btn-ghost brief-edit-btn" onClick={() => setBriefEditMode(true)}>
                  Edit
                </button>
              ) : (
                <>
                  <button type="button" className="btn-ghost brief-edit-btn" onClick={cancelBriefEdit} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-terra brief-save-btn"
                    onClick={() => void saveBrief()}
                    disabled={saving || !briefDirty}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </>
              )}
            </div>
          </div>
          {saveMsg === "ok" ? <p className="brief-save-hint ok">Saved — your brief is updated.</p> : null}
          {saveMsg === "err" ? <p className="brief-save-hint err">Could not save. Try again.</p> : null}
          {!briefEditMode ? (
            <>
              <div className="brief-summary-readonly">{cleanedSummary}</div>
              <div className="callout-grid" style={{ marginTop: 16 }}>
                <div className="callout-box callout-box--stack">
                  <div className="callout-label">↗ Strongest Alignment</div>
                  <div className="brief-callout-readonly">{align.trim() ? align : "—"}</div>
                </div>
                <div className="callout-box callout-box--stack">
                  <div className="callout-label">⚠ Biggest Risk Area</div>
                  <div className="brief-callout-readonly">{riskField.trim() ? riskField : "—"}</div>
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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

      <PrepLabMockInterviews
        sessionId={id}
        questions={questions}
        tab={tab}
        setTab={setTab}
        questionsExpanded={questionsExpanded}
        setQuestionsExpanded={setQuestionsExpanded}
        visibleQuestions={visibleQuestions}
      />
    </div>
  );
}
