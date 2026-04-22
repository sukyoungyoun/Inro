"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function cleanRoleTitle(raw: string) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Untitled role";
  return trimmed
    .replace(/\.(pdf|docx|txt)$/i, "")
    .replace(/\s+copy$/i, "")
    .trim();
}

export function DashboardSessionCard({
  id,
  title,
  company,
  matchScore,
  archivedAtIso,
  recruitingOutcome: initialOutcome,
  recruitingNextSteps: initialNext,
  prepFeedback: initialPrepFeedback,
  timeLabel,
}: {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  archivedAtIso: string | null;
  recruitingOutcome: string | null;
  recruitingNextSteps: string | null;
  prepFeedback: string | null;
  timeLabel: string;
}) {
  const archivedAt = archivedAtIso ? new Date(archivedAtIso) : null;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionEditOpen, setSessionEditOpen] = useState(false);
  const [titleEdit, setTitleEdit] = useState(title);
  const [companyEdit, setCompanyEdit] = useState(company || "");
  const [notesOpen, setNotesOpen] = useState(
    Boolean(initialPrepFeedback?.trim() || initialOutcome || initialNext)
  );
  const [prepFeedback, setPrepFeedback] = useState(initialPrepFeedback || "");
  const [outcome, setOutcome] = useState(initialOutcome || "");
  const [nextSteps, setNextSteps] = useState(initialNext || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleEdit(title);
    setCompanyEdit(company || "");
  }, [title, company]);

  useEffect(() => {
    setPrepFeedback(initialPrepFeedback || "");
    setOutcome(initialOutcome || "");
    setNextSteps(initialNext || "");
  }, [initialPrepFeedback, initialOutcome, initialNext]);

  const score = matchScore ?? 0;
  const badgeLabel = `${score}% match`;
  const status =
    score >= 78
      ? { cls: "strong", label: "Strong Fit" }
      : score >= 65
        ? { cls: "review", label: "Needs Review" }
        : { cls: "bench", label: "Benchmark" };

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  async function patchSession(body: Record<string, unknown>) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("update failed");
    router.refresh();
  }

  async function saveNotesAndFeedback() {
    setSavingNotes(true);
    try {
      await patchSession({
        prepFeedback: prepFeedback.trim() || null,
        recruitingOutcome: outcome.trim() || null,
        recruitingNextSteps: nextSteps.trim() || null,
      });
    } finally {
      setSavingNotes(false);
    }
  }

  async function deleteSession() {
    if (
      !window.confirm(
        "Permanently delete this prep session? Your brief, analysis, and practice data for this role will be removed. This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting(true);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function setArchived(archived: boolean) {
    setArchiving(true);
    setMenuOpen(false);
    try {
      await patchSession({ archived });
    } finally {
      setArchiving(false);
    }
  }

  function cancelSessionEdit() {
    setTitleEdit(title);
    setCompanyEdit(company || "");
    setSessionEditOpen(false);
  }

  async function saveSessionDetails() {
    setSavingDetails(true);
    try {
      await patchSession({
        title: titleEdit.trim() || "Untitled role",
        company: companyEdit.trim() || null,
      });
      setSessionEditOpen(false);
    } finally {
      setSavingDetails(false);
    }
  }

  return (
    <div className={`session-card session-card--dashboard${archivedAt ? " archived" : ""}`}>
      <div className="session-card-top">
        <div className="session-role">{cleanRoleTitle(sessionEditOpen ? titleEdit : title)}</div>
        <div className="session-card-top-actions">
          <div className="session-time">{timeLabel}</div>
          {!archivedAt ? (
            <button
              type="button"
              className="session-edit-btn"
              onClick={() => {
                setMenuOpen(false);
                setSessionEditOpen((o) => !o);
              }}
              aria-expanded={sessionEditOpen}
            >
              {sessionEditOpen ? "Close edit" : "Edit session"}
            </button>
          ) : null}
          <div className="session-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="session-menu-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="More session actions"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="session-menu-dropdown" role="menu">
                <Link href={`/sessions/${id}`} className="session-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Open full brief
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {archivedAt ? <div className="session-archived-pill">Archived</div> : null}

      {sessionEditOpen && !archivedAt ? (
        <div className="session-inline-edit">
          <label className="session-inline-label" htmlFor={`dash-title-${id}`}>
            Role title
          </label>
          <input
            id={`dash-title-${id}`}
            className="session-inline-input"
            value={titleEdit}
            onChange={(e) => setTitleEdit(e.target.value)}
            autoComplete="off"
          />
          <label className="session-inline-label" htmlFor={`dash-co-${id}`}>
            Company
          </label>
          <input
            id={`dash-co-${id}`}
            className="session-inline-input"
            value={companyEdit}
            onChange={(e) => setCompanyEdit(e.target.value)}
            placeholder="Company name"
            autoComplete="organization"
          />
          <div className="session-inline-edit-actions">
            <button type="button" className="session-inline-save" onClick={() => void saveSessionDetails()} disabled={savingDetails}>
              {savingDetails ? "Saving…" : "Save"}
            </button>
            <button type="button" className="session-inline-cancel" onClick={cancelSessionEdit} disabled={savingDetails}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="session-company">
            <strong>Role:</strong> {cleanRoleTitle(title)}
          </div>
          <div className="session-company" style={{ marginTop: -6 }}>
            <strong>Company:</strong> {company || "Not set"}
          </div>
        </>
      )}

      <div className="match-row">
        <div className="match-badge accent">{badgeLabel}</div>
        <div className="match-bar">
          <div className={`match-fill${score < 78 ? " mid" : ""}`} style={{ width: `${Math.min(100, Math.max(8, score))}%` }} />
        </div>
      </div>
      <div className="session-modules">3/6 modules</div>
      <div className="module-segments" aria-label="module completion segments">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <span key={idx} className={`module-segment${idx < 3 ? " done" : ""}`} />
        ))}
      </div>
      <div className={`status-tag ${status.cls}`}>{status.label}</div>
      <div className="session-next">
        Best next step: open your brief and run a targeted practice block on your highest-impact gap.
      </div>

      <div className="session-manage-row" aria-label="Session actions">
        {!archivedAt ? (
          <button type="button" className="session-manage-link" disabled={archiving} onClick={() => void setArchived(true)}>
            {archiving ? "Archiving…" : "Archive session"}
          </button>
        ) : (
          <button type="button" className="session-manage-link" disabled={archiving} onClick={() => void setArchived(false)}>
            {archiving ? "Restoring…" : "Unarchive"}
          </button>
        )}
        <span className="session-manage-sep" aria-hidden>
          ·
        </span>
        <button type="button" className="session-manage-link session-manage-danger" disabled={deleting} onClick={() => void deleteSession()}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      <div className="session-outcome-block">
        <button type="button" className="session-outcome-toggle" onClick={() => setNotesOpen((o) => !o)}>
          {notesOpen ? "▼" : "▶"} Feedback & notes
        </button>
        {notesOpen ? (
          <div className="session-outcome-fields">
            <label className="session-outcome-label" htmlFor={`feedback-${id}`}>
              Feedback on this prep
            </label>
            <textarea
              id={`feedback-${id}`}
              className="session-outcome-textarea"
              value={prepFeedback}
              onChange={(e) => setPrepFeedback(e.target.value)}
              placeholder="What is working, what feels stuck, or ideas for this practice block…"
              rows={3}
            />
            <label className="session-outcome-label" htmlFor={`outcome-${id}`}>
              Recruiting result (optional)
            </label>
            <input
              id={`outcome-${id}`}
              className="session-outcome-input"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. offer, rejected, withdrew, still interviewing"
            />
            <label className="session-outcome-label" htmlFor={`next-${id}`}>
              Follow-ups &amp; learnings
            </label>
            <textarea
              id={`next-${id}`}
              className="session-outcome-textarea"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="Next steps, takeaways, or links to remember…"
              rows={3}
            />
            <button type="button" className="session-outcome-save" onClick={() => void saveNotesAndFeedback()} disabled={savingNotes}>
              {savingNotes ? "Saving…" : "Save feedback & notes"}
            </button>
          </div>
        ) : null}
      </div>

      <Link href={`/sessions/${id}`} className="session-action">
        {score >= 70 ? "→ Continue Prep" : "⟳ Review Insights"}
      </Link>
    </div>
  );
}
