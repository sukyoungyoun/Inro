"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  const arc = useMemo(() => {
    const pct = Math.max(0, Math.min(100, score));
    const c = 2 * Math.PI * 28;
    return { c, offset: c * (1 - pct / 100) };
  }, [score]);
  const categoryTone = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("behavior")) return "var(--color-accent)";
    if (c.includes("system")) return "#5a4a7a";
    if (c.includes("product")) return "var(--color-accent-green)";
    return "var(--color-text-label)";
  };

  return (
    <div id="view-brief" className="view">
      <div className="brief-main">
        <div className="brief-eyebrow">Role Overview</div>
        <div className="brief-role-row">
          <div className="brief-role-name">Role Brief</div>
          <div className="gauge-wrap">
            <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden className="score-ring">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle
                cx="36"
                cy="36"
                r="28"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={arc.c}
                strokeDashoffset={arc.offset}
                transform="rotate(-90 36 36)"
              />
              <text x="36" y="40" textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 16, fill: "var(--color-text-primary)" }}>
                {score}
              </text>
            </svg>
            <div className="gauge-label">ROLE MATCH SCORE</div>
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
            <div className="q-mini-tag" style={{ color: categoryTone(q.category) }}>
              <span className="q-mini-dot" style={{ background: categoryTone(q.category) }} />
              {q.category}
            </div>
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

