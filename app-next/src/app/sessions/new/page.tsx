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
      <div className="max-w-4xl bg-white border border-[#E0D8D0] rounded-[10px] p-8 shadow-[var(--sh)]">
        <h1 className="text-3xl font-serif text-[#1C1917] mb-2">New Prep Session</h1>
        <p className="text-sm text-[#5C5248] mb-6">
          Provide role context and run real Gemini analysis.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2"
              placeholder="Target company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <select
              className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2"
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

          <textarea
            className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2 min-h-44"
            placeholder="Paste JD text"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            required
          />
          <textarea
            className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2 min-h-44"
            placeholder="Paste resume text"
            value={rv}
            onChange={(e) => setRv(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="bg-[#1C1917] text-white rounded-[10px] px-5 py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Generate Brief"}
          </button>
        </form>
      </div>
      </div>
    </AppShell>
  );
}

