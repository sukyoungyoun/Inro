"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function cleanRoleTitle(raw: string) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Role unknown";
  return trimmed
    .replace(/\.(pdf|docx|txt)$/i, "")
    .replace(/\s+copy$/i, "")
    .replace(/full text extraction failed[\s\S]*/i, "")
    .replace(/could not parse[\s\S]*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const MODULE_NAMES = [
  "Behavioral storytelling",
  "Role fit evidence",
  "Product sense",
  "System design",
  "Execution depth",
  "Communication clarity",
];

function looksLikeBadOrMissingJdTitle(raw: string) {
  const t = (raw || "").trim().toLowerCase();
  if (!t) return true;
  return (
    /pdf extraction failed|could not parse|unsupported format|resource_exhausted|quota exceeded|gemini/i.test(t) ||
    t === "untitled role" ||
    t === "role analysis"
  );
}

function buildSessionHeading(rawTitle: string, company: string | null) {
  const role = cleanRoleTitle(rawTitle);
  const hasCompany = Boolean((company || "").trim()) && (company || "").trim().toLowerCase() !== "not set";
  const missingJd = looksLikeBadOrMissingJdTitle(rawTitle);

  if (missingJd) {
    return {
      heading: "Untitled Session",
      roleLine: "Role unknown",
      missingJd,
    };
  }

  const heading = hasCompany ? `${role} at ${company!.trim()}` : role;
  return { heading, roleLine: role, missingJd };
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
  const [quickSaving, setQuickSaving] = useState(false);
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

  const hasParsedScore = matchScore !== null && matchScore !== undefined && matchScore > 0;
  const score = hasParsedScore ? matchScore : 0;
  const badgeLabel = hasParsedScore ? `${score}% match` : "–";
  const { heading, roleLine, missingJd } = buildSessionHeading(title, company);
  const hasCompany = Boolean((company || "").trim()) && (company || "").trim().toLowerCase() !== "not set";
  const status =
    !hasParsedScore
      ? { cls: "pending", label: "Pending score" }
      : score >= 78
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
    if (!window.confirm("Delete this session? This cannot be undone.")) {
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

  async function quickSetRecruitingOutcome(value: string) {
    setQuickSaving(true);
    setMenuOpen(false);
    try {
      await patchSession({ recruitingOutcome: value });
      setOutcome(value);
      setNotesOpen(true);
    } finally {
      setQuickSaving(false);
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
        <div className="session-role-wrap">
          <div className="session-role">{sessionEditOpen ? cleanRoleTitle(titleEdit) : heading}</div>
          {missingJd ? (
            <span className="session-warning-tag">⚠ Could not parse job description</span>
          ) : null}
        </div>
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
              aria-label="More options"
              disabled={quickSaving || archiving}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
            >
              <svg className="session-menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuOpen ? (
              <div className="session-menu-dropdown" role="menu">
                <Link href={`/sessions/${id}`} className="session-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Open full brief
                </Link>
                <div className="session-menu-sep" role="separator" />
                <button
                  type="button"
                  className="session-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setSessionEditOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Rename
                </button>
                <div className="session-menu-sep" role="separator" />
                <div className="session-menu-section-label">Add update</div>
                <button
                  type="button"
                  className="session-menu-item"
                  role="menuitem"
                  disabled={quickSaving}
                  onClick={() => void quickSetRecruitingOutcome("Offered a job")}
                >
                  Offered a job
                </button>
                <button
                  type="button"
                  className="session-menu-item"
                  role="menuitem"
                  disabled={quickSaving}
                  onClick={() => void quickSetRecruitingOutcome("Rejected")}
                >
                  Rejected
                </button>
                <div className="session-menu-sep" role="separator" />
                {archivedAt ? (
                  <button type="button" className="session-menu-item" role="menuitem" disabled={archiving || quickSaving} onClick={() => void setArchived(false)}>
                    Unarchive
                  </button>
                ) : (
                  <button type="button" className="session-menu-item" role="menuitem" disabled={archiving || quickSaving} onClick={() => void setArchived(true)}>
                    Archive session
                  </button>
                )}
                <button
                  type="button"
                  className="session-menu-item"
                  role="menuitem"
                  disabled={deleting}
                  onClick={() => void deleteSession()}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
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
            <strong>Role:</strong> {roleLine}
          </div>
          {hasCompany ? (
            <div className="session-company" style={{ marginTop: -6 }}>
              <strong>Company:</strong> {company}
            </div>
          ) : null}
        </>
      )}

      <div className="match-row">
        <div className={`match-badge${hasParsedScore ? "" : " neutral"} accent`}>{badgeLabel}</div>
        {hasParsedScore ? (
          <div className="match-bar">
            <div
              className={`match-fill${score < 78 ? " mid" : ""}`}
              style={
                {
                  width: `${Math.max(0, Math.min(100, score))}%`,
                  ["--match-score" as string]: String(Math.max(0, Math.min(100, score))),
                } as React.CSSProperties
              }
            />
          </div>
        ) : null}
      </div>
      <div className="session-modules" title={MODULE_NAMES.join("\n")}>
        3 of 6 modules
      </div>
      <div className="module-segments" aria-label={`module completion segments: ${MODULE_NAMES.join(", ")}`} title={MODULE_NAMES.join("\n")}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <span key={idx} className={`module-segment module-seg${idx < 3 ? " done" : idx === 3 ? " active" : ""}`} />
        ))}
      </div>
      <div className={`status-tag ${status.cls}`}>{status.label}</div>

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
              Follow-ups & learnings
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

      <div className="session-cta-footer">
        <Link href={`/sessions/${id}`} className="session-action">
          Continue practice →
        </Link>
      </div>
    </div>
  );
}
