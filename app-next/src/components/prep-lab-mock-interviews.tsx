"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { shouldShowDifficultyTags } from "@/lib/prep-question-display";
import {
  consumeBriefToast,
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

function WhyThisQuestionPrep({ insight }: { insight: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mock-hub-why">
      <button type="button" className="mock-hub-why-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="mock-hub-why-text">{open ? "▾ Why this question" : "▸ Why this question"}</span>
      </button>
      {open ? <div className="mock-hub-why-body">{insight}</div> : null}
    </div>
  );
}

type Props = {
  sessionId: string;
  questions: DbQuestionShape[];
  tab: "prep" | "questions";
  setTab: (t: "prep" | "questions") => void;
  questionsExpanded: boolean;
  setQuestionsExpanded: (v: boolean) => void;
  visibleQuestions: DbQuestionShape[];
};

export function PrepLabMockInterviews({
  sessionId,
  questions,
  tab,
  setTab,
  questionsExpanded,
  setQuestionsExpanded,
  visibleQuestions,
}: Props) {
  const [progress, setProgress] = useState<Record<string, "pending" | "done" | "skipped">>({});
  const [toast, setToast] = useState<string | null>(null);
  const [regenBusy, setRegenBusy] = useState<string | null>(null);

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

  useEffect(() => {
    if (!consumeBriefToast(sessionId)) return;
    setToast("Answer saved");
    refreshProgress();
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [sessionId, refreshProgress]);

  const mockRows = useMemo(() => mapDbQuestionsToMock(questions, progress), [questions, progress]);
  const visibleMock = useMemo(() => mapDbQuestionsToMock(visibleQuestions, progress), [visibleQuestions, progress]);
  const groupedVisible = useMemo(() => groupQuestionsByCategory(visibleMock), [visibleMock]);
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
  const showDifficultyTags = useMemo(() => shouldShowDifficultyTags(mockRows), [mockRows]);

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
      <li key={q.id} className="mock-hub-card prep-lab-q-card">
        <div className="mock-hub-card-meta">
          {showDifficultyTags ? <span className="mock-hub-diff">{formatDifficultyLabel(q.difficulty)}</span> : null}
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
        {q.insight ? <WhyThisQuestionPrep insight={q.insight} /> : null}
      </li>
    );
  }

  function renderCategoryHeader(category: MockInterviewCategory) {
    const catFull = fullByCat.get(category) || [];
    const catDone = catFull.filter((x) => x.status === "done").length;
    const catTotal = catFull.length;
    const catPct = catTotal ? Math.round((catDone / catTotal) * 100) : 0;
    return (
      <div className="prep-category-block prep-lab-cat-block">
        <div className="prep-category-header-row">
          <h4 className="prep-lab-cat-heading-row">
            <span className="mock-hub-cat-label">{formatCategoryLabel(category)}</span>{" "}
            <span className="prep-lab-cat-count">({catTotal}) · {catDone} / {catTotal} DONE</span>
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
        <div className="prep-cat-progress-track prep-lab-cat-track" aria-hidden>
          <div className="prep-cat-progress-fill prep-lab-cat-fill" style={{ width: `${catPct}%` }} />
        </div>
      </div>
    );
  }

  const showEmpty = questions.length === 0;

  return (
    <>
      {toast ? (
        <div className="inro-toast" role="status">
          {toast}
        </div>
      ) : null}

      <aside
        className="brief-sidebar inro_mock_interviews prep-lab-sidebar"
        role="complementary"
        aria-label="Mock interviews and prep lab"
      >
        <div className="brief-sidebar-head">
          <div className="brief-tabs" role="tablist" aria-label="Prep session workspace">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "prep"}
              className={`brief-tab${tab === "prep" ? " active" : ""}`}
              onClick={() => setTab("prep")}
            >
              Prep Lab
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "questions"}
              className={`brief-tab${tab === "questions" ? " active" : ""}`}
              onClick={() => setTab("questions")}
            >
              Recommended Questions
            </button>
          </div>
          <button
            type="button"
            className="btn-open-mock"
            aria-label="Expand prep questions"
            onClick={() => setQuestionsExpanded(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 9V4h5" />
              <path d="M20 15v5h-5" />
              <path d="M9 4 4 9" />
              <path d="M15 20 20 15" />
              <path d="M15 4h5v5" />
              <path d="M20 9 15 4" />
              <path d="M4 15v5h5" />
              <path d="M9 20 4 15" />
            </svg>
          </button>
        </div>

        <div className="prep-lab-start-block">
          <Link href={`/sessions/${sessionId}/practice`} className="prep-lab-hub-link">
            Open mock interview hub →
          </Link>
          <p className="prep-start-full-hint">
            {total > 0
              ? `See all ${total} tailored questions and pick where to practice`
              : "Open the hub once questions are generated"}
          </p>
          <div className="prep-global-progress prep-lab-global-progress" aria-label="Overall mock interview progress">
            <div className="prep-progress-meta prep-lab-progress-meta">{doneCount} / {total || 0} done</div>
            <div className="prep-progress-track prep-lab-progress-track">
              <div className="prep-progress-fill prep-lab-progress-fill" style={{ width: `${globalPct}%` }} />
            </div>
          </div>
        </div>

        <div className="prep-lab-scroll-wrap">
          <div className="prep-lab-scroll">
            <div className="brief-prep-lab-body">
              {showEmpty ? (
                <div className="prep-empty-state" role="status">
                  <div className="prep-empty-illustration" aria-hidden />
                  <p className="prep-empty-title">No questions generated yet</p>
                  <p className="prep-empty-copy">
                    Go to Prep Sessions to analyze your resume and JD — we&apos;ll build tailored questions here.
                  </p>
                  <Link href="/sessions/new" className="btn-primary prep-empty-cta">
                    New prep session
                  </Link>
                </div>
              ) : (
                groupedVisible.map(([category, catQuestions]) => (
                  <Fragment key={category}>
                    {renderCategoryHeader(category)}
                    <ol className="prep-mock-question-list prep-lab-q-list">{catQuestions.map((q) => renderQuestionRow(q))}</ol>
                  </Fragment>
                ))
              )}
            </div>
          </div>
          <div className="prep-lab-scroll-fade" aria-hidden />
        </div>
      </aside>

      {questionsExpanded ? (
        <div className="prep-questions-overlay" role="dialog" aria-modal="true" aria-label="All recommended prep questions">
          <div className="prep-questions-overlay-shell">
            <button type="button" className="prep-questions-close" onClick={() => setQuestionsExpanded(false)}>
              ← Back to session
            </button>
            <h2 className="prep-questions-title">All Recommended Questions</h2>
            <div className="prep-questions-list">
              {groupedAll.map(([category, catQuestions]) => (
                <Fragment key={`overlay-${category}`}>
                  {renderCategoryHeader(category)}
                  <ol className="prep-mock-question-list prep-lab-q-list">{catQuestions.map((q) => renderQuestionRow(q))}</ol>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
