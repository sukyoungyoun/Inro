import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userProfilePublicSelect } from "@/lib/user-profile-public-select";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: userProfilePublicSelect,
  });

  if (!profile || profile.targetRoles.length === 0) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
