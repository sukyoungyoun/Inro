import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

function StrengthIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await prisma.prepSession.findFirst({
    where: { id, userId: session.user.id },
    include: {
      analysis: true,
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!data) notFound();

  const strengths =
    (data.analysis?.strengthsJson as Array<{ title: string; desc: string }> | null) || [];
  const gaps =
    (data.analysis?.gapsJson as Array<{ title: string; mitigation: string }> | null) || [];

  const score = data.matchScore ?? 0;
  const metaBits = [data.company || "Company", data.stage?.replace(/_/g, " ") || "Stage"].filter(Boolean);

  return (
    <AppShell
      crumb="PREP SESSIONS"
      active="prep"
      userName={session.user.email || "User"}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      contentFill
    >
      <div id="view-brief" className="view">
        <div className="brief-main">
          <div className="brief-eyebrow">Role Overview</div>
          <div className="brief-role-row">
            <div className="brief-role-name">{data.title}</div>
            <div className="score-box">
              <div className="score-num">{score}</div>
              <div className="score-unit">%</div>
              <div className="score-label">Role Match Score</div>
            </div>
          </div>
          <div className="brief-meta">{metaBits.join(" • ")}</div>

          <div className="brief-card">
            <h3>Role Summary</h3>
            <p className="brief-summary-text">{data.roleSummary || "No summary yet."}</p>
            <div className="callout-grid">
              <div className="callout-box">
                <div className="callout-label">↗ Strongest Alignment</div>
                <div className="callout-text">{data.analysis?.strongestAlignment || "—"}</div>
              </div>
              <div className="callout-box">
                <div className="callout-label">⚠ Biggest Risk Area</div>
                <div className="callout-text">{data.analysis?.biggestRisk || "—"}</div>
              </div>
            </div>
          </div>

          <div className="section-label">Top Strengths</div>
          {strengths.map((s, i) => (
            <div key={i} className="strength-item">
              <div className="strength-icon">
                <StrengthIcon />
              </div>
              <div>
                <div className="strength-title">{s.title}</div>
                <div className="strength-desc">{s.desc}</div>
              </div>
            </div>
          ))}

          <div className="section-label" style={{ marginTop: 20 }}>
            Critical Gaps &amp; Mitigations
          </div>
          {gaps.map((g, i) => (
            <div key={i} className="gap-item">
              <div className="gap-icon" aria-hidden>
                !
              </div>
              <div>
                <div className="gap-title">{g.title}</div>
                <div className="gap-strategy">{g.mitigation}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="brief-sidebar">
          <div className="sidebar-section-header">
            <div className="sidebar-section-label">Up Next: Prep Lab</div>
            <div className="sidebar-section-right">Recommended Questions</div>
          </div>
          {data.questions.map((q) => (
            <div key={q.id} className="q-mini">
              <div className="q-mini-tag">{q.category}</div>
              <div className="q-mini-text">{q.question}</div>
              {q.insight ? (
                <div className="q-mini-insight">
                  <strong>Insight:</strong> {q.insight}
                </div>
              ) : null}
              <div className="q-mini-actions">
                <Link href={`/sessions/${data.id}/practice`} className="q-mini-btn primary">
                  Practice
                </Link>
                <Link href={`/sessions/${data.id}/evaluation`} className="q-mini-btn ghost">
                  Evaluate
                </Link>
              </div>
            </div>
          ))}

          <div className="mock-card">
            <div className="mock-eyebrow">Comprehensive Practice</div>
            <div
              className="mock-eyebrow"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--ui)",
                textTransform: "none",
                letterSpacing: 0,
                fontSize: 15,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              Full Mock Interview
            </div>
            <div className="mock-title">30-Minute Targeted Session</div>
            <div className="mock-desc">
              Simulates a real interview environment covering your brief, focusing heavily on your strengths and mitigating
              your gaps.
            </div>
            <Link href={`/sessions/${data.id}/practice`} className="mock-btn">
              ▶ Start Mock Interview
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
