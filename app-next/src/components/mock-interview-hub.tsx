"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  groupQuestionsByCategory,
  mapDbQuestionsToMock,
  readMockProgress,
  type DbQuestionShape,
  type MockInterviewCategory,
  type MockInterviewQuestion,
} from "@/lib/mock-interview-questions";

function formatCategoryLabel(cat: MockInterviewCategory) {
  if (cat === "product_sense") return "PRODUCT SENSE";
  if (cat === "portfolio") return "PORTFOLIO";
  return "BEHAVIORAL";
}

function formatDifficultyLabel(d: MockInterviewQuestion["difficulty"]) {
  if (d === "hard") return "HARD";
  if (d === "easy") return "EASY";
  return "MEDIUM";
}

function WhyThisQuestionHub({ insight }: { insight: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mock-hub-why">
      <button type="button" className="mock-hub-why-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="mock-hub-why-arrow" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        Why this question
      </button>
      {open ? <div className="mock-hub-why-body">{insight}</div> : null}
    </div>
  );
}

type Props = {
  sessionId: string;
  roleTitle: string;
  roleCompany: string;
  questions: DbQuestionShape[];
};

export function MockInterviewHub({ sessionId, roleTitle, roleCompany, questions }: Props) {
  const [progress, setProgress] = useState<Record<string, "pending" | "done" | "skipped">>({});
  const [regenBusy, setRegenBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refreshProgress = useCallback(() => {
    setProgress(readMockProgress(sessionId));
  }, [sessionId]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  useEffect(() => {
    const onFocus = () => refreshProgress();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("inro-mock-progress-")) refreshProgress();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshProgress]);

  const mockRows = useMemo(() => mapDbQuestionsToMock(questions, progress), [questions, progress]);
  const groupedAll = useMemo(() => groupQuestionsByCategory(mockRows), [mockRows]);

  const fullByCat = useMemo(() => {
    const m = new Map<MockInterviewCategory, MockInterviewQuestion[]>();
    for (const q of mockRows) {
      if (!m.has(q.category)) m.set(q.category, []);
      m.get(q.category)!.push(q);
    }
    return m;
  }, [mockRows]);

  const total = mockRows.length;
  const doneCount = mockRows.filter((q) => q.status === "done").length;
  const globalPct = total ? Math.round((doneCount / total) * 100) : 0;

  const globalIndexById = useMemo(() => {
    const m = new Map<string, number>();
    questions.forEach((q, i) => m.set(q.id, i));
    return m;
  }, [questions]);

  async function onRegenerateCategory(category: MockInterviewCategory) {
    setRegenBusy(category);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/questions/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setToast(json.message || (res.ok ? "Request received." : json.error || "Could not regenerate."));
      window.setTimeout(() => setToast(null), 2500);
    } finally {
      setRegenBusy(null);
    }
  }

  function renderQuestionRow(q: MockInterviewQuestion) {
    const qIndex = globalIndexById.get(q.id) ?? 0;
    return (
      <li key={q.id} className="mock-hub-card">
        <div className="mock-hub-card-meta">
          <span className="mock-hub-diff">{formatDifficultyLabel(q.difficulty)}</span>
          <span className="mock-hub-duration">{q.duration}</span>
        </div>
        <p className="mock-hub-q-text">{q.text}</p>
        {q.tags.length > 0 ? (
          <div className="mock-hub-tag-row">
            {q.tags.map((tag) => (
              <span key={tag} className="mock-hub-meta-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mock-hub-actions">
          <Link href={`/sessions/${sessionId}/practice?q=${qIndex}`} className="mock-hub-btn-practice">
            Practice
          </Link>
          <Link
            href={`/sessions/${sessionId}/evaluation?q=${qIndex}&qid=${encodeURIComponent(q.id)}`}
            className="mock-hub-btn-evaluate"
          >
            Evaluate
          </Link>
        </div>
        {q.insight ? <WhyThisQuestionHub insight={q.insight} /> : null}
      </li>
    );
  }

  function renderCategoryHeader(category: MockInterviewCategory) {
    const catFull = fullByCat.get(category) || [];
    const catDone = catFull.filter((q) => q.status === "done").length;
    const catTotal = catFull.length;
    const catPct = catTotal ? Math.round((catDone / catTotal) * 100) : 0;
    return (
      <header className="mock-hub-cat-header">
        <div className="mock-hub-cat-header-main">
          <h2 className="mock-hub-cat-title">
            {formatCategoryLabel(category)}{" "}
            <span className="mock-hub-cat-count">
              ({catTotal}) · {catDone} / {catTotal} done
            </span>
          </h2>
          <div className="mock-hub-cat-track" aria-hidden>
            <div className="mock-hub-cat-fill" style={{ width: `${catPct}%` }} />
          </div>
        </div>
        <button
          type="button"
          className="mock-hub-cat-overflow"
          aria-label={`More actions for ${formatCategoryLabel(category)}`}
          disabled={Boolean(regenBusy)}
          onClick={() => void onRegenerateCategory(category)}
        >
          {regenBusy === category ? "…" : "⋯"}
        </button>
      </header>
    );
  }

  const showEmpty = questions.length === 0;

  return (
    <div id="view-mock-hub" className="view mock-interview-hub">
      {toast ? (
        <div className="inro-toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="mock-interview-hub-top">
        <Link href={`/sessions/${sessionId}`} className="back-btn">
          ← Back to role brief
        </Link>
      </div>

      <div className="mock-interview-hub-header-row">
        <div className="mock-interview-hub-header-main">
          <p className="mock-interview-hub-eyebrow">Tailored to your resume and job description</p>
          <h1 className="mock-interview-hub-title">Mock interview questions</h1>
          <p className="mock-interview-hub-role">
            {roleTitle}
            {roleCompany ? ` · ${roleCompany}` : ""}
          </p>
        </div>
        {!showEmpty ? (
          <Link href={`/sessions/${sessionId}/practice?q=0`} className="mock-hub-btn-practice mock-hub-start-full">
            Start full session
          </Link>
        ) : null}
      </div>

      {showEmpty ? (
        <div className="prep-empty-state" role="status">
          <div className="prep-empty-illustration" aria-hidden />
          <p className="prep-empty-title">No questions yet</p>
          <p className="prep-empty-copy">
            Open your role brief and finish analysis so we can generate questions for this prep session.
          </p>
          <Link href={`/sessions/${sessionId}`} className="btn-primary prep-empty-cta">
            Go to role brief
          </Link>
        </div>
      ) : (
        <>
          <div className="mock-hub-progress-block">
            <p className="mock-hub-hint">
              Pick any question to practice with the live recorder, or evaluate a written answer.
            </p>
            <div className="mock-hub-progress-meta-row">
              <span className="mock-hub-progress-count">
                {doneCount} / {total} done
              </span>
              <div className="mock-hub-global-track" aria-hidden>
                <div className="mock-hub-global-fill" style={{ width: `${globalPct}%` }} />
              </div>
            </div>
          </div>

          <div className="mock-interview-hub-list">
            {groupedAll.map(([category, catQuestions]) => (
              <section className="mock-hub-cat-section" key={category}>
                {renderCategoryHeader(category)}
                <ol className="mock-hub-q-list">{catQuestions.map((q) => renderQuestionRow(q))}</ol>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
