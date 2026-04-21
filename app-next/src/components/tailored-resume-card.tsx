"use client";

import Link from "next/link";
import { useState } from "react";

export function TailoredResumeCard({
  id,
  title,
  company,
}: {
  id: string;
  title: string;
  company: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(company || "");
  const shown = value.trim();

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
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            Save
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

