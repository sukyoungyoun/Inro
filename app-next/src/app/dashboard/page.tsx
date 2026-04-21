import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { toFirstNameForSidebar } from "@/lib/user-display-name";

function formatSessionTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}M AGO`;
  if (h < 24) return `${h}H AGO`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  return `${days}D AGO`;
}

function cleanRoleTitle(raw: string) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Untitled role";
  return trimmed
    .replace(/\.(pdf|docx|txt)$/i, "")
    .replace(/\s+copy$/i, "")
    .trim();
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
  const displayName = toFirstNameForSidebar(profile.fullName || session.user.email || "");
  const weakest = avgScore < 65 ? "specificity gap" : "systems examples";

  return (
    <AppShell
      crumb="OVERVIEW"
      active="overview"
      userName={profile.fullName || session.user.email || "User"}
      showRoleSwitcher={false}
      prepHref={prepHref}
      briefHref={prepHref}
      mockInterviewHref={mockInterviewHref}
      mobileTab="home"
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
            <div className={`metric-delta ${avgScore >= 65 ? "good" : "gap"}`}>
              {avgScore >= 65 ? "↑ Strong momentum in storytelling clarity" : `↑ Your weakest category: ${weakest}`}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Preps</div>
            <div className="stat-num">{sessions.length}</div>
            <div className="stat-sub">Good volume to compare your role fit across options.</div>
            <div className="metric-delta good">↑ Keep weekly cadence at 2 sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Mock Interviews</div>
            <div className="stat-num">{Math.max(0, sessions.length * 3)}</div>
            <div className="stat-sub">Strong practice volume. Focus on specific weak spots next.</div>
            <div className="metric-delta gap">↑ Weak area: quantified outcomes</div>
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
            <div className="inro-empty-state">
              <svg width="88" height="56" viewBox="0 0 88 56" fill="none" aria-hidden>
                <rect x="1" y="1" width="86" height="54" rx="10" stroke="var(--border2)" />
                <path d="M16 38h56M16 30h40M16 22h26" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="session-role">No sessions yet</div>
              <div className="session-company">Start your first prep session to see your readiness score.</div>
              <Link href="/sessions/new" className="btn-primary">
                New Prep Session
              </Link>
            </div>
          ) : (
            sessions.slice(0, 3).map((s) => {
              const score = s.matchScore ?? 0;
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
                    <div className="session-role">{cleanRoleTitle(s.title)}</div>
                    <div className="session-time">{formatSessionTime(s.createdAt)}</div>
                  </div>
                  <div className="session-company">
                    <strong>Role:</strong> {cleanRoleTitle(s.title)}
                  </div>
                  <div className="session-company" style={{ marginTop: -6 }}>
                    <strong>Company:</strong> {s.company || "Not set"}
                  </div>
                  <div className="match-row">
                    <div className="match-badge accent">{badgeLabel}</div>
                    <div className="match-bar">
                      <div
                        className={`match-fill${score < 78 ? " mid" : ""}`}
                        style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
                      />
                    </div>
                  </div>
                  <div className="session-modules">3/6 modules</div>
                  <div className="module-segments" aria-label="module completion segments">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <span key={idx} className={`module-segment${idx < 3 ? " done" : ""}`} />
                    ))}
                  </div>
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
