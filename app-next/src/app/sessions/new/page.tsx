"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default function NewSessionPage() {
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [jd, setJd] = useState("");
  const [rv, setRv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, stage, jd, rv }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not analyze this session.");
      return;
    }
    router.push(`/sessions/${data.id}`);
  }

  return (
    <AppShell crumb="SETUP" active="prep" userName="You" roleTitle="New Role" roleCompany={company || "Company"}>
      <div className="p-9">
      <div className="max-w-4xl inro-card p-8">
        <p className="inro-mono text-[10px] tracking-[1.2px] uppercase text-[#9C8E84] mb-2">Setup</p>
        <h1 className="text-3xl inro-serif text-[#1C1917] mb-2">Consult with inro</h1>
        <p className="text-sm text-[#5C5248] mb-6">
          Provide role context and run real Gemini analysis.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Target Company</p>
              <input
                className="inro-input"
                placeholder="Target company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Interview Stage</p>
              <select
                className="inro-select"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="">Interview stage</option>
                <option value="RECRUITER_SCREEN">Recruiter Screen</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="PORTFOLIO_REVIEW">Portfolio Review</option>
                <option value="FINAL_LOOP">Final Loop</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Job Description</p>
          <textarea
            className="inro-textarea min-h-44"
            placeholder="Paste JD text"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            required
          />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#5C5248] mb-1.5">Resume / Background</p>
          <textarea
            className="inro-textarea min-h-44"
            placeholder="Paste resume text"
            value={rv}
            onChange={(e) => setRv(e.target.value)}
            required
          />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="inro-btn-primary"
          >
            {loading ? "Analyzing..." : "Generate Brief"}
          </button>
        </form>
      </div>
      </div>
    </AppShell>
  );
}

