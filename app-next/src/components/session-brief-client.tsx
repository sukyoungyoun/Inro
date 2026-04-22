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
  const [aiDisclosureOpen, setAiDisclosureOpen] = useState(false);

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

      <div className="brief-split">
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

          <div className="brief-ai-disclosure">
            <button
              type="button"
              className="brief-ai-disclosure-toggle"
              onClick={() => setAiDisclosureOpen((o) => !o)}
              aria-expanded={aiDisclosureOpen}
            >
              ⓘ How this was generated
            </button>
            {aiDisclosureOpen ? (
              <div className="brief-ai-disclosure-panel" role="region">
                <p className="brief-ai-disclosure-lead">
                  Gemini read your JD and resume—mistakes happen. Match % is a prep heuristic, not hiring advice. Edit the
                  summary and alignment notes if they look off.
                </p>
                {usedFallback ? <p className="brief-ai-disclosure-warn">Fallback analysis—treat scores as rough.</p> : null}
                {limitations ? (
                  <p className="brief-ai-disclosure-meta" title={limitations}>
                    <strong>Caveats:</strong> {limitations}
                  </p>
                ) : null}
                {evidenceSummary ? (
                  <p className="brief-ai-disclosure-meta" title={evidenceSummary}>
                    <strong>Grounding:</strong> {evidenceSummary}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <p className="brief-skip-to-prep">
          <a href="#prep-lab-panel" className="brief-skip-to-prep-link">
            Skip to Prep Lab
          </a>
          <span className="brief-skip-to-prep-hint"> — tailored questions &amp; practice</span>
        </p>

        <section className="brief-summary-plain" aria-labelledby="brief-summary-heading">
          <div className="brief-summary-plain-head">
            <h3 id="brief-summary-heading" className="brief-summary-plain-label">
              Role summary
            </h3>
            {!briefEditMode ? (
              <button type="button" className="brief-summary-plain-edit" onClick={() => setBriefEditMode(true)}>
                Edit
              </button>
            ) : (
              <div className="brief-summary-plain-edit-row">
                <button type="button" className="brief-summary-plain-edit" onClick={cancelBriefEdit} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="brief-summary-plain-save"
                  onClick={() => void saveBrief()}
                  disabled={saving || !briefDirty}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>
          {saveMsg === "ok" ? <p className="brief-save-hint ok">Saved — your brief is updated.</p> : null}
          {saveMsg === "err" ? <p className="brief-save-hint err">Could not save. Try again.</p> : null}
          {!briefEditMode ? (
            <div className="brief-summary-plain-body">{cleanedSummary}</div>
          ) : (
            <textarea className="brief-summary-plain-textarea" value={summary} onChange={(e) => setSummary(e.target.value)} rows={6} spellCheck />
          )}
        </section>

        <section className="brief-insights" aria-labelledby="brief-insights-heading">
          <h3 id="brief-insights-heading" className="brief-insights-label">
            Insights
          </h3>
          <div className="brief-insights-grid">
            {!briefEditMode ? (
              <>
                <div className="brief-insight-tile brief-insight-tile--align">
                  <div className="brief-insight-tile-label">↗ Strongest alignment</div>
                  <div className="brief-insight-tile-body">{align.trim() ? align : "—"}</div>
                </div>
                <div className="brief-insight-tile brief-insight-tile--risk">
                  <div className="brief-insight-tile-label">⚠ Biggest risk area</div>
                  <div className="brief-insight-tile-body">{riskField.trim() ? riskField : "—"}</div>
                </div>
              </>
            ) : (
              <>
                <div className="brief-insight-tile brief-insight-tile--align">
                  <div className="brief-insight-tile-label">↗ Strongest alignment</div>
                  <textarea className="brief-field-textarea brief-field-textarea--sm" value={align} onChange={(e) => setAlign(e.target.value)} rows={3} />
                </div>
                <div className="brief-insight-tile brief-insight-tile--risk">
                  <div className="brief-insight-tile-label">⚠ Biggest risk area</div>
                  <textarea className="brief-field-textarea brief-field-textarea--sm" value={riskField} onChange={(e) => setRiskField(e.target.value)} rows={3} />
                </div>
              </>
            )}
          </div>
        </section>

        <h3 className="brief-list-section-label">Top strengths</h3>
        <ul className="brief-strength-list">
          {strengths.map((s, i) => (
            <li key={i} className="brief-strength-row">
              <div className="brief-strength-ico" aria-hidden>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4.2 3.5 6.5 9 1.2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="brief-strength-copy">
                <div className="brief-strength-title">{s.title}</div>
                <div className="brief-strength-body">{s.desc}</div>
              </div>
            </li>
          ))}
        </ul>

        <h3 className="brief-list-section-label brief-list-section-label--gaps">Critical gaps &amp; mitigations</h3>
        <ul className="brief-gap-list">
          {gaps.map((g, i) => (
            <li key={i} className="brief-gap-row">
              <div className="brief-gap-ico" aria-hidden>
                <svg width="10" height="9" viewBox="0 0 10 9" fill="none">
                  <path d="M5 1.2 8.8 7.5H1.2L5 1.2Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="brief-gap-copy">
                <div className="brief-gap-title">{g.title}</div>
                <div className="brief-gap-body">{g.mitigation}</div>
              </div>
            </li>
          ))}
        </ul>
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
    </div>
  );
}
