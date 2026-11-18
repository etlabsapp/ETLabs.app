/**
 * Hands-free helpers for the practice exam: speakable text for commands, answer-phrase parsing and voice ranking.
 * Pure functions only, so they can be tested in Node. The browser engine lives in handsfree.tsx.
 */

// ---------- Speakable text ----------

/** How common Linux words should sound. Applied to whole words only. */
const SAY: Record<string, string> = {
  sudo: "sue doo", su: "S U", ls: "L S", cd: "C D", rm: "R M", cp: "C P", mv: "M V", mkdir: "make dir", rmdir: "remove dir", pwd: "P W D",
  chmod: "C H mod", chown: "C H own", chgrp: "C H group", chattr: "change attr", lsattr: "L S attr", umask: "you mask", uname: "you name",
  setfacl: "set F A C L", getfacl: "get F A C L", acl: "A C L", acls: "A C Ls",
  systemctl: "system C T L", journalctl: "journal C T L", hostnamectl: "hostname C T L", timedatectl: "time date C T L", loginctl: "login C T L",
  resolvectl: "resolve C T L", nmcli: "N M C L I", sysctl: "sys C T L", modprobe: "mod probe", lsmod: "L S mod", modinfo: "mod info",
  useradd: "user add", usermod: "user mod", userdel: "user del", groupadd: "group add", groupmod: "group mod", passwd: "password", rwx: "R W X", httpd: "H T T P D", cmd: "C M D", ctl: "C T L", fs: "F S", nginx: "engine X", sshd_config: "S S H D config", chage: "change age",
  visudo: "V I sudo", sudoers: "sue doers", newgrp: "new group", getent: "get ent",
  ps: "P S", pkill: "P kill", killall: "kill all", nohup: "no hup", fg: "F G", bg: "B G", nproc: "N proc", mpstat: "M P stat", vmstat: "V M stat", iostat: "I O stat",
  df: "D F", du: "D U", dd: "D D", lsblk: "L S block", lsof: "L S O F", lsscsi: "L S S C S I", blkid: "block I D", fstab: "F S tab", mkfs: "make F S", mkswap: "make swap", swapon: "swap on",
  pvcreate: "P V create", vgcreate: "V G create", lvcreate: "L V create", vgextend: "V G extend", lvextend: "L V extend", vgchange: "V G change", lvchange: "L V change", lvm: "L V M", lv: "L V", vg: "V G", pv: "P V",
  xfs: "X F S", ext4: "ext 4", nfs: "N F S", exportfs: "export F S", rsync: "R sync", scp: "S C P", ssh: "S S H", sshd: "S S H D", sftp: "S F T P",
  ip: "I P", ss: "S S", nc: "N C", dig: "dig", nslookup: "N S lookup", tcpdump: "T C P dump", ethtool: "eth tool", ufw: "U F W", iptables: "I P tables", nft: "N F T",
  dnf: "D N F", yum: "yum", rpm: "R P M", apt: "apt", dpkg: "D package", git: "git", pip: "pip", venv: "V env", npm: "N P M",
  dmesg: "D message", dmidecode: "D M I decode", initrd: "init R D", initramfs: "init ram F S", grub: "grub", selinux: "S E Linux", semanage: "S E manage", restorecon: "restore con",
  getenforce: "get enforce", setenforce: "set enforce", sestatus: "S E status", cron: "cron", crontab: "cron tab", tmp: "temp", usr: "user", etc: "E T C", var: "var", dev: "dev", proc: "proc",
  tty: "T T Y", pid: "P I D", uid: "U I D", gid: "G I D", dns: "D N S", nat: "NAT", cpu: "C P U", cpus: "C P Us", ram: "RAM", nic: "N I C", ntp: "N T P", http: "H T T P", https: "H T T P S", tcp: "T C P", udp: "U D P",
  tr: "T R", wc: "W C", awk: "awk", sed: "sed", grep: "grep", cat: "cat", tee: "tee", xz: "X Z", gz: "G Z", tgz: "T G Z", "7za": "7 Z A", cpio: "C P I O", luks: "LUKS", pam: "PAM", sssd: "S S S D", ldap: "L dap",
  yaml: "YAML", json: "jason", vm: "V M", kvm: "K V M", qemu: "Q emu", conf: "conf", cfg: "config", txt: "text", sh: "S H", py: "P Y", md: "M D", id: "I D",
};
const SYMBOL: Record<string, string> = {
  "|": "pipe", "||": "or else", "&&": "and then", "&": "and", ">": "into", ">>": "append to", "<": "from", "2>": "errors into", "2>&1": "errors to output",
  "=": "equals", "~": "home", "*": "star", "$": "dollar", "#": "hash", "\\": "backslash", ";": "then", ":": "colon", "@": "at", "%": "percent", "+": "plus", "!": "bang",
};
const say = (w: string) => SAY[w.toLowerCase()] ?? w;
const spell = (s: string) => s.split("").join(" ");

