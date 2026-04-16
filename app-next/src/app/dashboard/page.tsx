import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";

function formatSessionTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}M AGO`;
  if (h < 24) return `${h}H AGO`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  return `${days}D AGO`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, sessions] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.prepSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  if (!profile || profile.targetRoles.length === 0) redirect("/onboarding");

  const avgScore =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + (s.matchScore ?? 0), 0) / sessions.length
        )
      : 0;

  const first = sessions[0];
  const prepHref = first ? `/sessions/${first.id}` : "/sessions/new";
  const mockInterviewHref = first ? `/sessions/${first.id}/practice` : "/sessions/new";
  const displayName = profile.fullName || session.user.email || "there";

  return (
    <AppShell
      crumb="OVERVIEW"
      active="overview"
      userName={profile.fullName || session.user.email || "User"}
      roleTitle={profile.currentRole || profile.targetRoles[0] || "Role"}
      roleCompany={first?.company || "Company"}
      prepHref={prepHref}
      mockInterviewHref={mockInterviewHref}
    >
      <div id="view-overview" className="view">
        <div className="overview-header">
          <div>
            <h1>Welcome back, {displayName}</h1>
            <p>
              You have {sessions.length} prep session{sessions.length === 1 ? "" : "s"} on record. Continue
              where you left off or start a new role brief.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SignOutButton />
            <Link href="/sessions/new" className="btn-new">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M7 2v10M2 7h10" />
              </svg>
              New Prep Session
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Avg. Readiness</div>
            <div className="stat-num">{avgScore}%</div>
            <div className="stat-sub">Almost ready. Focus on targeted practice modules.</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Preps</div>
            <div className="stat-num">{sessions.length}</div>
            <div className="stat-sub">Good volume to compare your role fit across options.</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Mock Interviews</div>
            <div className="stat-num">{Math.max(0, sessions.length * 3)}</div>
            <div className="stat-sub">Strong practice volume. Focus on specific weak spots next.</div>
          </div>
        </div>

        <div className="sessions-header">
          <h3>Recent Sessions</h3>
          <button type="button" className="view-all">
            View All
          </button>
        </div>
        <div className="sessions-grid">
          {sessions.length === 0 ? (
            <div className="session-card">
              <div className="session-role">No sessions yet</div>
              <div className="session-company">Create your first prep session to see fit scores and next steps.</div>
              <Link href="/sessions/new" className="session-action">
                → Start setup
              </Link>
            </div>
          ) : (
            sessions.slice(0, 3).map((s) => {
              const score = s.matchScore ?? 0;
              const badgeClass = score >= 78 ? "high" : score >= 65 ? "mid" : "low";
              const badgeLabel = `${score}% match`;
              const status =
                score >= 78
                  ? { cls: "strong", label: "Strong Fit" }
                  : score >= 65
                    ? { cls: "review", label: "Needs Review" }
                    : { cls: "bench", label: "Benchmark" };
              return (
                <Link key={s.id} href={`/sessions/${s.id}`} className="session-card">
                  <div className="session-card-top">
                    <div className="session-role">{s.title}</div>
                    <div className="session-time">{formatSessionTime(s.createdAt)}</div>
                  </div>
                  <div className="session-company">{s.company || "Company"}</div>
                  <div className="match-row">
                    <div className={`match-badge ${badgeClass}`}>{badgeLabel}</div>
                    <div className="match-bar">
                      <div
                        className={`match-fill${score < 78 ? " mid" : ""}`}
                        style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
                      />
                    </div>
                  </div>
                  <div className="session-modules">3/5 modules</div>
                  <div className={`status-tag ${status.cls}`}>{status.label}</div>
                  <div className="session-next">
                    Best next step: open your brief and run a targeted practice block on your highest-impact gap.
                  </div>
                  <span className="session-action">
                    {score >= 70 ? "→ Continue Prep" : "⟳ Review Insights"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
