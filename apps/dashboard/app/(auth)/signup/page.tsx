"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
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
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Check your email to confirm, or sign in.");
    router.refresh();
    router.push("/signin");
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Create account</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Use the same account for FlipFeed if you like.</p>
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
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2.5 rounded-lg border bg-[var(--card)] border-white/10 text-[var(--text)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium bg-[var(--text)] text-[var(--bg)] disabled:opacity-50"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>{message}</p>}
      <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        Already have an account? <Link href="/signin" className="text-[var(--text)] underline">Sign in</Link>
      </p>
    </div>
  );
}
