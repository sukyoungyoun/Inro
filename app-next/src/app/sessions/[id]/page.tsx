import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { SessionBriefClient } from "@/components/session-brief-client";

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

  const score = data.matchScore ?? 0;
  return (
    <AppShell
      crumb="PREP SESSIONS"
      active="prep"
      userName={session.user.email || "User"}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      contentFill
    >
      <SessionBriefClient
        id={data.id}
        score={score}
        roleSummary={data.roleSummary || "No summary yet."}
        strengths={strengths}
        gaps={gaps}
        questions={data.questions.map((q) => ({ id: q.id, category: q.category, question: q.question, insight: q.insight }))}
        strongest={data.analysis?.strongestAlignment || ""}
        risk={data.analysis?.biggestRisk || ""}
      />
    </AppShell>
  );
}
