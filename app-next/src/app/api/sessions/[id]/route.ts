import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Session id required." }, { status: 400 });

    const body = (await req.json()) as {
      archived?: boolean;
      recruitingOutcome?: string | null;
      recruitingNextSteps?: string | null;
      prepFeedback?: string | null;
      title?: string;
      company?: string | null;
    };

    const owned = await prisma.prepSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    const data: {
      archivedAt?: Date | null;
      recruitingOutcome?: string | null;
      recruitingNextSteps?: string | null;
      prepFeedback?: string | null;
      title?: string;
      company?: string | null;
    } = {};

    if (body.archived !== undefined) {
      data.archivedAt = body.archived ? new Date() : null;
    }
    if (body.recruitingOutcome !== undefined) {
      const v = body.recruitingOutcome == null ? null : String(body.recruitingOutcome).trim();
      data.recruitingOutcome = v || null;
    }
    if (body.recruitingNextSteps !== undefined) {
      const v = body.recruitingNextSteps == null ? null : String(body.recruitingNextSteps).trim();
      data.recruitingNextSteps = v || null;
    }
    if (body.prepFeedback !== undefined) {
      const v = body.prepFeedback == null ? null : String(body.prepFeedback).trim();
      data.prepFeedback = v || null;
    }
    if (body.title !== undefined) {
      const v = String(body.title || "").trim();
      data.title = v || "Untitled role";
    }
    if (body.company !== undefined) {
      data.company = body.company == null ? null : String(body.company).trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    await prisma.prepSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Session id required." }, { status: 400 });

    const owned = await prisma.prepSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.sessionQuestion.deleteMany({ where: { sessionId: id } });
      await tx.sessionAnalysis.deleteMany({ where: { sessionId: id } });
      // Use deleteMany for schema-drift tolerance (avoids delete() return-shape coupling).
      await tx.prepSession.deleteMany({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
