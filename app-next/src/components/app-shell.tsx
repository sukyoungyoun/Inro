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
type MobileTabKey = "home" | "role" | "brief" | "prep";

export function AppShell({
  children,
  crumb,
  active = "overview",
  userName = "User",
  roleTitle = "Role",
  roleCompany = "Company",
  prepHref = "/sessions/new",
  mockInterviewHref = "/sessions/new",
  briefHref = "/sessions/new",
  mobileTab = "home",
  showRoleSwitcher = true,
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
  /** Mobile “Brief” tab target */
  briefHref?: string;
  /** Mobile active tab */
  mobileTab?: MobileTabKey;
  /** Hide role selector card when not needed */
  showRoleSwitcher?: boolean;
  /** Brief / practice / eval: #content gets height chain for full views */
  contentFill?: boolean;
}) {
  const displayUserName = toDisplayName(userName);
  const initials =
    displayUserName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div id="app">
      <aside id="sidebar">
        <div className="logo">inro</div>
        {showRoleSwitcher ? (
          <details className="role-switcher">
            <summary className="role-switcher-trigger">
              <div className="role-switcher-info">
                <div className="role-switcher-title">{roleTitle}</div>
                <div className="role-switcher-company">{roleCompany}</div>
              </div>
              <div className="role-switcher-arrow" aria-hidden>
                ⌄
              </div>
            </summary>
            <div className="role-switcher-menu">
              <Link href="/dashboard" className="role-switcher-option">
                Choose role
              </Link>
              <Link href="/sessions/new" className="role-switcher-option">
                Add new role
              </Link>
            </div>
          </details>
        ) : (
          <div style={{ height: 10 }} />
        )}

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
          <div className="avatar-name">{displayUserName}</div>
        </div>
      </aside>

      <div id="main">
        <div id="topbar">
          <div className="mobile-wordmark" aria-hidden>
            inro
          </div>
          <div className="breadcrumb">
            <span>INRO</span> <span aria-hidden>&gt;</span> <span className="breadcrumb-current">{crumb}</span>
          </div>
        </div>
        <div id="content" className={contentFill ? "inro-content-fill" : undefined}>
          {children}
        </div>
      </div>
      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        <MobileTab href="/dashboard" label="Home" active={mobileTab === "home"}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 9.2L10 3l7 6.2V17H3V9.2Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </MobileTab>
        <MobileTab href={prepHref} label="Role" active={mobileTab === "role"}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </MobileTab>
        <MobileTab href={briefHref} label="Brief" active={mobileTab === "brief"}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="4" y="2.5" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 7.5H13M7 10.5H13M7 13.5H11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </MobileTab>
        <MobileTab href={mockInterviewHref} label="Prep" active={mobileTab === "prep"}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="8" y="3" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.5 9.5a4.5 4.5 0 009 0M10 14v3M7 17h6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </MobileTab>
      </nav>
    </div>
  );
}

function toDisplayName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "User";
  if (!trimmed.includes("@")) return trimmed;
  const local = trimmed.split("@")[0] || "";
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
  if (!cleaned) return "User";
  const first = cleaned.split(/\s+/)[0] || cleaned;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
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

function MobileTab({
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
    <Link href={href} className={`mobile-tab-item${active ? " active" : ""}`}>
      <span className="mobile-tab-dot" aria-hidden />
      {children}
      <small>{label}</small>
    </Link>
  );
}
