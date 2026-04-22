import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { toFirstNameForSidebar } from "@/lib/user-display-name";
import { DashboardSessionCard } from "@/components/dashboard-session-card";

function formatSessionTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function cleanRoleTitle(raw: string) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Untitled role";
  return trimmed
    .replace(/\.(pdf|docx|txt)$/i, "")
    .replace(/\s+copy$/i, "")
    .trim();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const sp = await searchParams;
  const showArchived = sp.archived === "1";

  type DashboardSession = {
    id: string;
    title: string;
    company: string | null;
    matchScore: number | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    recruitingOutcome: string | null;
    recruitingNextSteps: string | null;
  };

  async function loadDashboardData() {
    try {
      const [profile, activeSessions, archivedSessions, archivedCount] = await Promise.all([
        prisma.userProfile.findUnique({ where: { userId } }),
        prisma.prepSession.findMany({
          where: { userId, archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            company: true,
            matchScore: true,
            createdAt: true,
            updatedAt: true,
            archivedAt: true,
            recruitingOutcome: true,
            recruitingNextSteps: true,
          },
        }),
        showArchived
          ? prisma.prepSession.findMany({
              where: { userId, archivedAt: { not: null } },
              orderBy: { archivedAt: "desc" },
              take: 20,
              select: {
                id: true,
                title: true,
                company: true,
                matchScore: true,
                createdAt: true,
                updatedAt: true,
                archivedAt: true,
                recruitingOutcome: true,
                recruitingNextSteps: true,
              },
            })
          : Promise.resolve([]),
        prisma.prepSession.count({
          where: { userId, archivedAt: { not: null } },
        }),
      ]);

      return {
        profile,
        activeSessions: activeSessions as DashboardSession[],
        archivedSessions: archivedSessions as DashboardSession[],
        archivedCount,
      };
    } catch {
      // Backward-compat path: production DB may lag Prisma schema (e.g. missing archived fields).
      // Keep dashboard usable with legacy session shape until migrations are applied.
      const [profile, legacySessions] = await Promise.all([
        prisma.userProfile.findUnique({ where: { userId } }),
        prisma.prepSession.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            company: true,
            matchScore: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      const normalized = legacySessions.map((s) => ({
        ...s,
        archivedAt: null,
        recruitingOutcome: null,
        recruitingNextSteps: null,
      }));

      return {
        profile,
        activeSessions: normalized,
        archivedSessions: [] as DashboardSession[],
        archivedCount: 0,
      };
    }
  }

  const { profile, activeSessions, archivedSessions, archivedCount } = await loadDashboardData();

  if (!profile || profile.targetRoles.length === 0) redirect("/onboarding");

  const listSessions = showArchived ? archivedSessions : activeSessions.slice(0, 3);

  const avgScore =
    activeSessions.length > 0
      ? Math.round(
          activeSessions.reduce((sum, s) => sum + (s.matchScore ?? 0), 0) / activeSessions.length
        )
      : 0;

  const first = activeSessions[0];
  const prepHref = first ? `/sessions/${first.id}` : "/sessions/new";
  const mockInterviewHref = "/mock-interviews";
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
      topbarActions={
        <>
          <Link href="/sessions/new" className="topbar-new-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M7 2v10M2 7h10" />
            </svg>
            New Prep Session
          </Link>
        </>
      }
    >
      <div id="view-overview" className="view">
        <div className="overview-header">
          <div>
            <h1>Welcome back, {displayName}</h1>
            <p>
              You have {activeSessions.length} active prep session{activeSessions.length === 1 ? "" : "s"}
              {archivedCount > 0 ? ` (${archivedCount} archived)` : ""}. Continue where you left off or start a new role
              brief.
            </p>
          </div>
          <div />
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
            <div className="stat-num">{activeSessions.length}</div>
            <div className="stat-sub">Good volume to compare your role fit across options.</div>
            <div className="metric-delta good">↑ Keep weekly cadence at 2 sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Mock Interviews</div>
            <div className="stat-num">{Math.max(0, activeSessions.length * 3)}</div>
            <div className="stat-sub">Strong practice volume. Focus on specific weak spots next.</div>
            <div className="metric-delta gap">↑ Weak area: quantified outcomes</div>
          </div>
        </div>

        <div className="sessions-header">
          <h3>{showArchived ? "Archived Sessions" : "Recent Sessions"}</h3>
          <div className="sessions-header-links">
            {archivedCount > 0 ? (
              <Link href={showArchived ? "/dashboard" : "/dashboard?archived=1"} className="view-all">
                {showArchived ? "Back to active" : `Archived (${archivedCount})`}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="sessions-grid">
          {listSessions.length === 0 ? (
            <div className="inro-empty-state">
              <svg width="88" height="56" viewBox="0 0 88 56" fill="none" aria-hidden>
                <rect x="1" y="1" width="86" height="54" rx="10" stroke="var(--border2)" />
                <path d="M16 38h56M16 30h40M16 22h26" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="session-role">{showArchived ? "No archived sessions" : "No sessions yet"}</div>
              <div className="session-company">
                {showArchived
                  ? "Archive a session using Archive session on an active prep card."
                  : "Start your first prep session to see your readiness score."}
              </div>
              {!showArchived ? (
                <Link href="/sessions/new" className="btn-primary">
                  New Prep Session
                </Link>
              ) : null}
            </div>
          ) : (
            listSessions.map((s) => (
              <DashboardSessionCard
                key={`${s.id}-${s.updatedAt.toISOString()}`}
                id={s.id}
                title={s.title}
                company={s.company}
                matchScore={s.matchScore}
                archivedAtIso={s.archivedAt?.toISOString() ?? null}
                recruitingOutcome={s.recruitingOutcome}
                recruitingNextSteps={s.recruitingNextSteps}
                prepFeedback={null}
                timeLabel={formatSessionTime(s.createdAt)}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
