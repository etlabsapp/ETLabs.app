// Quick unit check for the leaderboard nickname filter:  node workers/study-nick.test.mjs
import { cleanNick, isTestNick } from "./study-nick.mjs";

const allow = ["Essex", "Hitchcock", "Cassandra", "Scunthorpe", "Classic", "Grass", "Dickens", "Neo", "Trinity_99",
  "Sussex", "Assassin", "Bass Player", "Analyst", "Cocktail", "Therapist", "Documents", "Title", "Hello",
  "TEST_prodcheck", "j.doe-2", "Pass", "Glass", "Mississippi", "Arsenal", "Peacock", "Scrapbook", "Shellfish"];
const reject = {
  "sh1t_h4x": "nick_not_allowed", "f*ck": "nick_bad_chars", "fuck": "nick_not_allowed", "FuUuCk": "nick_not_allowed",
  "fvck_u": "nick_not_allowed", "a55": "nick_not_allowed", "Big Dick": "nick_not_allowed", "BigDick": "nick_not_allowed",
  "d1ck": "nick_not_allowed", "5h1t": "nick_not_allowed", "bullshit": "nick_not_allowed", "b1tch": "nick_not_allowed",
  "asshole99": "nick_not_allowed", "@ss": "nick_bad_chars", "cunt": "nick_not_allowed", "c0ck": "nick_not_allowed",
  "sexy_neo": "nick_not_allowed", "the.nazi": "nick_not_allowed", "Hitler": "nick_not_allowed", "tits": "nick_not_allowed",
  "p0rn_king": "nick_not_allowed", "ADMIN": "nick_reserved", "x": "nick_too_short", "ThisNickIsWayTooLong": "nick_too_long",
  "<script>": "nick_bad_chars", "rapist99": "nick_not_allowed", "shiiit": "nick_not_allowed", "F.U.C.K": "nick_not_allowed", "Admin_1": "nick_reserved", "d1ck_2": "nick_not_allowed", "___": "nick_bad_chars", "   ": "nick_too_short",
};
let fail = 0;
for (const n of allow) { const r = cleanNick(n); if (r.error) { fail++; console.log("FAIL allow", JSON.stringify(n), r.error); } }
for (const [n, want] of Object.entries(reject)) { const r = cleanNick(n); if (r.error !== want) { fail++; console.log("FAIL reject", JSON.stringify(n), "got", r.error || "ok", "want", want); } }
const t = [["TEST_x", true], ["test_Atlas", true], ["Tester", false], ["MyTEST_", false]];
for (const [n, want] of t) if (isTestNick(n) !== want) { fail++; console.log("FAIL isTestNick", n); }
if (cleanNick("  Neo   Anderson ").nick !== "Neo Anderson") { fail++; console.log("FAIL trim/collapse"); }
console.log(fail ? `${fail} failure(s)` : `ok: ${allow.length} allowed, ${Object.keys(reject).length} rejected, ${t.length} TEST_ checks`);
process.exit(fail ? 1 : 0);
