"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not create account.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-default)] p-8 shadow-[var(--sh)]">
        <p className="inro-serif text-[22px] leading-none mb-6">inro</p>
        <p className="inro-mono text-[10px] tracking-[1.2px] uppercase text-[var(--text-tertiary)] mb-3">Account Setup</p>
        <h1 className="text-3xl inro-serif text-[var(--text-primary)] mb-2">Create account</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Start your full interview prep lifecycle.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Full name"
            className="inro-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="inro-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 8)"
            className="inro-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inro-btn-primary w-full"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-[var(--text-secondary)] mt-4">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

