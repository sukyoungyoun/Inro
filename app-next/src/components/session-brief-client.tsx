"use client";

import Link from "next/link";
import { useState } from "react";

type Q = { id: string; category: string; question: string; insight: string | null };
type S = { title: string; desc: string };
type G = { title: string; mitigation: string };

export function SessionBriefClient({
  id,
  score,
  roleSummary,
  strengths,
  gaps,
  questions,
  strongest,
  risk,
}: {
  id: string;
  score: number;
  roleSummary: string;
  strengths: S[];
  gaps: G[];
  questions: Q[];
  strongest: string;
  risk: string;
}) {
  const [tab, setTab] = useState<"prep" | "questions">("prep");
  const [showNotice, setShowNotice] = useState(roleSummary.toLowerCase().includes("fallback"));
  const cleanedSummary = roleSummary.replace(/generated in fallback mode[\s\S]*/gi, "").trim() || "No summary yet.";
  return (
    <div id="view-brief" className="view">
      <div className="mobile-prep-view">
        <div className="mobile-prep-eyebrow">PRACTICE LAB</div>
        <h2 className="mobile-prep-title">Tailored Questions</h2>
        <p className="mobile-prep-sub">Review the most relevant prompts for this role and choose how you want to practice.</p>
        <div className="mobile-prep-tabs">
          <button type="button" className="mobile-prep-tab">Setup</button>
          <button type="button" className="mobile-prep-tab">Brief</button>
          <button type="button" className="mobile-prep-tab active">Prep Lab</button>
        </div>

        <div className="mobile-prep-card">
          <div className="mobile-card-label">NEW USER INSIGHT</div>
          <div className="mobile-card-copy">
            {cleanedSummary || "Users respond best when interview prep feels collaborative instead of prescriptive."}
          </div>
        </div>

        {questions.map((q, idx) => (
          <div key={`mobile-${q.id}`} className="mobile-prep-card">
            <div className="mobile-card-label">PRIORITY QUESTION</div>
            <div className="mobile-q-text">{q.question}</div>
            {q.insight ? <div className="mobile-q-insight"><strong>Insight:</strong> {q.insight}</div> : null}
            {idx === 0 ? (
              <div className="mobile-q-actions">
                <Link href={`/sessions/${id}/practice`} className="mobile-btn-primary">Practice</Link>
                <button type="button" className="mobile-btn-ghost">Write draft</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="brief-main">
        <div className="brief-eyebrow">Role Overview</div>
        <div className="brief-role-row">
          <div className="brief-role-name">Role Brief</div>
          <div className="score-box">
            <div className="score-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
              {score}
              <span className="score-unit">%</span>
            </div>
            <div className="score-label">ROLE MATCH SCORE</div>
          </div>
        </div>
        {showNotice ? (
          <div className="limited-banner">
            Role summary generated with limited data. Add more context in your brief for better insights.
            <button type="button" className="btn-ghost" style={{ marginLeft: 8, padding: "4px 8px" }} onClick={() => setShowNotice(false)}>
              Dismiss
            </button>
          </div>
        ) : null}
        <div className="brief-card">
          <h3>Role Summary</h3>
          <p className="brief-summary-text">{cleanedSummary}</p>
          <div className="callout-grid">
            <div className="callout-box">
              <div className="callout-label">↗ Strongest Alignment</div>
              <div className="callout-text">{strongest || "—"}</div>
            </div>
            <div className="callout-box">
              <div className="callout-label">⚠ Biggest Risk Area</div>
              <div className="callout-text">{risk || "—"}</div>
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
              {g.title.toLowerCase().includes("specific") ? (
                <div className="gap-strategy">Quantify outcomes: add metrics to at least 2 bullets.</div>
              ) : null}
            </div>
          </div>
        ))}
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

