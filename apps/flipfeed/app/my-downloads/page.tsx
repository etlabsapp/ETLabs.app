import { notFound } from "next/navigation";
import { AppStoreUnitsBody } from "@/components/AppStoreUnitsBody";
import { loadUnitsForRecentDays } from "@/lib/appstore-sales";

export const runtime = "nodejs";

const LOOKBACK = 14;

type Props = { searchParams: { token?: string } };

export default async function MyDownloadsPage({ searchParams }: Props) {
  const token = searchParams.token;
  const secret = process.env.PRIVATE_DOWNLOADS_TOKEN?.trim();
  if (!secret || token !== secret) {
    notFound();
  }

  const vendor = process.env.ASC_VENDOR_NUMBER?.trim();
  const appleId = process.env.ASC_APP_APPLE_ID?.trim() || undefined;

  if (!vendor) {
    return (
      <main style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Downloads</h1>
        <p style={{ color: "#9c9892", marginTop: 12 }}>
          Set <code style={{ color: "#e8e6e3" }}>ASC_VENDOR_NUMBER</code> in Vercel and redeploy.
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

  return <AppStoreUnitsBody rows={rows} err={err} lookback={LOOKBACK} filterNote={filterNote} />;
}
