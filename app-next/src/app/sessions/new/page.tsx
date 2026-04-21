import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
import { NewSessionClient } from "./new-session-client";

export default async function NewSessionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sidebarUserName = await getDisplayNameSourceForUser(session.user.id, session.user.email);
  return <NewSessionClient sidebarUserName={sidebarUserName} />;
}
