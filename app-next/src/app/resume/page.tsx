import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { TailoredResumeCard } from "@/components/tailored-resume-card";
import { PrimaryResumeActions } from "@/components/primary-resume-actions";

function DocIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <rect x="2" y="1" width="16" height="22" rx="2" />
      <path d="M6 7h8M6 11h8M6 15h5" />
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
  const mockInterviewHref = "/mock-interviews";

  return (
    <AppShell
      crumb="RESUME LIBRARY"
      active="resume"
      userName={profile?.fullName || session.user.email || "User"}
      roleTitle={profile?.currentRole || profile?.targetRoles[0] || "Role"}
      roleCompany={sessions[0]?.company || "Company"}
      prepHref={prepHref}
      briefHref={prepHref}
      mockInterviewHref={mockInterviewHref}
      mobileTab="role"
      showRoleSwitcher={false}
    >
      <div id="view-resume" className="view">
        <div className="rl-header">
          <div>
            <h1>Resume Library</h1>
            <p>Manage your base resume and tailored versions to get the most accurate fit insights for your target roles.</p>
          </div>
          <button type="button" className="btn-upload" disabled>
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
          <PrimaryResumeActions sessionId={primary?.id || null} resumeText={primary?.resumeText || ""} />
        </div>

        <div className="rl-section-label">Tailored Resumes</div>
        <div className="tailored-grid">
          {sessions.length === 0 ? (
            <div className="tailored-card">
              <div className="tailored-name">No tailored versions yet</div>
              <div className="tailored-meta">Start a prep session to generate tailored resume context.</div>
            </div>
          ) : (
            sessions.map((s) => <TailoredResumeCard key={s.id} id={s.id} title={s.title} company={s.company} />)
          )}
        </div>
      </div>
    </AppShell>
  );
}
