"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TailoredResumeCard({
  id,
  title,
  company,
}: {
  id: string;
  title: string;
  company: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(company || "");
  const shown = value.trim();
  const [saving, setSaving] = useState(false);

  async function saveCompany() {
    setSaving(true);
    await fetch("/api/resume", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, company: value }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="tailored-card">
      <div className="tailored-card-top">
        <div className="tailored-icon">📄</div>
        <button type="button" className="more-btn" aria-label="More">
          ···
        </button>
      </div>
      <div className="tailored-name">{title}</div>
      {!editing ? (
        <div
          className={shown ? "tailored-meta" : "tailored-company-empty"}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
          role="button"
          tabIndex={0}
        >
          {shown || "Add company →"}
        </div>
      ) : (
        <div className="tailored-company-pop">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Set company" />
          <button type="button" className="btn-ghost" onClick={saveCompany} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
      <div className="tailored-tags">
        <span className="tailored-tag">SESSION</span>
      </div>
      <div className="tailored-actions">
        <button type="button" className="btn-ghost">
          Preview
        </button>
        <Link href={`/sessions/${id}`} className="btn-primary">
          View Sessions
        </Link>
      </div>
    </div>
  );
}

