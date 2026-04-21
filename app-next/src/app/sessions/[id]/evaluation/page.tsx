import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
import { AppShell } from "@/components/app-shell";

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [data, sidebarUserName] = await Promise.all([
    prisma.prepSession.findFirst({
      where: { id, userId: session.user.id },
      include: { analysis: true, questions: { orderBy: { order: "asc" } } },
    }),
    getDisplayNameSourceForUser(session.user.id, session.user.email),
  ]);
  if (!data) notFound();

  const strengths =
    (data.analysis?.strengthsJson as Array<{ title: string; desc: string }> | null) || [];
  const gaps =
    (data.analysis?.gapsJson as Array<{ title: string; mitigation: string }> | null) || [];
  const q = data.questions[0];
  const score = Math.min(100, Math.max(45, (data.matchScore ?? 70) - 3));

  return (
    <AppShell
      crumb="PREP EVALUATION"
      active="mock"
      userName={sidebarUserName}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref="/sessions/new"
      briefHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      mobileTab="prep"
      contentFill
    >
      <div id="view-eval" className="view">
        <div className="eval-topbar">
          <Link href={`/sessions/${id}`} className="back-btn">
            ← Back to Prep Sessions
          </Link>
        </div>
        <div className="eval-body">
          <div>
            <div className="q-header" style={{ marginBottom: 16 }}>
              <div className="q-eyebrow">{(q?.category || "Priority Question").toUpperCase()}</div>
              <div className="q-title">{q?.question || "Question"}</div>
              <div className="insight-bar">
                <span className="insight-icon">💡</span>
                <div>
                  <strong>Insight:</strong>{" "}
                  <span>
                    {q?.insight ||
                      "Assesses awareness of inclusive design principles and whether it is built into your workflow."}
                  </span>
                </div>
              </div>
            </div>

            <div className="playback-card">
              <div className="playback-header">
                <div className="playback-label">Your Response</div>
                <div className="playback-time">01:42</div>
              </div>
              <div className="playback-controls">
                <button type="button" className="play-btn" aria-label="Play">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                    <path d="M1 1l10 6-10 6V1z" />
                  </svg>
                </button>
                <div className="progress-bar">
                  <div className="progress-fill" />
                </div>
              </div>
              <div className="transcript-label">Transcript</div>
              <div className="transcript-text">
                &quot;For accessibility, I always try to think about it from the beginning rather than treating it as an
                afterthought. During the early wireframing stages, I make sure we have a clear hierarchy and semantic
                structure.
                <br />
                <br />
                When moving to high-fidelity, I use plugins like Stark in Figma to double-check color contrast ratios to ensure
                they meet WCAG AA standards. I also try to annotate my designs for developers, specifying focus states and ARIA
                labels so the handoff is smooth.&quot;
              </div>
            </div>
          </div>

          <div>
            <div className="eval-card">
              <div className="eval-header">
                <div className="eval-label">inro Evaluation</div>
                <div className="eval-score">
                  {score}/100
                </div>
              </div>

              <div className="eval-section-label green">Strengths</div>
              {strengths.slice(0, 2).map((s, i) => (
                <div key={i} className="eval-item">
                  <div className="eval-item-title">✓ {s.title}</div>
                  <div className="eval-item-desc">{s.desc}</div>
                  <div className="tag-row">
                    <div className="tag jd-tag">📋 Job requirement • Role alignment</div>
                    <div className="tag resume-tag">📄 Resume evidence</div>
                  </div>
                </div>
              ))}

              <div className="eval-section-label terra" style={{ marginTop: 14 }}>
                Areas to Improve
              </div>
              {gaps.slice(0, 2).map((g, i) => (
                <div key={i} className="eval-item">
                  <div className="eval-item-title">⚠ {g.title}</div>
                  <div className="eval-item-desc">{g.mitigation}</div>
                  <div className="tag-row">
                    <div className="tag jd-tag">📋 Job requirement • Deeper coverage</div>
                    <div className="tag warn-tag">⚠ Strengthen examples</div>
                  </div>
                </div>
              ))}

              <div className="traceability-note">
                <strong>Source traceability:</strong> Every insight is grounded in the original inputs so you can see which
                resume evidence and job requirements informed the evaluation.
              </div>
            </div>
          </div>
        </div>
        <div className="eval-footer">
          <Link href={`/sessions/${id}/practice`} className="btn-ghost">
            Retry Question
          </Link>
          <Link href={`/sessions/${id}`} className="btn-primary">
            Next Question →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
