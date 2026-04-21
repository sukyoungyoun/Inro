"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PrimaryResumeActions({
  sessionId,
  resumeText,
}: {
  sessionId: string | null;
  resumeText: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(resumeText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveText() {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/resume", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, resumeText: draft }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update resume.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function uploadFile(file: File) {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    const form = new FormData();
    form.append("sessionId", sessionId);
    form.append("file", file);
    const res = await fetch("/api/resume", { method: "POST", body: form });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not upload resume.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="resume-actions">
      <button type="button" className="btn-preview" onClick={() => setOpen((v) => !v)} disabled={!sessionId}>
        {open ? "Hide" : "Preview"}
      </button>
      <button type="button" className="btn-update" onClick={() => setEditing((v) => !v)} disabled={!sessionId}>
        {editing ? "Close" : "Update"}
      </button>
      <button type="button" className="btn-upload" onClick={() => fileRef.current?.click()} disabled={!sessionId || saving}>
        Upload
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
          e.currentTarget.value = "";
        }}
      />
      {error ? <div className="error-msg">{error}</div> : null}
      {open ? (
        <div className="traceability-note" style={{ marginTop: 8, width: "100%" }}>
          {resumeText?.slice(0, 900) || "No resume text available yet."}
        </div>
      ) : null}
      {editing ? (
        <div style={{ width: "100%", marginTop: 8 }}>
          <textarea className="career-ta" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="button" className="btn-primary" onClick={saveText} disabled={saving} style={{ marginTop: 8 }}>
            {saving ? "Saving..." : "Save Resume Text"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

