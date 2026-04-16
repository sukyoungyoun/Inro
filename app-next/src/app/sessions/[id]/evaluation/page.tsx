import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await prisma.prepSession.findFirst({
    where: { id, userId: session.user.id },
    include: { analysis: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!data) notFound();

  const strengths =
    (data.analysis?.strengthsJson as Array<{ title: string; desc: string }> | null) || [];
  const gaps =
    (data.analysis?.gapsJson as Array<{ title: string; mitigation: string }> | null) || [];
  const q = data.questions[0];
  const score = Math.min(100, Math.max(45, (data.matchScore ?? 70) - 3));

  return (
    <AppShell
      crumb="PREP EVALUATION"
      active="mock"
      userName={session.user.email || "User"}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
    >
      <div className="p-8 max-w-6xl">
        <Link href={`/sessions/${id}`} className="text-sm text-[#5C5248] hover:text-[#1C1917]">← Back to Prep Sessions</Link>
        <div className="grid md:grid-cols-[1fr_340px] gap-5 mt-4">
          <div className="space-y-4">
            <div className="inro-card p-6">
              <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84] mb-2">{(q?.category || "Priority Question").toUpperCase()}</p>
              <h1 className="text-[24px] inro-serif text-[#1C1917] mb-2">{q?.question || "Question"}</h1>
              <p className="text-sm text-[#5C5248]">{q?.insight || "Evaluation summary based on your brief and answer structure."}</p>
            </div>
            <div className="inro-card p-6">
              <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#3D6B50] mb-3">Strengths</p>
              <div className="space-y-2">
                {strengths.slice(0, 2).map((s, i) => (
                  <div key={i} className="border border-[#E0D8D0] rounded-[8px] p-3">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-[#5C5248] mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="inro-card p-6">
              <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#8B5E52] mb-3">Areas to Improve</p>
              <div className="space-y-2">
                {gaps.slice(0, 2).map((g, i) => (
                  <div key={i} className="border border-[#E0D8D0] rounded-[8px] p-3">
                    <p className="font-semibold text-sm">{g.title}</p>
                    <p className="text-xs text-[#5C5248] mt-1">{g.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="inro-card p-5 text-center">
              <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84]">Practice Score</p>
              <p className="text-[44px] inro-serif text-[#3D6B50] leading-none mt-2">{score}</p>
              <p className="text-xs text-[#9C8E84] mt-1">out of 100</p>
            </div>
            <div className="inro-card p-5">
              <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84] mb-2">Next Step</p>
              <p className="text-sm text-[#5C5248] mb-3">Retry this question with a tighter structure and role-specific impact metrics.</p>
              <div className="space-y-2">
                <Link href={`/sessions/${id}/practice`} className="inro-btn-ghost block text-center">Retry Question</Link>
                <Link href={`/sessions/${id}`} className="inro-btn-primary block text-center">Return to Brief</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

