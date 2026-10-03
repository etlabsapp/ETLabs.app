import assert from "node:assert/strict";
import { rateKeyForIp, isBlockedPath } from "./security.mjs";

// IPv4: per address
assert.equal(rateKeyForIp("203.0.113.7"), "203.0.113.7");
assert.equal(rateKeyForIp(""), "unknown");
assert.equal(rateKeyForIp(null), "unknown");
// IPv6: per /64, any spelling of the same /64 collapses to one key
const k = rateKeyForIp("2001:db8:abcd:12:1::1");
assert.equal(k, "2001:db8:abcd:12::/64");
assert.equal(rateKeyForIp("2001:0db8:abcd:0012:ffff:ffff:ffff:ffff"), k);
assert.equal(rateKeyForIp("2001:DB8:ABCD:12::dead:beef"), k);
assert.notEqual(rateKeyForIp("2001:db8:abcd:13::1"), k);
assert.equal(rateKeyForIp("2001:db8::1"), "2001:db8:0:0::/64");
assert.equal(rateKeyForIp("::1"), "0:0:0:0::/64");
assert.equal(rateKeyForIp("::ffff:198.51.100.4"), "198.51.100.4");

// Blocked repo plumbing
for (const p of ["/.git/config", "/.git/HEAD", "/.git", "/%2Egit/HEAD", "//.git/index", "/.claude/launch.json", "/workers/router.js",
  "/migrations/0001_study_leaderboard.sql", "/wrangler.jsonc", "/docs/DEPLOY-ETLABS-APP.md", "/README.md", "/package.json",
  "/tools/appstore-download-stats/.env.example", "/apps/flipfeed/.env.example", "/apps/totalcross/worker/wrangler.toml",
  "/apps/dashboard/package.json", "/apps/marketing/", "/scripts/build_social_banner.py", "/.gitignore", "/.assetsignore"]) {
  assert.equal(isBlockedPath(p), true, p);
}
// Real pages stay reachable
for (const p of ["/", "/index.html", "/contact.html", "/apps/totalcross/", "/apps/totalcross/game.js", "/apps/totalcross/api/themes.json",
  "/apps/totalcross/brand/og-totalcross.png", "/study/", "/study/api/leaderboard", "/apps/lattice3/", "/apps/lattice3/game.js",
  "/apps/sleeptight/", "/apps/sleeptight/privacy.html", "/assets/js/script.js", "/assets/images/etlabs-logo-abs.svg", "/NOTICE.txt",
  "/apps/flipfeed/", "/documents", "/toolsy"]) {
  assert.equal(isBlockedPath(p), false, p);
}
console.log("security tests passed");
