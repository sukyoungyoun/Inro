import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
import { AppShell } from "@/components/app-shell";
import { MockInterviewHub } from "@/components/mock-interview-hub";
import { MockInterviewLiveView } from "@/components/mock-interview-live-view";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; q?: string | string[] }>;
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

  const qRaw = sp.q;
  const qParam = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const liveMode = qParam !== undefined && qParam !== "";

  const hubQuestions = data.questions.map((row) => ({
    id: row.id,
    category: row.category,
    question: row.question,
    insight: row.insight ?? null,
  }));

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
      {liveMode ? (
        <PracticeLive
          sessionId={id}
          questions={data.questions}
          qParam={qParam!}
          modeText={sp.mode === "text"}
        />
      ) : (
        <MockInterviewHub
          sessionId={id}
          roleTitle={data.title}
          roleCompany={data.company || "Company"}
          questions={hubQuestions}
        />
      )}
    </AppShell>
  );
}

function PracticeLive({
  sessionId,
  questions,
  qParam,
  modeText,
}: {
  sessionId: string;
  questions: {
    id: string;
    category: string;
    question: string;
    insight: string | null;
  }[];
  qParam: string;
  modeText: boolean;
}) {
  const requestedIndex = Math.max(0, Number(qParam) || 0);
  const safeIndex = Math.min(requestedIndex, Math.max(0, questions.length - 1));
  const q = questions[safeIndex];
  const qCategory = q?.category || "Priority Question";
  const qQuestion = q?.question || "No question found.";
  const qInsight =
    q?.insight || "Assesses how you structure examples and connect them to the role brief.";

  return (
    <MockInterviewLiveView
      sessionId={sessionId}
      category={qCategory}
      question={qQuestion}
      insight={qInsight}
      initialTextMode={modeText}
      questionIndex={safeIndex}
      totalQuestions={questions.length}
      questionId={q?.id ?? ""}
    />
  );
}
