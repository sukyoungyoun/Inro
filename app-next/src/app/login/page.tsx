"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("/");
  const router = useRouter();

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setCallbackUrl(search.get("callbackUrl") || "/");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email/password.");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <main className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-default)] p-8 shadow-[var(--sh)]">
        <p className="inro-serif text-[22px] leading-none mb-6">inro</p>
        <p className="inro-mono text-[10px] tracking-[1.2px] uppercase text-[var(--text-tertiary)] mb-3">Account Access</p>
        <h1 className="text-3xl inro-serif text-[var(--text-primary)] mb-2">Welcome back</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Sign in to continue your prep cycle.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
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
            placeholder="Password"
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-[var(--text-secondary)] mt-4">
          New here?{" "}
          <Link href="/signup" className="underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}

