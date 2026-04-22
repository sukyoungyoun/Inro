"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="theme-toggle"
      aria-label="Sign out"
    >
      <span className="theme-toggle-label">Sign out</span>
    </button>
  );
}
