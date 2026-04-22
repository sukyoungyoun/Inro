"use client";

import { useEffect, useState } from "react";

export function SidebarUserBadge({
  firstName,
  initial,
}: {
  firstName: string;
  initial: string;
}) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("inro-avatar-preview");
    if (saved) setAvatarPreview(saved);
  }, []);

  return (
    <>
      <div className="avatar">{avatarPreview ? <img src={avatarPreview} alt="Profile" className="avatar-img" /> : initial}</div>
      <div className="avatar-name">{firstName}</div>
    </>
  );
}
