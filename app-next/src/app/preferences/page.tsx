import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { PreferencesForm } from "@/components/preferences-form";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  const prepSessions = await prisma.prepSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { id: true, company: true },
  });
  const first = prepSessions[0];
  const prepHref = first ? `/sessions/${first.id}` : "/sessions/new";
  const mockInterviewHref = first ? `/sessions/${first.id}/practice` : "/sessions/new";

  return (
    <AppShell
      crumb="PREFERENCES"
      active="prefs"
      userName={profile?.fullName || session.user.email || "User"}
      roleTitle={profile?.currentRole || profile?.targetRoles?.[0] || "Role"}
      roleCompany={first?.company || "Workspace"}
      prepHref={prepHref}
      briefHref={prepHref}
      mockInterviewHref={mockInterviewHref}
      mobileTab="role"
      showRoleSwitcher={false}
      contentFill
      topbarActions={<SignOutButton />}
    >
      <div
        id="view-preferences"
        className="view"
        style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <PreferencesForm
          userEmail={session.user.email || ""}
          initial={{
            fullName: profile?.fullName || "",
            currentRole: profile?.currentRole || "",
            targetRoles: profile?.targetRoles || [],
            targetStage: profile?.targetStage || "",
          }}
        />
      </div>
    </AppShell>
  );
}
