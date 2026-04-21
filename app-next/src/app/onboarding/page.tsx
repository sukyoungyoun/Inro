"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [level, setLevel] = useState("");
  const [targetStage, setTargetStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const industries = ["Technology", "Finance", "Healthcare", "Consulting", "Product", "Design", "Marketing", "Education"];
  const levels = ["Intern", "Entry-level", "Mid-level", "Senior", "Staff / Principal", "Director+"];
  const totalSteps = 3;

  async function saveProfile() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        currentRole: level,
        targetRoles: [targetRole].filter(Boolean),
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

  const canContinue = (step === 1 && targetRole && industry) || (step === 2 && level) || step === 0 || step === 3;

  function go(nextStep: number) {
    setDir(nextStep > step ? "forward" : "back");
    setStep(nextStep);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-base)",
        }}
      >
        <div className="logo">inro</div>
        {step > 0 && step <= totalSteps ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i < step ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i <= step - 1 ? "var(--terra)" : "var(--border)",
                  opacity: i < step ? 0.6 : 1,
                  transition: "all 300ms ease",
                }}
              />
            ))}
          </div>
        ) : (
          <div />
        )}
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink3)", letterSpacing: "0.1em" }}>
          {step > 0 && step <= totalSteps ? `${step} / ${totalSteps}` : ""}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div
          key={`${step}-${dir}`}
          style={{
            width: "100%",
            maxWidth: 480,
            background: "var(--surface)",
            borderRadius: 12,
            boxShadow: "var(--sh)",
            padding: "48px 48px 40px",
            animation: `${dir === "forward" ? "slideLeft" : "slideRight"} 220ms ease`,
          }}
        >
          {step === 0 && (
            <div style={{ textAlign: "center", animation: "fadeUp 300ms ease" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--terra-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  fontSize: 28,
                }}
              >
                ✦
              </div>
              <h1 style={{ marginBottom: 12, lineHeight: 1.3 }}>Welcome to inro.</h1>
              <p style={{ fontSize: 15, color: "var(--ink2)", lineHeight: 1.7, marginBottom: 8 }}>
                I will tailor your interview prep from your target role and experience. It takes about two minutes.
              </p>
              <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 40 }}>Takes about 2 minutes · You can skip optional steps</p>
            </div>
          )}

          {step === 1 && (
            <div style={{ animation: "fadeUp 300ms ease" }}>
              <div className="section-label">Step 1 of 3 · Required</div>
              <h2 style={{ marginBottom: 8, lineHeight: 1.3 }}>What role are you going for?</h2>
              <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 24 }}>
                Being specific helps me tailor your questions to what actually comes up in interviews.
              </p>
              <input
                className="field-input"
                placeholder="e.g. Product Designer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                style={{ marginBottom: 16 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {industries.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndustry(ind)}
                    className="tailored-tag"
                    style={{
                      borderColor: industry === ind ? "var(--terra)" : "var(--border)",
                      background: industry === ind ? "var(--terra-bg)" : "transparent",
                      color: industry === ind ? "var(--terra)" : "var(--ink2)",
                      textTransform: "none",
                      fontFamily: "var(--ui)",
                    }}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: "fadeUp 300ms ease" }}>
              <div className="section-label">Step 2 of 3 · Required</div>
              <h2 style={{ marginBottom: 8, lineHeight: 1.3 }}>Where are you in your career?</h2>
              <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 24 }}>
                I will match interview difficulty and coaching to your current level.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className="btn-ghost"
                    style={{
                      justifyContent: "flex-start",
                      padding: "12px 14px",
                      borderColor: level === lvl ? "var(--terra)" : "var(--border)",
                      background: level === lvl ? "var(--terra-bg)" : "white",
                      color: level === lvl ? "var(--terra)" : "var(--ink)",
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ animation: "fadeUp 300ms ease" }}>
              <div className="section-label">Step 3 of 3 · Optional</div>
              <h2 style={{ marginBottom: 8, lineHeight: 1.3 }}>Final preferences</h2>
              <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 24 }}>
                Add these now or skip - you can update anytime in Preferences.
              </p>
              <input
                className="field-input"
                placeholder="Full name (optional)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <select className="field-select" value={targetStage} onChange={(e) => setTargetStage(e.target.value)}>
                <option value="">Preferred stage (optional)</option>
                <option value="PORTFOLIO_REVIEW">Portfolio Review</option>
                <option value="RECRUITER_SCREEN">Initial Screen</option>
                <option value="HIRING_MANAGER">Technical</option>
                <option value="FINAL_LOOP">Final Round</option>
              </select>
            </div>
          )}

          {error ? <p style={{ color: "#b85450", marginTop: 12, fontSize: 13 }}>{error}</p> : null}

          <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0 || loading}>
              Back
            </button>
            {step < 3 ? (
              <button type="button" className="btn-primary" disabled={!canContinue || loading} onClick={() => go(step + 1)}>
                Continue →
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={loading} onClick={saveProfile}>
                {loading ? "Saving..." : "Go to dashboard →"}
              </button>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

