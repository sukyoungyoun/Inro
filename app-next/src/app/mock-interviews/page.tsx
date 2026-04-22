import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";

async function resolveLatestPracticeSessionId(userId: string): Promise<string | null> {
  try {
    const row = await prisma.prepSession.findFirst({
      where: { userId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch {
    const row = await prisma.prepSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}

export default async function MockInterviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const [sidebarUserName, prepSessionId] = await Promise.all([
    getDisplayNameSourceForUser(userId, session.user.email),
    resolveLatestPracticeSessionId(userId),
  ]);

  if (prepSessionId) {
    redirect(`/sessions/${prepSessionId}/practice`);
  }

  const prepHref = "/sessions/new";
  const briefHref = "/sessions/new";

  return (
    <AppShell
      crumb="MOCK INTERVIEWS"
      active="mock"
      userName={sidebarUserName}
      roleTitle="Mock interviews"
      roleCompany="Get started"
      prepHref={prepHref}
      briefHref={briefHref}
      mockInterviewHref="/mock-interviews"
      mobileTab="prep"
      contentFill
    >
      <div id="view-mock-landing" className="view mock-interviews-empty">
        <div className="mock-interviews-empty-inner">
          <h1 className="mock-interviews-empty-title">Start with a prep session</h1>
          <p className="mock-interviews-empty-copy">
            Mock interviews use questions from your analyzed resume and job description. Create a prep session first,
            then you&apos;ll land in practice automatically.
          </p>
          <div className="mock-interviews-empty-actions">
            <Link href="/sessions/new" className="btn-primary">
              New prep session
            </Link>
            <Link href="/dashboard" className="btn-ghost">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
