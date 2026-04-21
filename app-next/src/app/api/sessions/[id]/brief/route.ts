import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Strength = { title: string; desc: string };
type Gap = { title: string; mitigation: string };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await ctx.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Session id required." }, { status: 400 });
  }

  const owned = await prisma.prepSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await req.json()) as {
    title?: string;
    company?: string | null;
    matchScore?: number | null;
    roleSummary?: string | null;
    strongestAlignment?: string | null;
    biggestRisk?: string | null;
    strengths?: Strength[];
    gaps?: Gap[];
  };

  const title = body.title != null ? String(body.title).trim() : undefined;
  const company = body.company !== undefined ? (body.company == null ? null : String(body.company).trim()) : undefined;
  const roleSummary = body.roleSummary !== undefined ? (body.roleSummary == null ? null : String(body.roleSummary).trim()) : undefined;
  const strongestAlignment =
    body.strongestAlignment !== undefined
      ? body.strongestAlignment == null
        ? null
        : String(body.strongestAlignment).trim()
      : undefined;
  const biggestRisk =
    body.biggestRisk !== undefined ? (body.biggestRisk == null ? null : String(body.biggestRisk).trim()) : undefined;
  const matchScore =
    body.matchScore === undefined
      ? undefined
      : body.matchScore == null
        ? null
        : Math.min(100, Math.max(0, Math.round(Number(body.matchScore))));

  const strengths =
    body.strengths !== undefined
      ? body.strengths
          .map((s) => ({
            title: String(s.title || "").trim(),
            desc: String(s.desc || "").trim(),
          }))
          .filter((s) => s.title || s.desc)
      : undefined;

  const gaps =
    body.gaps !== undefined
      ? body.gaps
          .map((g) => ({
            title: String(g.title || "").trim(),
            mitigation: String(g.mitigation || "").trim(),
          }))
          .filter((g) => g.title || g.mitigation)
      : undefined;

  const hasAnalysisPatch =
    strongestAlignment !== undefined ||
    biggestRisk !== undefined ||
    strengths !== undefined ||
    gaps !== undefined;

  const sessionData = {
    ...(title !== undefined ? { title: title || "Untitled role" } : {}),
    ...(company !== undefined ? { company: company || null } : {}),
    ...(roleSummary !== undefined ? { roleSummary: roleSummary || "" } : {}),
    ...(matchScore !== undefined ? { matchScore } : {}),
  };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(sessionData).length > 0) {
      await tx.prepSession.update({
        where: { id: sessionId },
        data: sessionData,
      });
    } else if (hasAnalysisPatch) {
      const cur = await tx.prepSession.findUnique({
        where: { id: sessionId },
        select: { resumeText: true },
      });
      if (cur) {
        await tx.prepSession.update({
          where: { id: sessionId },
          data: { resumeText: cur.resumeText },
        });
      }
    }

    if (hasAnalysisPatch) {
      const existing = await tx.sessionAnalysis.findUnique({ where: { sessionId } });
      const data = {
        ...(strongestAlignment !== undefined ? { strongestAlignment } : {}),
        ...(biggestRisk !== undefined ? { biggestRisk } : {}),
        ...(strengths !== undefined ? { strengthsJson: strengths } : {}),
        ...(gaps !== undefined ? { gapsJson: gaps } : {}),
      };
      if (existing && Object.keys(data).length > 0) {
        await tx.sessionAnalysis.update({ where: { sessionId }, data });
      } else if (!existing) {
        await tx.sessionAnalysis.create({
          data: {
            sessionId,
            strongestAlignment: strongestAlignment ?? null,
            biggestRisk: biggestRisk ?? null,
            strengthsJson: strengths ?? [],
            gapsJson: gaps ?? [],
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
