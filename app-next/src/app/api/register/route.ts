import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json();
    const cleanEmail = String(email || "").toLowerCase().trim();
    const cleanPassword = String(password || "");
    const cleanName = String(fullName || "").trim();

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const passwordHash = await hash(cleanPassword, 12);
    let user: { id: string; email: string };
    try {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          profile: {
            create: {
              fullName: cleanName || null,
              targetRoles: [],
            },
          },
        },
        select: { id: true, email: true },
      });
    } catch (e) {
      const missingColumn =
        (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") ||
        (e instanceof Error && /interviewFocusKeys|column .* does not exist/i.test(e.message));
      if (!missingColumn) throw e;

      // Schema drift fallback: create user first, then insert a minimal UserProfile row
      // without touching newer columns that may not exist yet.
      user = await prisma.user.create({
        data: { email: cleanEmail, passwordHash },
        select: { id: true, email: true },
      });

      const profileId = randomUUID();
      try {
        await prisma.$executeRaw`
          INSERT INTO "UserProfile" ("id", "userId", "fullName", "targetRoles", "createdAt", "updatedAt")
          VALUES (${profileId}, ${user.id}, ${cleanName || null}, ARRAY[]::text[], now(), now())
          ON CONFLICT ("userId") DO NOTHING
        `;
      } catch (rawErr) {
        const missingAuditCols =
          rawErr instanceof Error && /column \"createdAt\"|column \"updatedAt\"/i.test(rawErr.message);
        if (!missingAuditCols) throw rawErr;
        // Older DB: no createdAt/updatedAt columns on UserProfile
        await prisma.$executeRaw`
          INSERT INTO "UserProfile" ("id", "userId", "fullName", "targetRoles")
          VALUES (${profileId}, ${user.id}, ${cleanName || null}, ARRAY[]::text[])
          ON CONFLICT ("userId") DO NOTHING
        `;
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

