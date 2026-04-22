import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Placeholder: per-category question regeneration (wire to Gemini / analyze pipeline later). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await ctx.params;
    const owned = await prisma.prepSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as { category?: string };
    const category = String(body.category || "").trim();
    if (!category) {
      return NextResponse.json({ error: "category required" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: `Regenerate for "${category}" is queued. Full pipeline integration coming soon.`,
    });
  } catch {
    return NextResponse.json({ error: "Regenerate failed" }, { status: 500 });
  }
}
