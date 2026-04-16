"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="border border-[#E0D8D0] bg-white rounded-[10px] px-4 py-2"
    >
      Sign out
    </button>
  );
}
