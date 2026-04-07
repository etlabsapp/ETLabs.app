import { gunzipSync } from "node:zlib";
import * as jose from "jose";

const ASC_BASE = "https://api.appstoreconnect.apple.com";

function pemFromEnv(): string {
  const raw = process.env.ASC_PRIVATE_KEY?.trim() ?? "";
  if (!raw) return "";
  return raw.replace(/\\n/g, "\n");
}

export async function createAscJwt(): Promise<string> {
  const keyId = process.env.ASC_KEY_ID?.trim();
  const issuerId = process.env.ASC_ISSUER_ID?.trim();
  const pem = pemFromEnv();
  if (!keyId || !issuerId || !pem) {
    throw new Error("Missing ASC_KEY_ID, ASC_ISSUER_ID, or ASC_PRIVATE_KEY");
  }
  const key = await jose.importPKCS8(pem, "ES256");
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime("19m")
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

export async function fetchDailySalesTsv(reportDate: string, vendorNumber: string, bearer: string): Promise<string | null> {
  const url = new URL(`${ASC_BASE}/v1/salesReports`);
  url.searchParams.set("filter[frequency]", "DAILY");
  url.searchParams.set("filter[reportDate]", reportDate);
  url.searchParams.set("filter[reportSubType]", "SUMMARY");
  url.searchParams.set("filter[reportType]", "SALES");
  url.searchParams.set("filter[vendorNumber]", vendorNumber);
  url.searchParams.set("filter[version]", "1_0");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearer}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`App Store Connect ${res.status}: ${t.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const body = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return body.toString("utf-8");
}

export function sumUnitsFromTsv(tsv: string, appleIdentifier: string | undefined): { units: number; rows: number } {
  const lines = tsv.trim().split(/\n/);
  if (lines.length < 2) return { units: 0, rows: 0 };
  const header = lines[0].split("\t");
  const unitsIdx = header.indexOf("Units");
  const idIdx = header.indexOf("Apple Identifier");
  if (unitsIdx < 0 || idIdx < 0) {
    throw new Error("Unexpected sales report columns");
  }
  const filter = appleIdentifier?.trim() || "";
  let units = 0;
  let rows = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (cols.length <= Math.max(unitsIdx, idIdx)) continue;
    const aid = cols[idIdx].trim();
    if (filter && aid !== filter) continue;
    rows += 1;
    const u = parseFloat(cols[unitsIdx].trim() || "0");
    if (!Number.isNaN(u)) units += Math.round(u);
  }
  return { units, rows };
}

export type DayRow = { date: string; units: number; rows: number; missing: boolean };

export async function loadUnitsForRecentDays(
  days: number,
  vendorNumber: string,
  appleIdentifier: string | undefined
): Promise<DayRow[]> {
  const jwt = await createAscJwt();
  const out: DayRow[] = [];
  const today = new Date();
  for (let i = days; i >= 1; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    try {
      const tsv = await fetchDailySalesTsv(iso, vendorNumber, jwt);
      if (!tsv) {
        out.push({ date: iso, units: 0, rows: 0, missing: true });
        continue;
      }
      const { units, rows } = sumUnitsFromTsv(tsv, appleIdentifier);
      out.push({ date: iso, units, rows, missing: false });
    } catch {
      out.push({ date: iso, units: 0, rows: 0, missing: true });
    }
  }
  return out;
}
