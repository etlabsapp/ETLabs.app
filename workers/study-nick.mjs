/**
 * Study leaderboard nickname validation (pure; unit-tested by workers/study-nick.test.mjs).
 * Rules: NFKC, trimmed, inner whitespace collapsed, 2-16 chars of [A-Za-z0-9 _.-], at least one letter/digit.
 * Profanity: after leetspeak normalization, long unambiguous terms match as substrings; short/ambiguous
 * words match only as whole tokens (tokens split on space _ . - and camelCase), so "Essex", "Cassandra",
 * "Scunthorpe", "Dickens" pass while "sh1t_h4x", "a55", "Big Dick" are rejected.
 */
const NICK_RE = /^[A-Za-z0-9 _.\-]{2,16}$/;
const RESERVED = ["admin", "administrator", "etlabs", "moderator", "mod", "official", "system", "root"];
// substring match (unambiguous; checked on the joined + squashed string)
const BLOCK_SUBSTR = ["fuck", "fvck", "phuck", "shit", "bitch", "biatch", "nigger", "nigga", "faggot", "whore", "slut",
  "hitler", "porn", "penis", "vagina", "asshole", "bastard", "retard", "dildo", "jizz", "hentai", "molest",
  "pedophile", "motherf", "cocksuck", "dickhead", "pussy", "cumshot", "blowjob", "handjob", "masturbat", "nazis"];
// whole-token match only (short or ambiguous words)
const BLOCK_TOKEN = ["ass", "arse", "cunt", "dick", "dik", "cock", "fag", "fags", "tit", "tits", "titty", "sex", "sexy",
  "nazi", "kkk", "heil", "rape", "raped", "rapist", "cum", "anal", "spic", "kike", "chink", "twat", "wank", "wanker", "boob", "boobs",
  "milf", "pedo", "fuk", "fck", "fk", "sht", "piss", "damn", "hell", "crap", "negro", "coon", "homo", "dyke", "tranny", "jap"];
const LEET = { "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "8": "b", "9": "g" };

const deleet = s => s.split("").map(c => LEET[c] || c).join("").replace(/[^a-z]/g, "");
const squash = s => s.replace(/(.)\1+/g, "$1");

export const isTestNick = nick => /^test_/i.test(String(nick || ""));

export function cleanNick(raw) {
  if (typeof raw !== "string") return { error: "nick_required" };
  const nick = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (nick.length < 2) return { error: "nick_too_short" };
  if (nick.length > 16) return { error: "nick_too_long" };
  if (!NICK_RE.test(nick) || !/[A-Za-z0-9]/.test(nick)) return { error: "nick_bad_chars" };
  // tokens: split camelCase and separators; check leet-normalized and digits-stripped variants
  const toks = nick.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[ _.\-]+/).filter(Boolean);
  const plain = s => s.replace(/[^a-z]/g, "");
  const variants = s => new Set([deleet(s), plain(s), squash(deleet(s)), squash(plain(s))].filter(Boolean));
  if (RESERVED.includes(deleet(toks.join(""))) || RESERVED.includes(plain(toks.join("")))) return { error: "nick_reserved" };
  for (const t of toks) {
    for (const v of variants(t)) {
      if (BLOCK_TOKEN.includes(v) || (v.endsWith("s") && BLOCK_TOKEN.includes(v.slice(0, -1)))) return { error: "nick_not_allowed" };
    }
  }
  for (const v of variants(toks.join(""))) {
    if (BLOCK_SUBSTR.some(w => v.includes(w))) return { error: "nick_not_allowed" };
  }
  return { nick, test: isTestNick(nick) };
}
