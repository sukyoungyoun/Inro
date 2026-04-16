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
    <main className="min-h-screen bg-[#F2EDE8] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white border border-[#E0D8D0] p-8">
        <h1 className="text-3xl font-serif text-[#1C1917] mb-2">Welcome back</h1>
        <p className="text-sm text-[#5C5248] mb-6">Sign in to continue your prep cycle.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1C1917] text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-[#5C5248] mt-4">
          New here?{" "}
          <Link href="/signup" className="underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}

