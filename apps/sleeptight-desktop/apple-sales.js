import { gunzipSync } from "node:zlib";
import * as jose from "jose";
import { readFileSync } from "node:fs";

const ASC_BASE = "https://api.appstoreconnect.apple.com";

export async function createAscJwt(cfg) {
  const keyId = String(cfg.ascKeyId || "").trim();
  const issuerId = String(cfg.ascIssuerId || "").trim();
  const keyPath = String(cfg.ascPrivateKeyPath || "").trim();
  if (!keyId || !issuerId || !keyPath) {
    throw new Error("config needs ascKeyId, ascIssuerId, ascPrivateKeyPath");
  }
  const pem = readFileSync(keyPath, "utf8");
  const key = await jose.importPKCS8(pem, "ES256");
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime("19m")
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

export async function fetchDailySalesTsv(reportDate, vendorNumber, bearer) {
  const url = new URL(`${ASC_BASE}/v1/salesReports`);
  url.searchParams.set("filter[frequency]", "DAILY");
  url.searchParams.set("filter[reportDate]", reportDate);
  url.searchParams.set("filter[reportSubType]", "SUMMARY");
  url.searchParams.set("filter[reportType]", "SALES");
  url.searchParams.set("filter[vendorNumber]", vendorNumber);
  url.searchParams.set("filter[version]", "1_0");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearer}` },
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

export function sumUnitsFromTsv(tsv, appleIdentifier) {
  const lines = tsv.trim().split("\n");
  if (lines.length < 2) return { units: 0, rows: 0 };
  const header = lines[0].split("\t");
  const unitsIdx = header.indexOf("Units");
  const idIdx = header.indexOf("Apple Identifier");
  if (unitsIdx < 0 || idIdx < 0) throw new Error("Unexpected sales report columns");
  const filter = (appleIdentifier && String(appleIdentifier).trim()) || "";
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

export async function loadUnitsForRecentDays(cfg, days) {
  const vendor = String(cfg.vendorNumber || "").trim();
  if (!vendor) throw new Error("config needs vendorNumber");
  const appleId = cfg.appAppleId ? String(cfg.appAppleId).trim() : "";
  const jwt = await createAscJwt(cfg);
  const out = [];
  const today = new Date();
  for (let i = days; i >= 1; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    try {
      const tsv = await fetchDailySalesTsv(iso, vendor, jwt);
      if (!tsv) {
        out.push({ date: iso, units: 0, rows: 0, missing: true });
        continue;
      }
      const { units, rows } = sumUnitsFromTsv(tsv, appleId || undefined);
      out.push({ date: iso, units, rows, missing: false });
    } catch {
      out.push({ date: iso, units: 0, rows: 0, missing: true });
    }
  }
  return out;
}