/** Read one code-like word: paths, flags, user@host, key=value, a:b:c and dotted names. */
function speakWord(tok: string): string {
  if (SYMBOL[tok]) return SYMBOL[tok];
  if (/^\d+(\.\d+){3}(\/\d+)?$/.test(tok)) return tok.replace("/", " slash ");
  let m = /^(--?)([A-Za-z0-9][\w-]*)(=(.*))?$/.exec(tok);
  if (m) {
    const name = m[1] === "--" ? `dash dash ${m[2].split("-").map(say).join(" ")}` : `dash ${/^\d+$/.test(m[2]) ? m[2] : m[2].length <= 6 ? spell(m[2]) : m[2]}`;
    return m[4] !== undefined ? `${name} equals ${speakWord(m[4])}` : name;
  }
  if (/^[+-][a-zA-Z]{1,3}$/.test(tok)) return `${tok[0] === "+" ? "plus" : "minus"} ${spell(tok.slice(1))}`;
  if (tok.includes("@") && !tok.startsWith("@")) return tok.split("@").map(speakWord).join(" at ");
  if (tok.includes("=") && !tok.startsWith("=")) { const [k, ...v] = tok.split("="); return `${speakWord(k)} equals ${v.length ? speakWord(v.join("=")) : ""}`.trim(); }
  if (tok.includes("/")) {
    return tok.split("/").map((p, i, a) => (p === "" ? (i === 0 || i === a.length - 1 ? "slash" : "") : (i > 0 && a[i - 1] !== "" ? "slash " : "") + speakWord(p))).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  if (/^[\w.-]+:[\w.:-]*$/.test(tok) && !/^\d+:\d+$/.test(tok)) return tok.split(":").map((p) => (p ? speakWord(p) : "")).join(" colon ").replace(/\s+/g, " ").trim();
  if (/^\$\{?\w+\}?$/.test(tok)) return `dollar ${tok.replace(/[${}]/g, "")}`;
  if (/^~/.test(tok)) return `home ${speakWord(tok.slice(1).replace(/^\//, ""))}`.trim();
  if (/^\.\w/.test(tok)) return `dot ${speakWord(tok.slice(1))}`;
  if (/^[\w-]+(\.[\w-]+)+$/.test(tok) && !/^\d/.test(tok)) return tok.split(".").map(say).join(" dot ");
  if (/^[a-z][\w-]*$/i.test(tok) && tok.includes("_")) return tok.split("_").map(say).join(" underscore ");
  if (/^[A-Za-z0-9]+$/.test(tok)) return say(tok);
  if (/^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)+$/.test(tok)) return tok.split("-").map(say).join(" ");
  return tok.replace(/-/g, " dash ").replace(/[|&><=~*$#\\;:@%+!{}[\]()'"`]/g, (c) => ` ${SYMBOL[c] ?? ""} `).replace(/\s+/g, " ").trim();
}

/** Turn question or option text into something a speech engine reads sensibly. English stays as it is. */
export function speakable(text: string): string {
  return text
    .replace(/\u2060/g, "")
    .split(/\n/)
    .map((line) => line.split(/\s+/).filter(Boolean).map((raw, i, all) => {
      if (/^0?[0-7]{3}$/.test(raw) && i > 0 && /^(chmod|umask|-m)$/.test(all[i - 1])) return spell(raw);
      const lead = /^[("'“]+/.exec(raw)?.[0] ?? "";
      const body0 = raw.slice(lead.length);
      const trail = /[)"'”,;:?!.]+$/.exec(body0)?.[0] ?? "";
      let body = trail ? body0.slice(0, -trail.length) : body0;
      let tail = trail.replace(/["'”)]/g, "");
      // Keep a trailing dot that is part of a name like "file." only when the word is plain English.
      if (!body) return SYMBOL[raw] ?? raw;
      if (/^[A-Za-z][a-z]*('[a-z]+)?$/.test(body) && !SAY[body.toLowerCase()]) return lead.replace(/["'“]/g, "") + body + tail;
      if (/^[A-Z][A-Za-z]+$/.test(body) && SAY[body.toLowerCase()] && /^[A-Z][a-z]/.test(body) && body.length > 3) return body + tail;
      return speakWord(body) + tail;
    }).join(" "))
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prompt lines in sample output, such as "$ uptime" or "root@web:~# df -h". */
const PROMPT = /^\s*(?:[\w.-]+@[\w.-]+[^\s$#]*\s?)?[$#]\s+(\S.*)$/;

/** Short output is read in full. Longer output is summarized by the commands it shows. */
export function summarizeOutput(code: string): string {
  const lines = code.split("\n").filter((l) => l.trim());
  if (lines.length <= 2 && code.length <= 90) {
    const said = lines.map((l) => { const m = PROMPT.exec(l); return m ? `the command ${speakable(m[1])}` : `shows ${speakable(l)}`; });
    return `Sample output: ${said.join(", ")}.`;
  }
  const cmds: string[] = [];
  for (const l of lines) {
    const m = PROMPT.exec(l);
    if (m) { const name = m[1].trim().split(/\s+/)[0]; if (!/^[|&]/.test(name) && !cmds.includes(name)) cmds.push(name); }
  }
  if (!cmds.length) return "Sample output is shown on screen.";
  const names = cmds.slice(0, 5).map(say);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Sample output from ${list} is shown on screen.`;
}

export type StemBlock = { t: "p" | "code"; v: string };

/** The full read-aloud script for one question: stem, then each option as "A, ...". */
export function questionScript(stem: StemBlock[], optionTexts: string[], picks: number): string[] {
  const parts: string[] = [];
  for (const b of stem) parts.push(b.t === "code" ? summarizeOutput(b.v) : speakable(b.v));
  if (picks > 1) parts.push(`Pick ${picks === 2 ? "two" : picks === 3 ? "three" : picks} answers.`);
  optionTexts.forEach((t, i) => parts.push(`${LETTERS[i]}, ${speakable(t)}.`.replace(/\.\.$/, ".")));
  return parts.map((p) => p.replace(/\s+([.,?!])/g, "$1").replace(/([.?!])\.$/, "$1"));
}

export function feedbackScript(ok: boolean, answerLetters: string, why: string): string {
  const list = answerLetters.split("").join(" and ");
  return `${ok ? "Correct." : `Not quite, the answer is ${list}.`} ${speakable(why)}`.replace(/\s+([.,?!])/g, "$1");
}

// ---------- Listening ----------

export const LETTERS = "ABCDEFGH";
export type Command = "repeat" | "next" | "skip" | "stop" | "pause";
export type Heard = { kind: "answer"; picks: number[] } | { kind: "command"; command: Command } | { kind: "unknown" };

/** Words a recognizer may return for each letter. */
const LETTER_WORDS: Record<string, number> = {
  a: 0, ay: 0, aye: 0, eh: 0, hey: 0, alpha: 0, "a.": 0,
  b: 1, bee: 1, be: 1, bea: 1, bravo: 1,
  c: 2, see: 2, sea: 2, cee: 2, si: 2, she: 2, charlie: 2,
  d: 3, dee: 3, de: 3, delta: 3, the: -1,
  e: 4, echo: 4, f: 5, ef: 5, eff: 5, foxtrot: 5, g: 6, gee: 6, h: 7, aitch: 7,
};
const CUE = new Set(["option", "options", "letter", "answer", "answers", "choice", "is", "pick", "choose", "select", "its", "it's"]);
const COMMANDS: [RegExp, Command][] = [
  [/\b(repeat|again|say (that|it) again|read (it|that) again|what)\b/, "repeat"],
  [/\b(skip|pass)\b/, "skip"],
  [/\b(next|continue|go on|move on)\b/, "next"],
  [/\b(stop|quit|cancel|turn off)\b/, "stop"],
  [/\b(pause|wait|hold on)\b/, "pause"],
];

/**
 * Parse what the recognizer heard. `count` is how many options are shown, `need` how many answers the question wants.
 * Picks are on-screen positions (0 = A). Returns unknown when nothing usable was said.
 */
export function parseHeard(transcript: string, count: number, need = 1): Heard {
  const text = transcript.toLowerCase().replace(/[“”"!?,]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return { kind: "unknown" };
  const words = text.replace(/\./g, " ").split(" ").filter(Boolean);
  const found: { pos: number; i: number; cued: boolean }[] = [];
  words.forEach((w, i) => {
    let pos = LETTER_WORDS[w];
    if (pos === undefined && /^[a-h]$/.test(w)) pos = w.charCodeAt(0) - 97;
    if (pos === undefined || pos < 0 || pos >= count) return;
    found.push({ pos, i, cued: i > 0 && CUE.has(words[i - 1]) });
  });
  // "AC" or "a&c" as one word when more than one answer is needed.
  if (!found.length && need > 1) {
    const joined = text.replace(/[\s&+,]|and/g, "");
    if (/^[a-h]{2,3}$/.test(joined)) joined.split("").forEach((ch, i) => { const p = ch.charCodeAt(0) - 97; if (p < count) found.push({ pos: p, i, cued: true }); });
  }
  const commandHit = COMMANDS.find(([re]) => re.test(text));
  // Letter-like words that are also plain English ("a", "be", "see", "the") only count when they are clearly answers.
  const ambiguous = new Set(["a", "be", "see", "she", "hey", "eh", "si", "de", "sea"]);
  const inList = (f: { i: number }) => found.some((g) => g !== f && Math.abs(g.i - f.i) <= 2 && (Math.abs(g.i - f.i) === 1 || words[Math.min(g.i, f.i) + 1] === "and" || words[Math.min(g.i, f.i) + 1] === "or"));
  const strong = found.filter((f) => f.cued || !ambiguous.has(words[f.i]) || words.length <= 3 || inList(f));
  if (commandHit && !strong.some((f) => f.cued) && (strong.length === 0 || words.length > 3 || /^(next|skip|stop|pause|repeat)\b/.test(text))) {
    if (!strong.length || !/^(option|letter|answer)/.test(text)) return { kind: "command", command: commandHit[1] };
  }
  if (!strong.length) return { kind: "unknown" };
  let picks = [...new Set(strong.map((f) => f.pos))];
  if (need === 1 && picks.length > 1) {
    const real = strong.filter((f) => words[f.i] !== "a");
    const pool = real.length ? real : strong;
    const cued = pool.filter((f) => f.cued);
    picks = [(cued.length ? cued[cued.length - 1] : pool[pool.length - 1]).pos];
  } else if (need > 1 && picks.length > need && words[strong[0].i] === "a" && !strong[0].cued) {
    picks = [...new Set(strong.slice(1).map((f) => f.pos))];
  }
  return { kind: "answer", picks: picks.sort((x, y) => x - y) };
}

// ---------- Voices ----------

export type VoiceLike = { name: string; lang: string; voiceURI: string; localService?: boolean; default?: boolean };

const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|junior|ralph|fred|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy)\b/i;
const APPLE_NATURAL = /\b(ava|zoe|evan|nathan|noelle|allison|susan|tom|samantha|joelle|serena|daniel|karen|moira|tessa|kate|oliver|jamie|matilda|lee|isha|siri)\b/i;

/** Score a voice for the page language. Higher is more natural. Negative means avoid. */
export function scoreVoice(v: VoiceLike, lang: string): number {
  const want = lang.toLowerCase(), have = (v.lang || "").toLowerCase().replace("_", "-");
  const base = want.split("-")[0];
  let s = 0;
  if (have === want) s += 100; else if (have.split("-")[0] === base) s += 60; else return -1000;
  const n = v.name;
  if (/premium/i.test(n) || /premium/i.test(v.voiceURI)) s += 60;
  if (/enhanced/i.test(n) || /enhanced/i.test(v.voiceURI)) s += 50;
  if (/natural/i.test(n)) s += 45;
  if (/^google\b/i.test(n)) s += 35;
  if (/neural|wavenet/i.test(n)) s += 35;
  if (APPLE_NATURAL.test(n)) s += 15;
  if (/compact/i.test(n) || /compact/i.test(v.voiceURI)) s -= 50;
  if (/espeak|robot|mbrola/i.test(n)) s -= 60;
  if (NOVELTY.test(n) && !/premium|enhanced|natural|google/i.test(n)) s -= 200;
  if (v.default) s += 3;
  return s;
}

/** Voices for the page language, best first. Novelty voices are left out. */
export function rankVoices<T extends VoiceLike>(voices: T[], lang: string): T[] {
  return voices.map((v) => ({ v, s: scoreVoice(v, lang) })).filter((x) => x.s > -100).sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name)).map((x) => x.v);
}

export const RATE_MIN = 0.6, RATE_MAX = 1.6, RATE_DEFAULT = 1;
export const clampRate = (r: number) => (Number.isFinite(r) ? Math.min(RATE_MAX, Math.max(RATE_MIN, Math.round(r * 20) / 20)) : RATE_DEFAULT);

/** Split long text into sentence-sized chunks; some engines stop or skip on long utterances. */
export function chunks(text: string, max = 220): string[] {
  const out: string[] = [];
  for (const s of text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]) {
    const t = s.trim();
    if (!t) continue;
    if (out.length && (out[out.length - 1] + " " + t).length <= max) out[out.length - 1] += " " + t;
    else if (t.length <= max) out.push(t);
    else { let rest = t; while (rest.length > max) { const cut = rest.lastIndexOf(" ", max); out.push(rest.slice(0, cut > 0 ? cut : max)); rest = rest.slice(cut > 0 ? cut + 1 : max); } if (rest) out.push(rest); }
  }
  return out;
}
