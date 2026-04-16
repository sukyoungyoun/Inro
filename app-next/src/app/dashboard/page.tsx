import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

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

  return (
    <AppShell
      crumb="OVERVIEW"
      active="overview"
      userName={profile.fullName || session.user.email || "User"}
      roleTitle={profile.currentRole || profile.targetRoles[0] || "Role"}
      roleCompany={sessions[0]?.company || "Company"}
    >
      <div className="p-9 max-w-[1100px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[32px] leading-tight font-serif text-[#1C1917]">
              Welcome back, {profile.fullName || session.user.email}
            </h1>
            <p className="text-[#5C5248] mt-2">
              Build a full cycle from role intake to practice and evaluation.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/sessions/new" className="bg-[#1C1917] text-white rounded-[10px] px-4 py-2 font-medium">
              New Prep Session
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="border border-[#E0D8D0] bg-white rounded-[10px] px-4 py-2">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Metric title="Avg Match Score" value={`${avgScore}%`} />
          <Metric title="Active Sessions" value={`${sessions.length}`} />
          <Metric title="Target Roles" value={`${profile.targetRoles.length}`} />
        </div>

        <div className="bg-white border border-[#E0D8D0] rounded-[10px] p-5 shadow-[var(--sh)]">
          <h2 className="text-sm tracking-widest uppercase text-[#9C8E84] mb-3">
            Recent sessions
          </h2>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-[#5C5248]">No sessions yet. Create your first one.</p>
            ) : (
              sessions.map((s) => (
                <Link
                  href={`/sessions/${s.id}`}
                  key={s.id}
                  className="block border border-[#E0D8D0] rounded-[8px] p-4 hover:bg-[#F8F5F3]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1C1917]">{s.title}</p>
                      <p className="text-sm text-[#5C5248]">
                        {s.company || "Company not set"} • {s.status}
                      </p>
                    </div>
                    <div className="text-xl font-serif text-[#3D6B50]">
                      {s.matchScore ?? 0}%
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border border-[#E0D8D0] rounded-[10px] p-5 shadow-[var(--sh)]">
      <p className="text-xs uppercase tracking-widest text-[#9C8E84]">{title}</p>
      <p className="text-4xl font-serif text-[#3D6B50] mt-2">{value}</p>
    </div>
  );
}

