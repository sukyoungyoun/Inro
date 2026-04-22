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
  timeLabel,
}: {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  archivedAtIso: string | null;
  recruitingOutcome: string | null;
  recruitingNextSteps: string | null;
  timeLabel: string;
}) {
  const archivedAt = archivedAtIso ? new Date(archivedAtIso) : null;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(Boolean(initialOutcome || initialNext));
  const [outcome, setOutcome] = useState(initialOutcome || "");
  const [nextSteps, setNextSteps] = useState(initialNext || "");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  async function saveOutcome() {
    setSaving(true);
    try {
      await patchSession({
        recruitingOutcome: outcome.trim() || null,
        recruitingNextSteps: nextSteps.trim() || null,
      });
    } finally {
      setSaving(false);
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

  return (
    <div className={`session-card session-card--dashboard${archivedAt ? " archived" : ""}`}>
      <div className="session-card-top">
        <div className="session-role">{cleanRoleTitle(title)}</div>
        <div className="session-card-top-actions">
          <div className="session-time">{timeLabel}</div>
          <div className="session-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="session-menu-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Session actions"
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
                  Edit / open brief
                </Link>
                {archivedAt ? (
                  <button type="button" className="session-menu-item" role="menuitem" disabled={archiving} onClick={() => void setArchived(false)}>
                    Unarchive
                  </button>
                ) : (
                  <button type="button" className="session-menu-item" role="menuitem" disabled={archiving} onClick={() => void setArchived(true)}>
                    Archive
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {archivedAt ? <div className="session-archived-pill">Archived</div> : null}

      <div className="session-company">
        <strong>Role:</strong> {cleanRoleTitle(title)}
      </div>
      <div className="session-company" style={{ marginTop: -6 }}>
        <strong>Company:</strong> {company || "Not set"}
      </div>

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

      <div className="session-outcome-block">
        <button type="button" className="session-outcome-toggle" onClick={() => setOutcomeOpen((o) => !o)}>
          {outcomeOpen ? "▼" : "▶"} After recruiting: outcome &amp; next steps
        </button>
        {outcomeOpen ? (
          <div className="session-outcome-fields">
            <label className="session-outcome-label" htmlFor={`outcome-${id}`}>
              Result (e.g. offer, rejected, withdrew)
            </label>
            <input
              id={`outcome-${id}`}
              className="session-outcome-input"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="How did recruiting end?"
            />
            <label className="session-outcome-label" htmlFor={`next-${id}`}>
              Notes &amp; follow-ups
            </label>
            <textarea
              id={`next-${id}`}
              className="session-outcome-textarea"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="Next steps, learnings, or links you want to remember…"
              rows={3}
            />
            <button type="button" className="session-outcome-save" onClick={() => void saveOutcome()} disabled={saving}>
              {saving ? "Saving…" : "Save outcome notes"}
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
