"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default function OnboardingPage() {
  const [fullName, setFullName] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [targetStage, setTargetStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not save profile.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AppShell crumb="PREFERENCES" active="prefs" userName={fullName || "You"} roleTitle={currentRole || "Role"} roleCompany="Company">
      <div className="p-9">
      <div className="max-w-2xl inro-card p-8">
        <p className="inro-mono text-[10px] tracking-[1.2px] uppercase text-[#9C8E84] mb-2">Preferences</p>
        <h1 className="text-3xl inro-serif mb-2 text-[#1C1917]">Set up your prep profile</h1>
        <p className="text-sm text-[#5C5248] mb-6">
          This replaces mock persona data and personalizes every cycle.
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Full Name</p>
          <input
            className="inro-input"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Current Role</p>
          <input
            className="inro-input"
            placeholder="Current role"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
          />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Target Roles</p>
          <input
            className="inro-input"
            placeholder="Target roles (comma-separated)"
            value={targetRoles}
            onChange={(e) => setTargetRoles(e.target.value)}
            required
          />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Preferred Stage</p>
          <select
            className="inro-select"
            value={targetStage}
            onChange={(e) => setTargetStage(e.target.value)}
          >
            <option value="">Preferred stage</option>
            <option value="RECRUITER_SCREEN">Recruiter Screen</option>
            <option value="HIRING_MANAGER">Hiring Manager</option>
            <option value="PORTFOLIO_REVIEW">Portfolio Review</option>
            <option value="FINAL_LOOP">Final Loop</option>
          </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="inro-btn-primary"
          >
            {loading ? "Saving..." : "Continue to dashboard"}
          </button>
        </form>
      </div>
      </div>
    </AppShell>
  );
}

