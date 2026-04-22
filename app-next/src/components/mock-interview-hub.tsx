"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  if (d === "hard") return "Hard";
  if (d === "easy") return "Easy";
  return "Medium";
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

function QuestionStatusIcon({ status }: { status: MockInterviewQuestion["status"] }) {
  if (status === "done") {
    return (
      <span className="q-status-wrap q-status-wrap--done" aria-label="Completed">
        <svg className="q-status-svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M2.5 7.2 5.2 10 11.5 3.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="q-status-wrap q-status-wrap--pending" aria-label="Not completed">
      <svg className="q-status-svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </span>
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
      <li key={q.id} className="q-mini prep-mock-row">
        <div className="prep-mock-row-head">
          <QuestionStatusIcon status={q.status} />
          <div className="q-difficulty" aria-hidden>
            {formatDifficultyLabel(q.difficulty)}
          </div>
          <span className="q-duration">{q.duration}</span>
        </div>
        <div className="q-mini-text">{q.text}</div>
        <div className="q-tag-row">
          {q.tags.map((tag) => (
            <span key={tag} className="q-meta-tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="q-mini-actions q-mini-actions--stack">
          <Link
            href={`/sessions/${sessionId}/practice?q=${qIndex}`}
            className="q-mini-btn primary q-mini-btn--practice"
            title="Practice this question"
          >
            Practice
          </Link>
          <Link
            href={`/sessions/${sessionId}/evaluation?q=${qIndex}&qid=${encodeURIComponent(q.id)}`}
            className="q-mini-btn ghost q-mini-btn--evaluate"
          >
            Evaluate
          </Link>
        </div>
        {q.insight ? <WhyThisQuestion insight={q.insight} /> : null}
      </li>
    );
  }

  function renderCategoryHeader(category: MockInterviewCategory) {
    const catFull = fullByCat.get(category) || [];
    const catDone = catFull.filter((q) => q.status === "done").length;
    const catTotal = catFull.length;
    const catPct = catTotal ? Math.round((catDone / catTotal) * 100) : 0;
    return (
      <div className="prep-category-block">
        <div className="prep-category-header-row">
          <h4 className="prep-category-heading">
            {formatCategoryLabel(category)}{" "}
            <span className="prep-category-count">
              ({catTotal}) · {catDone} / {catTotal} done
            </span>
          </h4>
          <button
            type="button"
            className="prep-category-overflow"
            aria-label={`More actions for ${formatCategoryLabel(category)}`}
            disabled={Boolean(regenBusy)}
            onClick={() => void onRegenerateCategory(category)}
          >
            {regenBusy === category ? "…" : "⋯"}
          </button>
        </div>
        <div className="prep-cat-progress-track" aria-hidden>
          <div className="prep-cat-progress-fill" style={{ width: `${catPct}%` }} />
        </div>
      </div>
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

      <div className="mock-interview-hub-header">
        <p className="mock-interview-hub-eyebrow">Tailored to your resume and job description</p>
        <h1 className="mock-interview-hub-title">Mock interview questions</h1>
        <p className="mock-interview-hub-role">
          {roleTitle}
          {roleCompany ? ` · ${roleCompany}` : ""}
        </p>
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
          <div className="prep-lab-start-block mock-interview-hub-progress">
            <p className="prep-start-full-hint">
              Pick any question to practice with the live recorder, or evaluate a written answer.
            </p>
            <div className="prep-global-progress" aria-label="Overall mock interview progress">
              <div className="prep-progress-meta">
                {doneCount} / {total} done
              </div>
              <div className="prep-progress-track">
                <div className="prep-progress-fill" style={{ width: `${globalPct}%` }} />
              </div>
            </div>
          </div>

          <div className="brief-prep-lab-body mock-interview-hub-list">
            {groupedAll.map(([category, catQuestions]) => (
              <Fragment key={category}>
                {renderCategoryHeader(category)}
                <ol className="prep-mock-question-list">
                  {catQuestions.map((q) => renderQuestionRow(q))}
                </ol>
              </Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
