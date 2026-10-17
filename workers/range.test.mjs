import test from "node:test";
import assert from "node:assert/strict";
import { parseRange, withByteRanges } from "./range.mjs";

test("range: parse + 206/416/200", async () => {
  assert.deepEqual(parseRange("bytes=0-9", 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.equal(parseRange("bytes=200-", 100), "unsatisfiable");
  assert.equal(parseRange("bytes=0-1,5-6", 100), null);
  const body = new Uint8Array(100).map((_, i) => i);
  const asset = () => new Response(body, { status: 200, headers: { "content-type": "video/mp4" } });
  const r = await withByteRanges(new Request("https://x/a.mp4", { headers: { range: "bytes=10-19" } }), asset());
  assert.equal(r.status, 206);
  assert.equal(r.headers.get("content-range"), "bytes 10-19/100");
  assert.equal((await r.arrayBuffer()).byteLength, 10);
  const bad = await withByteRanges(new Request("https://x/a.mp4", { headers: { range: "bytes=500-" } }), asset());
  assert.equal(bad.status, 416);
  const full = await withByteRanges(new Request("https://x/a.mp4"), asset());
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("accept-ranges"), "bytes");
  const css = new Response("x", { status: 200, headers: { "content-type": "text/css" } });
  assert.equal(await withByteRanges(new Request("https://x/a.css", { headers: { range: "bytes=0-0" } }), css), css);
});
