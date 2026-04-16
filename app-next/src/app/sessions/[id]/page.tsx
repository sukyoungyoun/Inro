import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await prisma.prepSession.findFirst({
    where: { id, userId: session.user.id },
    include: {
      analysis: true,
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!data) notFound();

  const strengths =
    (data.analysis?.strengthsJson as Array<{ title: string; desc: string }> | null) || [];
  const gaps =
    (data.analysis?.gapsJson as Array<{ title: string; mitigation: string }> | null) || [];

  return (
    <AppShell
      crumb="PREP SESSIONS"
      active="prep"
      userName={session.user.email || "User"}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      rightRail={
        <div className="p-5">
          <h3 className="text-xs tracking-widest uppercase text-[#9C8E84] mb-3">Recommended questions</h3>
          <div className="space-y-3">
            {data.questions.map((q) => (
              <div key={q.id} className="border border-[#E0D8D0] rounded-[8px] p-3">
                <p className="text-xs uppercase text-[#9C8E84]">{q.category}</p>
                <p className="text-sm font-medium mt-1">{q.question}</p>
                {q.insight && <p className="text-xs text-[#5C5248] mt-2">{q.insight}</p>}
              </div>
            ))}
          </div>
          <Link
            href="/sessions/new"
            className="mt-4 inline-block w-full text-center bg-[#1C1917] text-white rounded-[8px] py-2"
          >
            Start another cycle
          </Link>
        </div>
      }
    >
      <div className="p-8 max-w-6xl">
        <section className="bg-white border border-[#E0D8D0] rounded-[10px] p-8 shadow-[var(--sh)]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs tracking-widest uppercase text-[#9C8E84]">Role overview</p>
              <h1 className="text-4xl font-serif text-[#1C1917] mt-1">{data.title}</h1>
              <p className="text-sm text-[#5C5248] mt-1">
                {data.company || "Company"} • {data.stage || "Stage not set"}
              </p>
            </div>
            <div className="bg-[#EAF2EC] text-[#3D6B50] px-4 py-2 rounded-full font-medium">
              {data.matchScore ?? 0}% Match
            </div>
          </div>

          <div className="border border-[#E0D8D0] rounded-lg p-4 mb-4">
            <h2 className="font-semibold mb-2">Role Summary</h2>
            <p className="text-sm text-[#5C5248]">{data.roleSummary || "No summary yet."}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="border border-[#E0D8D0] rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-1">Strongest Alignment</h3>
              <p className="text-sm text-[#5C5248]">{data.analysis?.strongestAlignment || "—"}</p>
            </div>
            <div className="border border-[#E0D8D0] rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-1">Biggest Risk Area</h3>
              <p className="text-sm text-[#5C5248]">{data.analysis?.biggestRisk || "—"}</p>
            </div>
          </div>

          <h3 className="text-xs tracking-widest uppercase text-[#9C8E84] mb-2">Top strengths</h3>
          <div className="space-y-2 mb-6">
            {strengths.map((s, i) => (
              <div key={i} className="border border-[#E0D8D0] rounded-lg p-3">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-[#5C5248] mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          <h3 className="text-xs tracking-widest uppercase text-[#9C8E84] mb-2">Critical gaps</h3>
          <div className="space-y-2">
            {gaps.map((g, i) => (
              <div key={i} className="border border-[#E0D8D0] rounded-lg p-3">
                <p className="font-medium">{g.title}</p>
                <p className="text-sm text-[#5C5248] mt-1">{g.mitigation}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

