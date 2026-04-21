import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";

export default async function DashboardLoading() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [sidebarUserName, first] = await Promise.all([
    getDisplayNameSourceForUser(session.user.id, session.user.email),
    prisma.prepSession.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ]);
  const prepHref = first ? `/sessions/${first.id}` : "/sessions/new";
  const mockInterviewHref = first ? `/sessions/${first.id}/practice` : "/sessions/new";

  return (
    <AppShell
      crumb="OVERVIEW"
      active="overview"
      userName={sidebarUserName}
      showRoleSwitcher={false}
      prepHref={prepHref}
      briefHref={prepHref}
      mockInterviewHref={mockInterviewHref}
      mobileTab="home"
    >
      <div id="view-overview" className="view" aria-busy="true" aria-label="Loading overview">
        <div className="overview-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="inro-skel dash-skel-h1" />
            <div className="inro-skel dash-skel-p" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="inro-skel" style={{ width: 88, height: 40, borderRadius: 10 }} />
            <div className="inro-skel" style={{ width: 168, height: 40, borderRadius: 10 }} />
          </div>
        </div>
        <div className="stats-grid">
          <div className="inro-skel dash-skel-stat" />
          <div className="inro-skel dash-skel-stat" />
          <div className="inro-skel dash-skel-stat" />
        </div>
        <div className="sessions-header" style={{ marginTop: 8 }}>
          <div className="inro-skel" style={{ width: 140, height: 12 }} />
          <div className="inro-skel" style={{ width: 72, height: 12 }} />
        </div>
        <div className="sessions-grid">
          <div className="inro-skel dash-skel-card" />
          <div className="inro-skel dash-skel-card" />
          <div className="inro-skel dash-skel-card" />
        </div>
      </div>
    </AppShell>
  );
}
