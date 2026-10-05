import assert from "node:assert/strict";
import { canonicalHostRedirect, legacyRedirect, permanentRedirect, wantsNoindex } from "./seo.mjs";

// http -> https, www -> apex, path + query kept, one hop
assert.equal(canonicalHostRedirect("http://etlabs.app/"), "https://etlabs.app/");
assert.equal(canonicalHostRedirect("http://etlabs.app/philosophy?x=1"), "https://etlabs.app/philosophy?x=1");
assert.equal(canonicalHostRedirect("https://www.etlabs.app/"), "https://etlabs.app/");
assert.equal(canonicalHostRedirect("http://www.etlabs.app/apps/sleeptight/?a=b"), "https://etlabs.app/apps/sleeptight/?a=b");
assert.equal(canonicalHostRedirect("https://WWW.ETLABS.APP/study/"), "https://etlabs.app/study/");
// already canonical, or not our host: no redirect
assert.equal(canonicalHostRedirect("https://etlabs.app/"), null);
assert.equal(canonicalHostRedirect("https://etlabs.app/study/api/leaderboard?day=1"), null);
assert.equal(canonicalHostRedirect("https://etlabsapp-seo-preview.example.workers.dev/"), null);
assert.equal(canonicalHostRedirect("http://localhost:8787/"), null);
assert.equal(canonicalHostRedirect("http://127.0.0.1:8787/philosophy"), null);
// fragment is never sent to the server; hash in URL string is dropped
assert.equal(canonicalHostRedirect("http://etlabs.app/a#b"), "https://etlabs.app/a");

// legacy / orphan pages
assert.equal(legacyRedirect("/apps/sleeptight/about"), "/apps/sleeptight/");
assert.equal(legacyRedirect("/apps/sleeptight/about.html"), "/apps/sleeptight/");
assert.equal(legacyRedirect("/apps/sleeptight/about/"), "/apps/sleeptight/");
assert.equal(legacyRedirect("/apps/sleeptight/sleeptight.html"), "/apps/sleeptight/");
assert.equal(legacyRedirect("/apps/sleeptight/products"), "/products");
assert.equal(legacyRedirect("/apps/sleeptight/contact.html"), "/contact");
assert.equal(legacyRedirect("/privacy.html"), "/apps/sleeptight/privacy");
assert.equal(legacyRedirect("/privacy"), "/apps/sleeptight/privacy");
assert.equal(legacyRedirect("/apps/flipfeed/"), "/");
assert.equal(legacyRedirect("/apps/flipfeed/index.html"), "/");
assert.equal(legacyRedirect("/apps/sleeptight/"), null);
assert.equal(legacyRedirect("/apps/sleeptight/privacy"), null);
assert.equal(legacyRedirect("/contact"), null);
assert.equal(legacyRedirect("/"), null);
assert.equal(legacyRedirect("/constructor"), null);   // no prototype keys
assert.equal(legacyRedirect("/__proto__"), null);

// 307 -> 301
assert.deepEqual(permanentRedirect(307, "/philosophy"), { status: 301, location: "/philosophy" });
assert.equal(permanentRedirect(302, "/study/?day=day1"), null);   // intentional temporary study redirect stays
assert.equal(permanentRedirect(301, "/x"), null);
assert.equal(permanentRedirect(200, null), null);
assert.equal(permanentRedirect(307, null), null);

// noindex on previews only
assert.equal(wantsNoindex("etlabsapp-seo-preview.foo.workers.dev", {}), true);
assert.equal(wantsNoindex("etlabs.app", {}), false);
assert.equal(wantsNoindex("etlabs.app", { SEO_NOINDEX: "1" }), true);
assert.equal(wantsNoindex("localhost", undefined), false);

console.log("seo.test.mjs: all assertions passed");
