import Link from "next/link";
import { ReactNode } from "react";

type NavKey = "overview" | "prep" | "mock" | "resume" | "prefs";

export function AppShell({
  children,
  crumb,
  active = "overview",
  userName = "User",
  roleTitle = "Role",
  roleCompany = "Company",
  rightRail,
}: {
  children: ReactNode;
  crumb: string;
  active?: NavKey;
  userName?: string;
  roleTitle?: string;
  roleCompany?: string;
  rightRail?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] font-sans">
      <div className="flex min-h-screen">
        <aside className="w-[220px] min-w-[220px] bg-[var(--panel)] border-r border-[var(--border)] flex flex-col">
          <div className="px-5 pt-5 pb-4 font-serif text-[18px] font-semibold">inro</div>
          <div className="mx-3 mb-4 bg-white border border-[var(--border)] rounded-[10px] px-3 py-2">
            <div className="text-[13px] font-semibold">{roleTitle}</div>
            <div className="text-[11px] text-[var(--ink3)]">{roleCompany}</div>
          </div>

          <div className="px-3 mb-4">
            <NavItem href="/dashboard" active={active === "overview"} label="Overview" />
            <NavItem href="/sessions/new" active={active === "prep"} label="Prep Sessions" />
            <NavItem href="/sessions/new" active={active === "mock"} label="Mock Interviews" />
          </div>

          <div className="px-3 mb-4">
            <div className="text-[9px] tracking-[1.2px] uppercase text-[var(--ink3)] px-1 mb-1">Workspace</div>
            <NavItem href="/dashboard" active={active === "resume"} label="Resume Library" />
            <NavItem href="/onboarding" active={active === "prefs"} label="Preferences" />
          </div>

          <div className="mt-auto border-t border-[var(--border)] px-5 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--terra-tag)] text-[var(--terra)] flex items-center justify-center text-[11px] font-semibold">
              {userName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("") || "U"}
            </div>
            <div className="text-[12px] text-[var(--ink2)]">{userName}</div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="h-[42px] border-b border-[var(--border)] px-7 flex items-center font-mono text-[10px] tracking-[1px] text-[var(--ink3)]">
            INRO &nbsp;•&nbsp; {crumb}
          </div>
          <div className={`flex-1 overflow-hidden ${rightRail ? "grid grid-cols-[1fr_340px]" : ""}`}>
            <div className="overflow-y-auto">{children}</div>
            {rightRail ? <aside className="bg-white border-l border-[var(--border)] overflow-y-auto">{rightRail}</aside> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  const icons: Record<string, string> = {
    Overview: "◫",
    "Prep Sessions": "≡",
    "Mock Interviews": "◎",
    "Resume Library": "▦",
    Preferences: "⚙",
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 text-[13px] rounded-[8px] px-[10px] py-[9px] mb-0.5 transition ${
        active
          ? "bg-white text-[var(--terra)] font-semibold shadow-[var(--sh)]"
          : "text-[var(--ink2)] hover:bg-white/50 hover:text-[var(--ink)]"
      }`}
    >
      <span className="text-[11px] opacity-70">{icons[label] || "•"}</span>
      {label}
    </Link>
  );
}

