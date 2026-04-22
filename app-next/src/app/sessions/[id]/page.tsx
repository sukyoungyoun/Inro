import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
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

  const [data, sidebarUserName] = await Promise.all([
    prisma.prepSession.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        title: true,
        company: true,
        matchScore: true,
        roleSummary: true,
        updatedAt: true,
        analysis: true,
        questions: { orderBy: { order: "asc" } },
      },
    }),
    getDisplayNameSourceForUser(session.user.id, session.user.email),
  ]);

  if (!data) notFound();

  const strengths =
    (data.analysis?.strengthsJson as Array<{ title: string; desc: string }> | null) || [];
  const gaps =
    (data.analysis?.gapsJson as Array<{ title: string; mitigation: string }> | null) || [];
  const fallbackSummary = [
    data.analysis?.strongestAlignment ? `Strongest alignment: ${data.analysis.strongestAlignment}` : "",
    data.analysis?.biggestRisk ? `Biggest risk: ${data.analysis.biggestRisk}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const summary =
    data.roleSummary?.trim() ||
    fallbackSummary ||
    "We could not generate a full role summary yet. Add richer JD and resume details, then rerun analysis.";

  const score = data.matchScore ?? 0;
  const rawMeta = data.analysis?.rawResponseJson as {
    usedFallbackAnalysis?: boolean;
    limitations?: string;
    evidenceSummary?: string;
  } | null;

  return (
    <AppShell
      crumb="PREP SESSIONS"
      active="prep"
      userName={sidebarUserName}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref="/sessions/new"
      briefHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      mobileTab="brief"
      contentFill
    >
      <SessionBriefClient
        key={data.updatedAt.toISOString()}
        id={data.id}
        sessionTitle={data.title}
        company={data.company || ""}
        score={score}
        roleSummary={summary}
        strengths={strengths}
        gaps={gaps}
        questions={data.questions.map((q) => ({ id: q.id, category: q.category, question: q.question, insight: q.insight }))}
        strongest={data.analysis?.strongestAlignment || ""}
        risk={data.analysis?.biggestRisk || ""}
        usedFallback={Boolean(rawMeta?.usedFallbackAnalysis)}
        limitations={typeof rawMeta?.limitations === "string" ? rawMeta.limitations : ""}
        evidenceSummary={typeof rawMeta?.evidenceSummary === "string" ? rawMeta.evidenceSummary : ""}
      />
    </AppShell>
  );
}
