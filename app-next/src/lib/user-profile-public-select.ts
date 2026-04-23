import type { Prisma } from "@prisma/client";

/**
 * Profile fields that do not require newer columns (e.g. `interviewFocusKeys`).
 * Use for server reads when production may lag Prisma migrations.
 */
export const userProfilePublicSelect = {
  id: true,
  userId: true,
  fullName: true,
  currentRole: true,
  targetRoles: true,
  targetStage: true,
} satisfies Prisma.UserProfileSelect;
