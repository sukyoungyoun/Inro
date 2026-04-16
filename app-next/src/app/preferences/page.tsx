import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { PreferencesForm } from "@/components/preferences-form";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <AppShell
      crumb="PREFERENCES"
      active="prefs"
      userName={profile?.fullName || session.user.email || "User"}
      roleTitle={profile?.currentRole || profile?.targetRoles?.[0] || "Role"}
      roleCompany="Workspace"
    >
      <div className="p-9 max-w-[760px]">
        <p className="text-sm text-[#9C8E84] mb-2">Workspace › Preferences</p>
        <h1 className="text-[30px] inro-serif text-[#1C1917] mb-5">Preferences</h1>
        <PreferencesForm
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

