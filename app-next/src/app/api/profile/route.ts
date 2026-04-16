import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const currentRole = String(body.currentRole || "").trim();
  const targetRoles = Array.isArray(body.targetRoles)
    ? body.targetRoles.map((x: string) => String(x).trim()).filter(Boolean)
    : [];
  const targetStage = body.targetStage || null;

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: {
      fullName: fullName || null,
      currentRole: currentRole || null,
      targetRoles,
      targetStage,
    },
    create: {
      userId: session.user.id,
      fullName: fullName || null,
      currentRole: currentRole || null,
      targetRoles,
      targetStage,
    },
  });

  return NextResponse.json({ profile });
}

