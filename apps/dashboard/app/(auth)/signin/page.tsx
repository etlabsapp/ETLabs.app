"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    router.refresh();
    router.push(next);
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>ET Labs Dashboard</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Sign in to track downloads and manage apps.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 rounded-lg border bg-[var(--card)] border-white/10 text-[var(--text)] placeholder-[var(--muted)]"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2.5 rounded-lg border bg-[var(--card)] border-white/10 text-[var(--text)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium bg-[var(--text)] text-[var(--bg)] disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-red-400">{message}</p>}
      <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        No account? <Link href="/signup" className="text-[var(--text)] underline">Sign up</Link>
      </p>
    </div>
  );
}
