"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ProfileData = {
  fullName: string;
  currentRole: string;
  targetRoles: string[];
  targetStage: string;
};

export function PreferencesForm({
  initial,
  userEmail,
}: {
  initial: ProfileData;
  userEmail: string;
}) {
  const nameParts = useMemo(() => {
    const p = initial.fullName.trim().split(/\s+/);
    return { first: p[0] || "", last: p.slice(1).join(" ") || "" };
  }, [initial.fullName]);

  const [firstName, setFirstName] = useState(nameParts.first);
  const [lastName, setLastName] = useState(nameParts.last);
  const [currentRole, setCurrentRole] = useState(initial.currentRole);
  const [targetRoles, setTargetRoles] = useState<string[]>(initial.targetRoles);
  const [roleDraft, setRoleDraft] = useState("");
  const [targetStage, setTargetStage] = useState(initial.targetStage);
  const [careerContext, setCareerContext] = useState("");
  const [prepStyle, setPrepStyle] = useState<"guided" | "automated">("guided");
  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(
    () =>
      `${firstName} ${lastName}`
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join("") || "U",
    [firstName, lastName]
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("inro-avatar-preview");
    if (saved) setAvatarPreview(saved);
  }, []);

  function addRole(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = roleDraft.trim();
    if (!v) return;
    if (!targetRoles.includes(v)) setTargetRoles((r) => [...r, v]);
    setRoleDraft("");
  }

  function removeRole(role: string) {
    setTargetRoles((r) => r.filter((x) => x !== role));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const fullName = `${firstName} ${lastName}`.trim();
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        currentRole,
        targetRoles,
        targetStage: targetStage || null,
      }),
    });
    setLoading(false);
    setMessage(res.ok ? "Preferences saved." : "Could not save preferences.");
  }

  function onAvatarSelect(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      setAvatarPreview(result);
      window.localStorage.setItem("inro-avatar-preview", result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="prefs-scroll">
          <div className="prefs-breadcrumb">
            <Link href="/dashboard">Workspace</Link> › Preferences
          </div>
          <div className="prefs-title">Preferences</div>
    <form id="prefs-form" onSubmit={onSubmit}>
      <div className="prefs-card">
        <div className="prefs-card-title">Profile Information</div>
        <div className="prefs-card-sub">Manage your personal details and how you appear on the platform.</div>

        <div className="avatar-row">
          <button
            type="button"
            className="avatar-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            <div className="avatar-lg">
              {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : initials}
              <div className="avatar-overlay" aria-hidden>
                <span className="avatar-overlay-icon">📷</span>
                <span className="avatar-overlay-label">Change photo</span>
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => onAvatarSelect(e.target.files?.[0] || null)}
          />
          <div>
            <button type="button" className="change-img-btn" onClick={() => fileInputRef.current?.click()}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M6.5 9V4M4 6.5l2.5-2.5 2.5 2.5" />
                <path d="M1 10.5h11" />
              </svg>
              Change image
            </button>
            <div className="img-hint">JPG, GIF or PNG. 1MB max.</div>
          </div>
        </div>

        <div className="name-grid">
          <div>
            <div className="pref-label">First Name</div>
            <input
              className="pref-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <div className="pref-label">Last Name</div>
            <input className="pref-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="pref-label">Email Address</div>
          <div className="pref-input-lock">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="1" y="6" width="10" height="8" rx="1" />
              <path d="M3 6V4a3 3 0 016 0v2" />
            </svg>
            {userEmail}
          </div>
        </div>
      </div>

      <div className="prefs-card">
        <div className="prefs-card-title">Interview Prep Strategy</div>
        <div className="prefs-card-sub">Customize how inro generates your prep plans based on your learning style.</div>

        <div className="pref-label" style={{ marginBottom: 10 }}>
          Default Prep Style
        </div>
        <div className="prep-style-grid">
          <button
            type="button"
            className={`style-option${prepStyle === "guided" ? " selected" : ""}`}
            onClick={() => setPrepStyle("guided")}
          >
            <div className="style-option-header">
              <div className="style-option-title">Guided Co-creation</div>
              <div className={`style-radio${prepStyle === "guided" ? " checked" : ""}`} />
            </div>
            <div className="style-option-desc">
              inro provides structure and prompts, but you retain control over building and editing the final plan. Best for
              building confidence.
            </div>
          </button>
          <button
            type="button"
            className={`style-option${prepStyle === "automated" ? " selected" : ""}`}
            onClick={() => setPrepStyle("automated")}
          >
            <div className="style-option-header">
              <div className="style-option-title">Fully Automated</div>
              <div className={`style-radio${prepStyle === "automated" ? " checked" : ""}`} />
            </div>
            <div className="style-option-desc">
              inro builds the entire end-to-end plan instantly. Best when you need to prep fast with zero setup time.
            </div>
          </button>
        </div>

        <div className="pref-label" style={{ marginBottom: 8 }}>
          Target Roles
        </div>
        <div
          className="target-roles-input"
          onClick={() => document.getElementById("role-add")?.focus()}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          role="presentation"
        >
          {targetRoles.map((role) => (
            <span key={role} className="role-chip">
              {role}{" "}
              <span
                className="role-chip-x"
                onClick={() => removeRole(role)}
                onKeyDown={(e) => e.key === "Enter" && removeRole(role)}
                role="button"
                tabIndex={0}
              >
                ×
              </span>
            </span>
          ))}
          <input
            id="role-add"
            className="role-add-input"
            placeholder="Add a role…"
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value)}
            onKeyDown={addRole}
          />
        </div>

        <div className="pref-label" style={{ marginTop: 16, marginBottom: 8 }}>
          Current role <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(Optional)</span>
        </div>
        <input
          className="pref-input"
          value={currentRole}
          onChange={(e) => setCurrentRole(e.target.value)}
          placeholder="e.g. Product Designer"
        />

        <div className="pref-label" style={{ marginTop: 16, marginBottom: 8 }}>
          Interview focus
        </div>
        <div className="segmented" style={{ marginBottom: 16 }}>
          {[
            ["PORTFOLIO_REVIEW", "Portfolio & case review"],
            ["RECRUITER_SCREEN", "Recruiter screen"],
            ["HIRING_MANAGER", "Technical interview"],
            ["FINAL_LOOP", "Final round & offer"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`segment${targetStage === value ? " active" : ""}`}
              onClick={() => setTargetStage(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pref-label" style={{ marginTop: 16, marginBottom: 8 }}>
          Career Context <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(Optional)</span>
        </div>
        <textarea
          className="career-ta"
          value={careerContext}
          onChange={(e) => setCareerContext(e.target.value)}
          placeholder="Add context that helps tailor your prep plans."
        />
      </div>

      <div className="prefs-card">
        <div className="prefs-card-title">Notifications</div>
        <div className="prefs-card-sub">Manage how we communicate with you.</div>
        <div className="notif-row">
          <div>
            <div className="notif-title">Interview Reminders</div>
            <div className="notif-desc">Receive an email 24 hours before your scheduled interviews.</div>
          </div>
          <button type="button" className={`toggle${n1 ? " on" : " off"}`} onClick={() => setN1((v) => !v)} aria-label="Interview reminders" />
        </div>
        <div className="notif-row">
          <div>
            <div className="notif-title">Weekly Prep Digest</div>
            <div className="notif-desc">A summary of your mock interview scores and readiness progress.</div>
          </div>
          <button type="button" className={`toggle${n2 ? " on" : " off"}`} onClick={() => setN2((v) => !v)} aria-label="Weekly digest" />
        </div>
        <div className="notif-row">
          <div>
            <div className="notif-title">Product Updates</div>
            <div className="notif-desc">Occasional emails about new inro features and improvements.</div>
          </div>
          <button type="button" className={`toggle${n3 ? " on" : " off"}`} onClick={() => setN3((v) => !v)} aria-label="Product updates" />
        </div>
      </div>

      {message ? <p className="img-hint" style={{ marginTop: 8 }}>{message}</p> : null}
    </form>
        </div>
      </div>
      <div className="prefs-footer">
        <button type="button" className="btn-ghost">
          Discard
        </button>
        <button type="submit" form="prefs-form" className="btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
