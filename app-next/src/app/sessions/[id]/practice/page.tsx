import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
import { AppShell } from "@/components/app-shell";
import { MockInterviewLiveView } from "@/components/mock-interview-live-view";

export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
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
        questions: { orderBy: { order: "asc" } },
      },
    }),
    getDisplayNameSourceForUser(session.user.id, session.user.email),
  ]);
  if (!data) notFound();
  const q = data.questions[0];
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
      <MockInterviewLiveView sessionId={id} category={qCategory} question={qQuestion} insight={qInsight} />
    </AppShell>
  );
}
