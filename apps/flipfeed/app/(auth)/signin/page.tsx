"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "err", text: error.message });
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    router.refresh();
    router.push(next);
  }

  return (
    <div style={{ width: "100%", maxWidth: 360 }}>
      <h1 style={{ fontSize: "1.5rem", color: "#e8e6e3", marginBottom: 8 }}>
        Sign in to FlipFeed
      </h1>
      <p style={{ color: "#9c9892", marginBottom: 24, fontSize: "0.95rem" }}>
        Your board and widgets are saved to your account.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#222228",
            color: "#e8e6e3",
            fontSize: "1rem",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#222228",
            color: "#e8e6e3",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#e8e6e3",
            color: "#0d0d0f",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {message && (
        <p style={{ marginTop: 16, color: "#f87171", fontSize: "0.9rem" }}>
          {message.text}
        </p>
      )}
      <p style={{ marginTop: 24, color: "#9c9892", fontSize: "0.9rem" }}>
        No account?{" "}
        <Link href="/signup" style={{ color: "#e8e6e3", textDecoration: "underline" }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
