import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

function DocIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <rect x="2" y="1" width="16" height="22" rx="2" />
      <path d="M6 7h8M6 11h8M6 15h5" />
    </svg>
  );
}

function TailoredIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="var(--terra)" strokeWidth="1.5" aria-hidden>
      <rect x="1" y="1" width="16" height="20" rx="2" />
      <path d="M5 6h8M5 10h8M5 14h5" />
    </svg>
  );
}

export default async function ResumeLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, sessions] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.prepSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, company: true, createdAt: true, resumeText: true },
    }),
  ]);

  const primary = sessions[0];
  const first = sessions[0];
  const prepHref = first ? `/sessions/${first.id}` : "/sessions/new";
  const mockInterviewHref = first ? `/sessions/${first.id}/practice` : "/sessions/new";

  return (
    <AppShell
      crumb="RESUME LIBRARY"
      active="resume"
      userName={profile?.fullName || session.user.email || "User"}
      roleTitle={profile?.currentRole || profile?.targetRoles[0] || "Role"}
      roleCompany={sessions[0]?.company || "Company"}
      prepHref={prepHref}
      mockInterviewHref={mockInterviewHref}
    >
      <div id="view-resume" className="view">
        <div className="rl-header">
          <div>
            <h1>Resume Library</h1>
            <p>Manage your base resume and tailored versions to get the most accurate fit insights for your target roles.</p>
          </div>
          <button type="button" className="btn-upload">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M7 10V3M4 6l3-3 3 3" />
              <path d="M2 11h10" />
            </svg>
            Upload Resume
          </button>
        </div>

        <div className="rl-section-label">Primary Base Resume</div>
        <div className="primary-resume-card">
          <div className="resume-icon">
            <DocIcon />
          </div>
          <div className="resume-info">
            <div className="resume-name">
              {primary ? "base_resume.txt" : "No resume uploaded yet"}
              {primary ? <span className="primary-badge">Primary Base</span> : null}
            </div>
            <div className="resume-meta">
              {primary
                ? `Used in latest session: ${primary.title}`
                : "Create a prep session to store your first resume input."}
            </div>
          </div>
          <div className="resume-actions">
            <button type="button" className="btn-preview">
              Preview
            </button>
            <button type="button" className="btn-update">
              Update
            </button>
          </div>
        </div>

        <div className="rl-section-label">Tailored Resumes</div>
        <div className="tailored-grid">
          {sessions.length === 0 ? (
            <div className="tailored-card">
              <div className="tailored-name">No tailored versions yet</div>
              <div className="tailored-meta">Start a prep session to generate tailored resume context.</div>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="tailored-card">
                <div className="tailored-card-top">
                  <div className="tailored-icon">
                    <TailoredIcon />
                  </div>
                  <button type="button" className="more-btn" aria-label="More">
                    ···
                  </button>
                </div>
                <div className="tailored-name">{s.title}</div>
                <div className="tailored-meta">{s.company || "Company not set"}</div>
                <div className="tailored-tags">
                  {(s.company ? [s.company] : []).map((t) => (
                    <span key={t} className="tailored-tag">
                      {t}
                    </span>
                  ))}
                  <span className="tailored-tag">Session</span>
                </div>
                <div className="tailored-actions">
                  <button type="button">Preview</button>
                  <Link href={`/sessions/${s.id}`}>View Sessions</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
