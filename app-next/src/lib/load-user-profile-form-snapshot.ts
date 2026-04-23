import { Prisma, type InterviewStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userProfilePublicSelect } from "@/lib/user-profile-public-select";

export type UserProfileFormSnapshot = {
  id: string;
  userId: string;
  fullName: string | null;
  currentRole: string | null;
  targetRoles: string[];
  targetStage: InterviewStage | null;
  interviewFocusKeys: string[];
};

/**
 * Loads profile fields for forms. Uses a full row when the DB has all columns; on P2022
 * (missing column, e.g. lagging migration) falls back to a narrow select.
 */
export async function loadUserProfileFormSnapshot(
  userId: string,
): Promise<UserProfileFormSnapshot | null> {
  try {
    const row = await prisma.userProfile.findUnique({ where: { userId } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      fullName: row.fullName,
      currentRole: row.currentRole,
      targetRoles: row.targetRoles,
      targetStage: row.targetStage,
      interviewFocusKeys:
        row.interviewFocusKeys.length > 0
          ? [...row.interviewFocusKeys]
          : row.targetStage
            ? [row.targetStage]
            : [],
    };
  } catch (e) {
    const missingColumn =
      (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") ||
      (e instanceof Error && /interviewFocusKeys|column .* does not exist/i.test(e.message));
    if (!missingColumn) {
      throw e;
    }
    const row = await prisma.userProfile.findUnique({
      where: { userId },
      select: userProfilePublicSelect,
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      fullName: row.fullName,
      currentRole: row.currentRole,
      targetRoles: row.targetRoles,
      targetStage: row.targetStage,
      interviewFocusKeys: row.targetStage ? [row.targetStage] : [],
    };
  }
}
