import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";

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
            <SignOutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Metric title="Avg. Readiness" value={`${avgScore}%`} sub="Almost ready. Focus on targeted practice modules." />
          <Metric title="Active Preps" value={`${sessions.length}`} sub="Good volume to compare your role fit across options." />
          <Metric title="Mock Interviews" value={`${Math.max(0, sessions.length * 3)}`} sub="Strong practice volume. Focus on specific weak spots next." />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[10px] tracking-[1.2px] uppercase text-[#9C8E84] inro-mono">
            Recent sessions
          </h2>
          <button className="text-xs text-[#8B5E52]">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <div className="inro-card p-5 text-[#5C5248] text-sm">No sessions yet. Create your first one.</div>
          ) : (
            sessions.slice(0, 3).map((s) => {
              const score = s.matchScore ?? 0;
              const badge =
                score >= 78
                  ? { label: "Strong Fit", cls: "bg-[#D4E8DA] text-[#3D6B50]" }
                  : score >= 65
                    ? { label: "Needs Review", cls: "bg-[#EDD5CE] text-[#8B5E52]" }
                    : { label: "Benchmark", cls: "bg-[#E8E4F0] text-[#5A4A7A]" };
              return (
                <Link
                  href={`/sessions/${s.id}`}
                  key={s.id}
                  className="inro-card p-5 hover:-translate-y-[1px] transition"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[14px] font-semibold text-[#1C1917]">{s.title}</p>
                    <p className="text-[10px] text-[#9C8E84] inro-mono">RECENT</p>
                  </div>
                  <p className="text-xs text-[#9C8E84] mb-3">{s.company || "Company"}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-[#EAF2EC] text-[#3D6B50]">{score}% match</span>
                    <div className="h-1.5 rounded bg-[#E0D8D0] flex-1 overflow-hidden">
                      <div className="h-full bg-[#3D6B50]" style={{ width: `${Math.max(10, score)}%` }} />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9C8E84] mb-2">3/5 modules</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-1 rounded mb-2 ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <p className="text-xs text-[#5C5248] mb-3">
                    Best next step: practice systems-thinking stories tied to collaboration and product tradeoffs.
                  </p>
                  <div className="border border-[#E0D8D0] rounded-[8px] py-2 text-center text-[12px] text-[#5C5248]">
                    {score >= 70 ? "→ Continue Prep" : "⟳ Review Insights"}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-[#E0D8D0] rounded-[10px] p-5 shadow-[var(--sh)]">
      <p className="text-[9px] uppercase tracking-[1.2px] text-[#9C8E84] inro-mono">{title}</p>
      <p className="text-4xl inro-serif text-[#3D6B50] mt-1">{value}</p>
      <p className="text-xs text-[#5C5248] mt-1">{sub}</p>
    </div>
  );
}

