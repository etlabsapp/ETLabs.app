import test from "node:test";
import assert from "node:assert/strict";
import { parseRange, withByteRanges } from "./range.mjs";

test("parseRange", () => {
  assert.deepEqual(parseRange("bytes=0-1", 10), { start: 0, end: 1 });
  assert.deepEqual(parseRange("bytes=5-", 10), { start: 5, end: 9 });
  assert.deepEqual(parseRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange("bytes=0-99", 10), { start: 0, end: 9 });
  assert.equal(parseRange("bytes=10-", 10), "unsatisfiable");
  assert.equal(parseRange("bytes=0-1,4-5", 10), null);
  assert.equal(parseRange("items=0-1", 10), null);
});

test("withByteRanges: 206 for video, untouched for html", async () => {
  const body = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const mk = (ct) => new Response(body, { status: 200, headers: { "content-type": ct } });
  const r = await withByteRanges(new Request("https://x/a.mp4", { headers: { range: "bytes=0-1" } }), mk("video/mp4"));
  assert.equal(r.status, 206);
  assert.equal(r.headers.get("content-range"), "bytes 0-1/10");
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [0, 1]);
  const h = await withByteRanges(new Request("https://x/", { headers: { range: "bytes=0-1" } }), mk("text/html"));
  assert.equal(h.status, 200);
  const n = await withByteRanges(new Request("https://x/a.mp4"), mk("video/mp4"));
  assert.equal(n.status, 200); assert.equal(n.headers.get("accept-ranges"), "bytes");
  const u = await withByteRanges(new Request("https://x/a.mp4", { headers: { range: "bytes=50-" } }), mk("video/mp4"));
  assert.equal(u.status, 416);
});
