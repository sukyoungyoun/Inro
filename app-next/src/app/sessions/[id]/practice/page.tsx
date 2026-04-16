import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await prisma.prepSession.findFirst({
    where: { id, userId: session.user.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!data) notFound();
  const q = data.questions[0];

  return (
    <AppShell
      crumb="PREP EVALUATION"
      active="mock"
      userName={session.user.email || "User"}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      rightRail={
        <div className="p-5 space-y-4">
          <div className="inro-card p-4">
            <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84] mb-2">Answer Coaching</p>
            <p className="text-sm text-[#5C5248]">Start with principle, add one specific example, then close with outcome.</p>
          </div>
          <div className="inro-card p-4 bg-[#F5E8E4] border-[#EDD5CE]">
            <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#8B5E52] mb-2">Suggested Structure</p>
            <ol className="text-sm text-[#5C5248] space-y-1">
              <li>1. Mindset</li>
              <li>2. Example</li>
              <li>3. Outcome</li>
            </ol>
          </div>
        </div>
      }
    >
      <div className="p-8 max-w-5xl">
        <Link href={`/sessions/${id}`} className="text-sm text-[#5C5248] hover:text-[#1C1917]">← Back to Prep Sessions</Link>
        <div className="inro-card p-7 mt-4">
          <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84] mb-3">
            {(q?.category || "Priority Question").toUpperCase()}
          </p>
          <h1 className="text-[28px] inro-serif text-[#1C1917] mb-3">{q?.question || "No question found."}</h1>
          <p className="text-sm text-[#5C5248] mb-5">
            {q?.insight || "Practice your response with concrete examples tied to the role brief."}
          </p>

          <div className="grid md:grid-cols-[1fr_320px] gap-4">
            <div className="border border-[#E0D8D0] rounded-[10px] p-5 bg-white">
              <div className="flex items-center justify-between mb-4">
                <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84]">Your live response</p>
                <span className="text-[11px] bg-[#F5E8E4] text-[#8B5E52] px-2 py-1 rounded-full">Recording Now</span>
              </div>
              <div className="h-[160px] flex items-center justify-center border border-[#E0D8D0] rounded-[10px] mb-4 bg-[#F8F5F3]">
                <div className="text-center">
                  <p className="inro-mono text-[9px] tracking-[1px] text-[#9C8E84]">Elapsed</p>
                  <p className="inro-serif text-[44px] text-[#1C1917] leading-none">01:18</p>
                </div>
              </div>
              <p className="text-sm text-[#5C5248] mb-3 text-center">
                Speak naturally and structure your answer with a clear point of view, one concrete example, and how you collaborate with engineering.
              </p>
              <div className="border border-[#E0D8D0] rounded-[8px] p-3 mb-3 bg-[#F8F5F3]">
                <p className="inro-mono text-[9px] tracking-[1px] text-[#9C8E84] mb-2">Mic Input</p>
                <div className="h-8 rounded bg-[#E0D8D0]" />
            </div>
              <textarea className="inro-textarea min-h-[90px]" placeholder="Live transcript appears here..." />
            </div>
            <div className="space-y-4">
              <div className="inro-card p-4">
                <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84] mb-2">Answer Coaching</p>
                <p className="text-sm text-[#5C5248] mb-2"><strong>Start with principle:</strong> Explain that accessibility is part of product quality.</p>
                <p className="text-sm text-[#5C5248] mb-2"><strong>Add one workflow example:</strong> Mention audits and annotations.</p>
                <p className="text-sm text-[#5C5248]"><strong>Close with collaboration:</strong> Reference engineers and PMs.</p>
              </div>
              <div className="inro-card p-4 bg-[#F5E8E4] border-[#EDD5CE]">
                <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#8B5E52] mb-2">Suggested Structure</p>
                <ol className="text-sm text-[#5C5248] space-y-1">
                  <li>1. Mindset</li>
                  <li>2. Example</li>
                  <li>3. Outcome</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <Link href={`/sessions/${id}`} className="inro-btn-ghost">Skip for now</Link>
            <Link href={`/sessions/${id}/evaluation`} className="inro-btn-primary">Submit for feedback →</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

