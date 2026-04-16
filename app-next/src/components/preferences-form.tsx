"use client";

import { FormEvent, useMemo, useState } from "react";

type ProfileData = {
  fullName: string;
  currentRole: string;
  targetRoles: string[];
  targetStage: string;
};

export function PreferencesForm({ initial }: { initial: ProfileData }) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [currentRole, setCurrentRole] = useState(initial.currentRole);
  const [targetRoles, setTargetRoles] = useState(initial.targetRoles.join(", "));
  const [targetStage, setTargetStage] = useState(initial.targetStage);
  const [prepStyle, setPrepStyle] = useState<"guided" | "automated">("guided");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const initials = useMemo(
    () =>
      fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join("") || "U",
    [fullName]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        currentRole,
        targetRoles: targetRoles.split(",").map((x) => x.trim()).filter(Boolean),
        targetStage: targetStage || null,
      }),
    });
    setLoading(false);
    setMessage(res.ok ? "Preferences saved." : "Could not save preferences.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="inro-card p-7">
        <h2 className="text-[18px] font-semibold text-[#1C1917]">Profile Information</h2>
        <p className="text-sm text-[#5C5248] mt-1 mb-5">Manage your details and prep identity.</p>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-[#EDD5CE] text-[#8B5E52] flex items-center justify-center font-semibold">
            {initials}
          </div>
          <button type="button" className="inro-btn-ghost">Change image</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="inro-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="inro-input" placeholder="Current role" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
        </div>
      </div>

      <div className="inro-card p-7">
        <h2 className="text-[18px] font-semibold text-[#1C1917]">Interview Prep Strategy</h2>
        <p className="text-sm text-[#5C5248] mt-1 mb-5">Tune how inro guides your prep cycle.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setPrepStyle("guided")}
            className={`text-left border rounded-[10px] p-4 ${prepStyle === "guided" ? "border-[#8B5E52] bg-[#F5E8E4]" : "border-[#E0D8D0] bg-white"}`}
          >
            <p className="font-semibold">Guided Co-creation</p>
            <p className="text-xs text-[#5C5248] mt-1">Structured prompts while you stay in control.</p>
          </button>
          <button
            type="button"
            onClick={() => setPrepStyle("automated")}
            className={`text-left border rounded-[10px] p-4 ${prepStyle === "automated" ? "border-[#8B5E52] bg-[#F5E8E4]" : "border-[#E0D8D0] bg-white"}`}
          >
            <p className="font-semibold">Fully Automated</p>
            <p className="text-xs text-[#5C5248] mt-1">Generate complete plans quickly with minimal edits.</p>
          </button>
        </div>

        <input
          className="inro-input mb-3"
          placeholder="Target roles (comma-separated)"
          value={targetRoles}
          onChange={(e) => setTargetRoles(e.target.value)}
        />
        <select className="inro-select" value={targetStage} onChange={(e) => setTargetStage(e.target.value)}>
          <option value="">Preferred stage</option>
          <option value="RECRUITER_SCREEN">Recruiter Screen</option>
          <option value="HIRING_MANAGER">Hiring Manager</option>
          <option value="PORTFOLIO_REVIEW">Portfolio Review</option>
          <option value="FINAL_LOOP">Final Loop</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="inro-btn-ghost">Discard</button>
        <button disabled={loading} className="inro-btn-primary">
          {loading ? "Saving..." : "Save Preferences"}
        </button>
      </div>
      {message ? <p className="text-sm text-[#5C5248]">{message}</p> : null}
    </form>
  );
}

