import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { WaveformBars } from "@/components/waveform-bars";

export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await prisma.prepSession.findFirst({
    where: { id, userId: session.user.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!data) notFound();
  const q = data.questions[0];

  return (
    <AppShell
      crumb="MOCK INTERVIEW"
      active="mock"
      userName={session.user.email || "User"}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      contentFill
    >
      <div id="view-practice" className="view">
        <div className="practice-topbar">
          <Link href={`/sessions/${id}`} className="back-btn">
            ← Back to Prep Sessions
          </Link>
        </div>
        <div className="practice-body">
          <div className="practice-left">
            <div className="q-header">
              <div className="q-eyebrow">{(q?.category || "Priority Question").toUpperCase()}</div>
              <div className="q-title">{q?.question || "No question found."}</div>
              <div className="insight-bar">
                <span className="insight-icon">💡</span>
                <div>
                  <strong>Insight:</strong>{" "}
                  <span>
                    {q?.insight ||
                      "Assesses how you structure examples and connect them to the role brief."}
                  </span>
                </div>
              </div>
            </div>
            <div className="recording-card">
              <div className="rec-header">
                <div className="rec-label">Your Live Response</div>
                <div className="rec-status">
                  <div className="rec-dot" />
                  Recording Now
                </div>
              </div>
              <div className="timer-wrap">
                <div className="timer-ring">
                  <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
                    <circle className="bg" cx="60" cy="60" r="52" />
                    <circle
                      className="prog"
                      cx="60"
                      cy="60"
                      r="52"
                      strokeDasharray="327"
                      strokeDashoffset="245"
                    />
                  </svg>
                  <div className="timer-center">
                    <div className="timer-elapsed">Elapsed</div>
                    <div className="timer-time">01:18</div>
                  </div>
                </div>
              </div>
              <div className="rec-hint">
                Speak naturally and structure your answer with a clear point of view, one concrete example, and how you
                collaborate with engineering or research to make accessibility real.
              </div>
              <div className="waveform-section">
                <div className="waveform-row">
                  <div className="waveform-label">Mic Input</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink3)" }}>Live transcript on</div>
                </div>
                <WaveformBars />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="transcript-label">Live Transcript</div>
                <div className="live-transcript">
                  &quot;I try to build accessibility in from the earliest planning stage by checking hierarchy, keyboard
                  behavior, and contrast before the UI gets too polished. One example was…&quot;
                </div>
              </div>
              <div className="rec-controls">
                <button type="button" className="rec-btn">
                  Restart
                </button>
                <button type="button" className="rec-btn">
                  Pause
                </button>
                <Link href={`/sessions/${id}/evaluation`} className="rec-btn finish">
                  Finish Answer
                </Link>
              </div>
            </div>
          </div>
          <div className="practice-right">
            <div className="coaching-card">
              <div className="coaching-header">
                <div className="coaching-label">Answer Coaching</div>
                <div className="coaching-target">Target 1–2 min</div>
              </div>
              <div className="coaching-item">
                <div className="coaching-icon">○</div>
                <div className="coaching-text">
                  <strong>Start with principle:</strong> Explain that accessibility is part of product quality, not a final
                  checklist.
                </div>
              </div>
              <div className="coaching-item">
                <div className="coaching-icon">☰</div>
                <div className="coaching-text">
                  <strong>Add one workflow example:</strong> Mention audits, semantic structure, annotations, or design QA in
                  handoff.
                </div>
              </div>
              <div className="coaching-item">
                <div className="coaching-icon">◎</div>
                <div className="coaching-text">
                  <strong>Close with collaboration:</strong> Reference partnering with engineers, PMs, or research to validate
                  decisions.
                </div>
              </div>
            </div>
            <div className="structure-card">
              <div className="structure-header">
                <div className="structure-label">Suggested Structure</div>
                <div className="structure-note">3-part answer</div>
              </div>
              <div className="structure-item">
                <div className="structure-num">1</div>
                <div>
                  <div className="structure-title">Mindset</div>
                  <div className="structure-desc">Accessibility is considered from discovery and wireframes, not after launch.</div>
                </div>
              </div>
              <div className="structure-item">
                <div className="structure-num">2</div>
                <div>
                  <div className="structure-title">Example</div>
                  <div className="structure-desc">Share a project where you checked contrast, focus order, or screen reader behavior.</div>
                </div>
              </div>
              <div className="structure-item">
                <div className="structure-num">3</div>
                <div>
                  <div className="structure-title">Outcome</div>
                  <div className="structure-desc">Explain what improved for users or how it changed collaboration and quality.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="practice-footer">
          <Link href={`/sessions/${id}`} className="footer-skip">
            Skip for Now
          </Link>
          <Link href={`/sessions/${id}/evaluation`} className="footer-submit">
            Submit for Feedback →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
