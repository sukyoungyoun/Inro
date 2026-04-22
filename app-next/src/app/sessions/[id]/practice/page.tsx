import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
import { AppShell } from "@/components/app-shell";
import { MockInterviewLiveView } from "@/components/mock-interview-live-view";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [data, sidebarUserName] = await Promise.all([
    prisma.prepSession.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        title: true,
        company: true,
        questions: { orderBy: { order: "asc" } },
      },
    }),
    getDisplayNameSourceForUser(session.user.id, session.user.email),
  ]);
  if (!data) notFound();
  const requestedIndex = Math.max(0, Number(sp.q || 0) || 0);
  const safeIndex = Math.min(requestedIndex, Math.max(0, data.questions.length - 1));
  const q = data.questions[safeIndex];
  const qCategory = q?.category || "Priority Question";
  const qQuestion = q?.question || "No question found.";
  const qInsight =
    q?.insight || "Assesses how you structure examples and connect them to the role brief.";

  return (
    <AppShell
      crumb="MOCK INTERVIEW"
      active="mock"
      userName={sidebarUserName}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref="/sessions/new"
      briefHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      mobileTab="prep"
      contentFill
    >
      <MockInterviewLiveView
        sessionId={id}
        category={qCategory}
        question={qQuestion}
        insight={qInsight}
        initialTextMode={sp.mode === "text"}
        questionIndex={safeIndex}
        totalQuestions={data.questions.length}
        questionId={q?.id ?? ""}
      />
    </AppShell>
  );
}
