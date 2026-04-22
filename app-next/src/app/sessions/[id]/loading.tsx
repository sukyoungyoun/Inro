import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";

export default async function SessionBriefLoading() {
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
  const mockInterviewHref = "/mock-interviews";
  const briefHref = first ? `/sessions/${first.id}` : "/sessions/new";

  return (
    <AppShell
      crumb="PREP SESSIONS"
      active="prep"
      userName={sidebarUserName}
      roleTitle="Role"
      roleCompany="Company"
      prepHref={prepHref}
      briefHref={briefHref}
      mockInterviewHref={mockInterviewHref}
      mobileTab="brief"
      contentFill
    >
      <div id="view-brief" className="view" aria-busy="true" aria-label="Loading role brief">
        <div className="brief-main">
          <div className="inro-skel" style={{ width: 120, height: 10, marginBottom: 14 }} />
          <div className="inro-skel" style={{ width: "min(520px, 90%)", height: 34, marginBottom: 12 }} />
          <div className="inro-skel brief-skel-box" />
          <div className="inro-skel brief-skel-line" style={{ marginTop: 24 }} />
          <div className="inro-skel brief-skel-line" />
          <div className="inro-skel brief-skel-line short" />
        </div>
        <aside className="brief-sidebar" aria-label="Loading prep lab" aria-busy="true">
          <div className="inro-skel" style={{ width: 100, height: 10, marginBottom: 16 }} />
          <div className="inro-skel brief-skel-line" />
          <div className="inro-skel brief-skel-line short" style={{ marginBottom: 20 }} />
          <div className="mock-q-row-skel" />
          <div className="mock-q-row-skel" />
          <div className="mock-q-row-skel" />
          <div className="mock-q-row-skel" />
        </aside>
      </div>
    </AppShell>
  );
}
