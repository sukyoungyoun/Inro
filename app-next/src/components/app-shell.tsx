import Link from "next/link";
import { ReactNode } from "react";
import {
  IconMock,
  IconOverview,
  IconPrefs,
  IconPrep,
  IconResume,
} from "@/components/inro-nav-icons";

export type AppShellNavKey = "overview" | "prep" | "mock" | "resume" | "prefs";

export function AppShell({
  children,
  crumb,
  active = "overview",
  userName = "User",
  roleTitle = "Role",
  roleCompany = "Company",
  prepHref = "/sessions/new",
  mockInterviewHref = "/sessions/new",
  contentFill = false,
}: {
  children: ReactNode;
  crumb: string;
  active?: AppShellNavKey;
  userName?: string;
  roleTitle?: string;
  roleCompany?: string;
  /** Sidebar “Prep Sessions” target */
  prepHref?: string;
  /** Sidebar “Mock Interviews” target */
  mockInterviewHref?: string;
  /** Brief / practice / eval: #content gets height chain for full views */
  contentFill?: boolean;
}) {
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div id="app">
      <aside id="sidebar">
        <div className="logo">inro</div>
        <Link href="/dashboard" className="role-switcher">
          <div className="role-switcher-info">
            <div className="role-switcher-title">{roleTitle}</div>
            <div className="role-switcher-company">{roleCompany}</div>
          </div>
          <div className="role-switcher-arrow" aria-hidden>
            ⌄
          </div>
        </Link>

        <div className="nav-section">
          <NavBtn href="/dashboard" active={active === "overview"} label="Overview">
            <IconOverview />
          </NavBtn>
          <NavBtn href={prepHref} active={active === "prep"} label="Prep Sessions">
            <IconPrep />
          </NavBtn>
          <NavBtn href={mockInterviewHref} active={active === "mock"} label="Mock Interviews">
            <IconMock />
          </NavBtn>
        </div>

        <div className="nav-section" style={{ marginTop: 0 }}>
          <div className="nav-label">Workspace</div>
          <NavBtn href="/resume" active={active === "resume"} label="Resume Library">
            <IconResume />
          </NavBtn>
          <NavBtn href="/preferences" active={active === "prefs"} label="Preferences">
            <IconPrefs />
          </NavBtn>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{initials}</div>
          <div className="avatar-name">{userName}</div>
        </div>
      </aside>

      <div id="main">
        <div id="topbar">
          INRO &nbsp;•&nbsp; <span>{crumb}</span>
        </div>
        <div id="content" className={contentFill ? "inro-content-fill" : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`nav-btn${active ? " active" : ""}`}>
      {children}
      {label}
    </Link>
  );
}
