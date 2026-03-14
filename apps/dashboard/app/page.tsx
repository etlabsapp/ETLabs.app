import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardHome from "./DashboardHome";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text)" }}>ET Labs Dashboard</h1>
        <p className="mb-6" style={{ color: "var(--muted)" }}>Track App Store downloads for SleepTight and your other apps.</p>
        <Link
          href="/signin"
          className="px-5 py-2.5 rounded-lg font-medium bg-[var(--text)] text-[var(--bg)]"
        >
          Sign in
        </Link>
      </div>
    );
  }
  return <DashboardHome />;
}
