import { prisma } from "@/lib/prisma";

function capitalizeWord(s: string) {
  const t = s.trim();
  if (!t) return "User";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * Derives a first-name style label for the sidebar from profile full name,
 * "Last, First" style strings, or an email local-part fallback.
 */
export function toFirstNameForSidebar(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "User";

  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    const afterComma = trimmed.slice(commaIdx + 1).trim();
    if (afterComma) {
      const firstToken = afterComma.split(/\s+/).filter(Boolean)[0] || afterComma;
      return capitalizeWord(firstToken);
    }
  }

  const source = trimmed.includes("@") ? (trimmed.split("@")[0] || "").trim() : trimmed;
  const cleaned = source.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
  if (!cleaned) return "User";
  const firstToken = cleaned.split(/\s+/).filter(Boolean)[0] || cleaned;
  return capitalizeWord(firstToken);
}

/** Prefer saved profile name so the shell matches across routes. */
export async function getDisplayNameSourceForUser(userId: string, email: string | null | undefined) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { fullName: true },
  });
  const fromProfile = profile?.fullName?.trim();
  if (fromProfile) return fromProfile;
  return (email || "").trim() || "User";
}
