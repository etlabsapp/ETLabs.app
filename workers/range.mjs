/**
 * Byte-range support for media assets (preview fix 2026-10-16).
 * The static-asset layer answers `Range:` requests with a full 200. iOS Safari needs
 * 206 Partial Content to play <video>, so it showed a black/blank box. For video/audio
 * responses this turns a full 200 into a correct 206, or a 416 when the range can't be satisfied.
 * Used by workers/router.js for /assets/junior/*. Unit-tested by workers/range.test.mjs.
 */
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;          // malformed or multi-range -> ignore (full 200)
  let start, end;
  if (m[1] === "") { const n = Number(m[2]); if (n === 0) return "unsatisfiable"; start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}

const isMedia = (ct) => /^(video|audio)\//i.test(ct || "");

export async function withByteRanges(request, res) {
  if (res.status !== 200 || !isMedia(res.headers.get("content-type"))) return res;
  const range = request.headers.get("range");
  if (!range || request.method !== "GET") {
    const r = new Response(res.body, res); r.headers.set("accept-ranges", "bytes"); return r;
  }
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const pr = parseRange(range, size);
  const headers = new Headers(res.headers);
  headers.set("accept-ranges", "bytes");
  if (pr === null) { headers.set("content-length", String(size)); return new Response(request.method === "HEAD" ? null : buf, { status: 200, headers }); }
  if (pr === "unsatisfiable") {
    headers.set("content-range", `bytes */${size}`); headers.delete("content-length");
    return new Response(null, { status: 416, headers });
  }
  headers.set("content-range", `bytes ${pr.start}-${pr.end}/${size}`);
  headers.set("content-length", String(pr.end - pr.start + 1));
  return new Response(request.method === "HEAD" ? null : buf.slice(pr.start, pr.end + 1), { status: 206, headers });
}
