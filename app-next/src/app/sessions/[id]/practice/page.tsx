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

          <div className="border border-[#E0D8D0] rounded-[10px] p-5 bg-white">
            <p className="inro-mono text-[10px] tracking-[1px] uppercase text-[#9C8E84] mb-2">Your live response</p>
            <p className="text-sm text-[#5C5248] mb-3">
              Use this screen as your mock station. Speak for 1-2 minutes and then self-submit for evaluation.
            </p>
            <textarea className="inro-textarea min-h-[160px]" placeholder="Optional notes or draft answer..." />
            <div className="flex justify-between mt-4">
              <Link href={`/sessions/${id}`} className="inro-btn-ghost">Skip for now</Link>
              <Link href={`/sessions/${id}/evaluation`} className="inro-btn-primary">Submit for feedback</Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

