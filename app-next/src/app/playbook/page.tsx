import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userProfilePublicSelect } from "@/lib/user-profile-public-select";
import { AppShell } from "@/components/app-shell";
import { PlaybookClient } from "@/components/playbook-client";

function readWeakestModule(gapsJson: unknown): string {
  if (!Array.isArray(gapsJson)) return "Quantified outcomes";
  for (const item of gapsJson) {
    const title = String((item as { title?: string })?.title || "").trim();
    if (title) return title;
  }
  return "Quantified outcomes";
}

export default async function PlaybookPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  async function loadPlaybookData() {
    const profilePromise = prisma.userProfile.findUnique({
      where: { userId },
      select: userProfilePublicSelect,
    });

    try {
      const [profile, latestSession] = await Promise.all([
        profilePromise,
        prisma.prepSession.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            matchScore: true,
            prepFeedback: true,
            recruitingNextSteps: true,
            analysis: {
              select: {
                biggestRisk: true,
                gapsJson: true,
              },
            },
          },
        }),
      ]);
      return { profile, latestSession };
    } catch {
      // Backward-compat path for lagging production schemas missing optional columns.
      const [profile, latestSession] = await Promise.all([
        profilePromise,
        prisma.prepSession.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            matchScore: true,
            analysis: {
              select: {
                biggestRisk: true,
                gapsJson: true,
              },
            },
          },
        }),
      ]);
      return {
        profile,
        latestSession: latestSession
          ? {
              ...latestSession,
              prepFeedback: null,
              recruitingNextSteps: null,
            }
          : null,
      };
    }
  }

  const { profile, latestSession } = await loadPlaybookData();

  if (!profile || profile.targetRoles.length === 0) redirect("/onboarding");

  const weakestModule = readWeakestModule(latestSession?.analysis?.gapsJson);
  const biggestRisk = latestSession?.analysis?.biggestRisk || "Needs stronger interview examples";
  const feedback = [latestSession?.prepFeedback || "", latestSession?.recruitingNextSteps || ""]
    .filter(Boolean)
    .join(" ");

  const readinessScore = Math.max(0, Math.min(100, Number(latestSession?.matchScore || 0)));
  const targetRole = latestSession?.title || profile.targetRoles[0] || "UX Design Analyst";

  return (
    <AppShell
      crumb="PLAYBOOK"
      active="playbook"
      userName={profile.fullName || session.user.email || "User"}
      showRoleSwitcher={false}
      prepHref={latestSession ? `/sessions/${latestSession.id}` : "/sessions/new"}
      briefHref={latestSession ? `/sessions/${latestSession.id}` : "/sessions/new"}
      mockInterviewHref="/mock-interviews"
      mobileTab="home"
    >
      <PlaybookClient
        userId={session.user.id}
        weakestModule={weakestModule}
        biggestRiskArea={`${biggestRisk}${feedback ? `. Session feedback: ${feedback}` : ""}`}
        targetRole={targetRole}
        readinessScore={readinessScore}
      />
    </AppShell>
  );
}
