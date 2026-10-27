import assert from "node:assert/strict";
import {
  myhqRedirectTarget, myhqAssetPath, isMyhqPath, stripAnalyticsBeacon, myhqCacheControl,
  applyMyhqHeaders, handleMyhq, MYHQ_CSP, prepareMyhqResponse,
} from "./myhq.mjs";

assert.equal(myhqRedirectTarget("/myhq", ""), "/myhq/");
assert.equal(myhqRedirectTarget("/myhq", "?x=1"), "/myhq/?x=1");
assert.equal(myhqRedirectTarget("/myhq.html", ""), "/myhq/");
assert.equal(myhqRedirectTarget("/myhq/index.html", ""), "/myhq/");
assert.equal(myhqRedirectTarget("/myhq/setup-guide", ""), "/myhq/setup-guide/");
assert.equal(myhqRedirectTarget("/myhq/setup-guide/index.html", ""), "/myhq/setup-guide/");
assert.equal(myhqRedirectTarget("/myhq/", ""), null);
assert.equal(myhqRedirectTarget("/myhq/setup-guide/", ""), null);
assert.equal(myhqRedirectTarget("/myhq/app.js", ""), null);
assert.equal(myhqRedirectTarget("/myhq/manifest.webmanifest", ""), null);
assert.equal(myhqRedirectTarget("/apps/myhq/public/app.js", ""), "/myhq/app.js");
assert.equal(myhqRedirectTarget("/apps/myhq/public/setup-guide/", ""), "/myhq/setup-guide/");
assert.equal(myhqRedirectTarget("/products", ""), null);
assert.equal(myhqRedirectTarget("/myhq/%2e%2e/etc", ""), null);

assert.equal(myhqAssetPath("/myhq/"), "/apps/myhq/public/index.html");
assert.equal(myhqAssetPath("/myhq/setup-guide/"), "/apps/myhq/public/setup-guide/index.html");
assert.equal(myhqAssetPath("/myhq/app.js"), "/apps/myhq/public/app.js");
assert.equal(myhqAssetPath("/myhq/templates/business.json"), "/apps/myhq/public/templates/business.json");
assert.equal(myhqAssetPath("/myhq/sw.js"), "/apps/myhq/public/sw.js");
assert.equal(myhqAssetPath("/myhq"), null);
assert.equal(myhqAssetPath("/myhq/../../workers/router.js"), null);
assert.equal(myhqAssetPath("/"), null);

assert.equal(isMyhqPath("/myhq"), true);
assert.equal(isMyhqPath("/myhq/"), true);
assert.equal(isMyhqPath("/myhq/setup-guide/"), true);
assert.equal(isMyhqPath("/apps/myhq/public/index.html"), true);
assert.equal(isMyhqPath("/privacy"), false);
assert.equal(isMyhqPath("/study/"), false);

const dirty = "<html><head><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\":\"x\"}'></script></head><body>ETLabs MyHQ</body></html>";
const clean = stripAnalyticsBeacon(dirty);
assert.equal(clean.includes("beacon.min.js"), false);
assert.equal(clean.includes("cloudflareinsights"), false);
assert.equal(clean.includes("ETLabs MyHQ"), true);
assert.equal(stripAnalyticsBeacon("<script src=\"/cdn-cgi/rum\"></script><p>ok</p>"), "<p>ok</p>");

const cc = myhqCacheControl("max-age=0, must-revalidate");
assert.match(cc, /\bpublic\b/);
assert.match(cc, /\bno-transform\b/);
assert.doesNotMatch(cc, /private/);
const headers = applyMyhqHeaders({ "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
assert.equal(headers.get("content-security-policy"), MYHQ_CSP);
assert.equal(headers.get("content-security-policy").includes("cloudflareinsights"), false);
assert.equal(headers.get("content-security-policy").includes("base-uri 'self'"), true);
assert.equal(headers.get("referrer-policy"), "no-referrer");
assert.match(headers.get("cache-control"), /public, no-transform/);

const prepped = await prepareMyhqResponse(new Response(dirty, {
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8", "content-length": "9" },
}));
const body = await prepped.text();
assert.equal(body.includes("beacon.min.js"), false);
assert.equal(body.includes("/cdn-cgi/rum"), false);
assert.match(prepped.headers.get("cache-control"), /no-transform/);
assert.equal(prepped.headers.get("content-security-policy").includes("static.cloudflareinsights.com"), false);

const env = {
  ASSETS: {
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === "/apps/myhq/public/index.html") {
        return new Response("<!doctype html><title>ETLabs MyHQ</title><base href=\"/myhq/\"><script src=\"app.js\"></script>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (path === "/apps/myhq/public/setup-guide/index.html") {
        return new Response("<!doctype html><title>ETLabs MyHQ: put it online and on your phone</title><a href=\"/myhq/\">Back</a>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (path === "/apps/myhq/public/app.js") {
        return new Response("navigator.serviceWorker.register('/myhq/sw.js', { scope: '/myhq/' })", {
          headers: { "content-type": "text/javascript" },
        });
      }
      return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
    },
  },
};

const home = await handleMyhq(new Request("https://etlabs.app/myhq/"), env, new URL("https://etlabs.app/myhq/"));
assert.equal(home.status, 200);
const homeHtml = await home.text();
assert.match(homeHtml, /ETLabs MyHQ/);
assert.match(homeHtml, /base href="\/myhq\/"/);
assert.equal(homeHtml.includes("beacon"), false);
assert.match(home.headers.get("cache-control"), /public, no-transform/);
assert.equal(home.headers.get("content-security-policy").includes("cloudflareinsights"), false);

const slash = await handleMyhq(new Request("https://preview.workers.dev/myhq"), env, new URL("https://preview.workers.dev/myhq"));
assert.equal(slash.status, 301);
assert.equal(slash.headers.get("location"), "/myhq/");

const guide = await handleMyhq(new Request("https://etlabs.app/myhq/setup-guide/"), env, new URL("https://etlabs.app/myhq/setup-guide/"));
assert.match(await guide.text(), /put it online/);

const js = await handleMyhq(new Request("https://etlabs.app/myhq/app.js"), env, new URL("https://etlabs.app/myhq/app.js"));
assert.match(await js.text(), /scope: '\/myhq\/'/);
assert.equal(js.headers.get("content-security-policy").includes("beacon"), false);

const other = await handleMyhq(new Request("https://etlabs.app/"), env, new URL("https://etlabs.app/"));
assert.equal(other, null);

const post = await handleMyhq(new Request("https://etlabs.app/myhq/", { method: "POST" }), env, new URL("https://etlabs.app/myhq/"));
assert.equal(post.status, 405);

console.log("myhq tests ok");
