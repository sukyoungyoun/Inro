import { InterviewStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadUserProfileFormSnapshot } from "@/lib/load-user-profile-form-snapshot";

const FOCUS_STAGE_VALUES = new Set<string>(Object.values(InterviewStage));

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await loadUserProfileFormSnapshot(session.user.id);
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
  const interviewFocusKeys = Array.isArray(body.interviewFocusKeys)
    ? (body.interviewFocusKeys as unknown[])
        .map((x) => String(x).trim())
        .filter((k): k is string => FOCUS_STAGE_VALUES.has(k))
    : [];
  const targetStage: InterviewStage | null =
    interviewFocusKeys.length > 0
      ? (interviewFocusKeys[0] as InterviewStage)
      : body.targetStage && FOCUS_STAGE_VALUES.has(String(body.targetStage))
        ? (String(body.targetStage) as InterviewStage)
        : null;

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: {
      fullName: fullName || null,
      currentRole: currentRole || null,
      targetRoles,
      targetStage,
      interviewFocusKeys,
    },
    create: {
      userId: session.user.id,
      fullName: fullName || null,
      currentRole: currentRole || null,
      targetRoles,
      targetStage,
      interviewFocusKeys,
    },
  });

  return NextResponse.json({ profile });
}

