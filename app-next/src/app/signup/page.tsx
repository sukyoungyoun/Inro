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
    <main className="min-h-screen bg-[#F2EDE8] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white border border-[#E0D8D0] p-8">
        <h1 className="text-3xl font-serif text-[#1C1917] mb-2">Create account</h1>
        <p className="text-sm text-[#5C5248] mb-6">Start your full interview prep lifecycle.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Full name"
            className="w-full border border-[#E0D8D0] rounded-lg px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
            placeholder="Password (min 8)"
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
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-[#5C5248] mt-4">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

