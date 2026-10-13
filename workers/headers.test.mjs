import assert from "node:assert/strict";
import { withSecurityHeaders, SECURITY_HEADERS } from "./headers.mjs";

const r = withSecurityHeaders(new Response("ok", { status: 200, headers: { "content-type": "text/html" } }));
for (const k of Object.keys(SECURITY_HEADERS)) assert.ok(r.headers.get(k), k);
assert.equal(r.headers.get("strict-transport-security"), "max-age=31536000");
assert.ok(!/preload|includeSubDomains/i.test(r.headers.get("strict-transport-security")));
assert.equal(r.headers.get("content-type"), "text/html");
assert.equal(await r.text(), "ok");
// immutable redirect responses are wrapped, status/location kept
const red = withSecurityHeaders(Response.redirect("https://etlabs.app/x", 301));
assert.equal(red.status, 301);
assert.equal(red.headers.get("location"), "https://etlabs.app/x");
assert.equal(red.headers.get("x-frame-options"), "SAMEORIGIN");
// route-set header is not overridden
const keep = withSecurityHeaders(new Response("", { headers: { "x-frame-options": "DENY" } }));
assert.equal(keep.headers.get("x-frame-options"), "DENY");
console.log("headers tests ok");
