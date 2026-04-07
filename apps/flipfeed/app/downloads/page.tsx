import Link from "next/link";
import { redirect } from "next/navigation";
import { AppStoreUnitsBody } from "@/components/AppStoreUnitsBody";
import { loadUnitsForRecentDays } from "@/lib/appstore-sales";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const LOOKBACK = 14;

const navStyle = { marginBottom: "1.25rem", fontSize: "0.9rem" } as const;
const linkStyle = { color: "#e8e6e3", textDecoration: "underline" } as const;

export default async function DownloadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?next=/downloads");
  }

  const vendor = process.env.ASC_VENDOR_NUMBER?.trim();
  const appleId = process.env.ASC_APP_APPLE_ID?.trim() || undefined;

  if (!vendor) {
    return (
      <main style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={navStyle}>
          <Link href="/" style={linkStyle}>
            Board
          </Link>
          {" · "}
          <Link href="/settings" style={linkStyle}>
            Settings
          </Link>
        </p>
        <h1 style={{ fontSize: "1.5rem" }}>App Store units</h1>
        <p style={{ color: "#9c9892", marginTop: 12 }}>
          Set <code style={{ color: "#e8e6e3" }}>ASC_VENDOR_NUMBER</code> (and other{" "}
          <code style={{ color: "#e8e6e3" }}>ASC_*</code> keys) in Vercel, then redeploy.
        </p>
      </main>
    );
  }

  let rows: Awaited<ReturnType<typeof loadUnitsForRecentDays>>;
  let err: string | null = null;
  try {
    rows = await loadUnitsForRecentDays(LOOKBACK, vendor, appleId);
  } catch (e) {
    err = e instanceof Error ? e.message : "Could not load reports";
    rows = [];
  }

  const filterNote = appleId
    ? `App Apple ID ${appleId}`
    : "All apps in each daily file (set ASC_APP_APPLE_ID to filter)";

  const nav = (
    <p style={navStyle}>
      <Link href="/" style={linkStyle}>
        Board
      </Link>
      {" · "}
      <Link href="/settings" style={linkStyle}>
        Settings
      </Link>
    </p>
  );

  return (
    <AppStoreUnitsBody rows={rows} err={err} lookback={LOOKBACK} filterNote={filterNote} nav={nav} />
  );
}
