"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "err", text: error.message });
      return;
    }
    setMessage({ type: "ok", text: "Check your email to confirm, or sign in below." });
    router.refresh();
    router.push("/settings");
  }

  return (
    <div style={{ width: "100%", maxWidth: 360 }}>
      <h1 style={{ fontSize: "1.5rem", color: "#e8e6e3", marginBottom: 8 }}>
        Create your FlipFeed
      </h1>
      <p style={{ color: "#9c9892", marginBottom: 24, fontSize: "0.95rem" }}>
        Sign up to save your widgets and board.
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
          minLength={6}
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
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
      {message && (
        <p
          style={{
            marginTop: 16,
            color: message.type === "err" ? "#f87171" : "#9c9892",
            fontSize: "0.9rem",
          }}
        >
          {message.text}
        </p>
      )}
      <p style={{ marginTop: 24, color: "#9c9892", fontSize: "0.9rem" }}>
        Already have an account?{" "}
        <Link href="/signin" style={{ color: "#e8e6e3", textDecoration: "underline" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
