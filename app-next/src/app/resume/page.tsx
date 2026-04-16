import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function ResumeLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, sessions] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.prepSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, company: true, createdAt: true, resumeText: true },
    }),
  ]);

  const primary = sessions[0];
  const initials =
    profile?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U";

  return (
    <AppShell
      crumb="RESUME LIBRARY"
      active="resume"
      userName={profile?.fullName || session.user.email || "User"}
      roleTitle={profile?.currentRole || profile?.targetRoles[0] || "Role"}
      roleCompany={sessions[0]?.company || "Company"}
    >
      <div className="p-9 max-w-[1120px]">
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-[30px] inro-serif text-[#1C1917]">Resume Library</h1>
            <p className="text-sm text-[#5C5248] mt-2">
              Manage your base resume and tailored versions across prep sessions.
            </p>
          </div>
          <button className="inro-btn-primary">Upload Resume</button>
        </div>

        <p className="inro-mono text-[10px] tracking-[1.2px] uppercase text-[#9C8E84] mb-3">Primary Base Resume</p>
        <div className="inro-card p-5 mb-8 flex items-center gap-4">
          <div className="w-11 h-11 rounded-[9px] bg-[#F5E8E4] text-[#8B5E52] flex items-center justify-center font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[#1C1917]">
              {primary ? "base_resume.txt" : "No resume uploaded yet"}
            </p>
            <p className="text-xs text-[#9C8E84] mt-1">
              {primary
                ? `Used in latest session: ${primary.title}`
                : "Create a prep session to store your first resume input."}
            </p>
          </div>
          <button className="inro-btn-ghost">Preview</button>
        </div>

        <p className="inro-mono text-[10px] tracking-[1.2px] uppercase text-[#9C8E84] mb-3">Tailored Resumes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <div className="inro-card p-5 text-sm text-[#5C5248]">No tailored versions yet.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="inro-card p-5">
                <p className="font-semibold text-[#1C1917]">{s.title}</p>
                <p className="text-xs text-[#9C8E84] mt-1">{s.company || "Company not set"}</p>
                <p className="text-xs text-[#5C5248] mt-3 line-clamp-3">{s.resumeText.slice(0, 170)}...</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

