/**
 * Unit tests for hands-free mode: speakable command text, answer-phrase parsing and voice ranking.
 * Run from linux-plus/: npm test
 */
import { speakable, parseHeard, summarizeOutput, questionScript, feedbackScript, rankVoices, scoreVoice, chunks, clampRate } from "../linux-plus/src/voice.ts";

const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(name + (detail ? ": " + detail : "")); else console.log("ok", name); };
const eq = (name, got, want) => check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ---- speakable ----
eq("flags are spelled: -aG", speakable("usermod -aG docker dev3"), "user mod dash a G docker dev3");
eq("pipe", speakable("ps aux | grep httpd"), "P S aux pipe grep H T T P D");
eq("paths say slash", speakable("chattr +a /var/log/billing.log"), "change attr plus a slash var slash log slash billing dot log");
eq("long flags and =", speakable("firewall-cmd --permanent --add-service=http"), "firewall C M D dash dash permanent dash dash add service equals H T T P");
eq("user:group", speakable("chown -R webops:nginx /var/www/shop"), "C H own dash R webops colon engine X slash var slash www slash shop");
eq("CIDR", speakable("ufw allow from 10.0.0.0/24 to any port 53 proto tcp"), "U F W allow from 10.0.0.0 slash 24 to any port 53 proto T C P");
eq("append redirect and home", speakable("echo 'export VAR=value' >> ~/.bashrc"), "echo export var equals value append to home slash dot bashrc");
eq("chmod digits", speakable("chmod 750 /srv/data"), "C H mod 7 5 0 slash srv slash data");
eq("plain numbers stay numbers", speakable("kill -9 1234"), "kill dash 9 1234");
eq("user@host", speakable("ssh student@203.0.113.10"), "S S H student at 203.0.113.10");
eq("English is unchanged", speakable("The sticky bit only matters on folders, where it limits who can delete files."), "The sticky bit only matters on folders, where it limits who can delete files.");
eq("variables", speakable("export PATH=$PATH:$HOME/tools/bin"), speakable("export PATH=$PATH:$HOME/tools/bin"));
check("no raw symbols left in commands", !/[|/=@~>]/.test(speakable("tar -xzf a.tgz -C /x | tee out >> log && echo ok")), speakable("tar -xzf a.tgz -C /x | tee out >> log && echo ok"));
check("word joiners are removed", !speakable("site\u2060-\u2060backup").includes("\u2060"));
eq("short output is read", summarizeOutput("$ id\nuid=1012(dev3)"), "Sample output: the command I D, shows U I D equals 1012 dev3.");
eq("long output is summarized", summarizeOutput("$ nproc\n4\n$ uptime\n 14:02 up 9 days, load average: 11.42\n$ mpstat 1 1\nCPU %usr\nall 93.10"), "Sample output from N proc, uptime and M P stat is shown on screen.");
eq("output without prompts", summarizeOutput("line one\nline two\nline three\nline four"), "Sample output is shown on screen.");
const qs = questionScript([{ t: "p", v: "Which command lists block devices?" }], ["df", "lsblk"], 1);
eq("question script reads options as A, B", qs, ["Which command lists block devices?", "A, D F.", "B, L S block."]);
check("multi-answer script says how many", questionScript([{ t: "p", v: "Pick. (Choose two.)" }], ["a", "b", "c", "d"], 2).includes("Pick two answers."));
eq("feedback correct", feedbackScript(true, "B", "lsblk lists block devices."), "Correct. L S block lists block devices.");
eq("feedback wrong", feedbackScript(false, "AC", "Both work."), "Not quite, the answer is A and C. Both work.");
check("long text is chunked", chunks("One. ".repeat(100)).every((c) => c.length <= 220) && chunks("One. ".repeat(100)).length > 1);
check("speed is clamped", clampRate(5) === 1.6 && clampRate(0.1) === 0.6 && clampRate(NaN) === 1 && clampRate(1.23) === 1.25);

// ---- parsing ----
const P = (t, need = 1, n = 4) => parseHeard(t, n, need);
const ans = (t, picks, need = 1) => eq(`"${t}" -> ${picks.map((p) => "ABCD"[p]).join("+")}`, P(t, need), { kind: "answer", picks });
const cmd = (t, command) => eq(`"${t}" -> ${command}`, P(t), { kind: "command", command });
ans("A", [0]); ans("ay", [0]); ans("Bee", [1]); ans("see", [2]); ans("sea", [2]); ans("dee", [3]); ans("D.", [3]);
ans("option B", [1]); ans("Option C.", [2]); ans("the answer is d", [3]); ans("letter a", [0]); ans("I think it's a B", [1]); ans("bravo", [1]); ans("option d please", [3]);
ans("A and C", [0, 2], 2); ans("a and see", [0, 2], 2); ans("B, D", [1, 3], 2); ans("AC", [0, 2], 2); ans("options A and D", [0, 3], 2); ans("A, B and D", [0, 1, 3], 3);
cmd("repeat", "repeat"); cmd("say that again", "repeat"); cmd("next", "next"); cmd("next question", "next"); cmd("skip", "skip"); cmd("skip this one", "skip"); cmd("stop", "stop"); cmd("pause", "pause"); cmd("wait", "pause");
eq('"hello" is unknown', P("hello"), { kind: "unknown" });
eq('"" is unknown', P(""), { kind: "unknown" });
eq("letters past the last option are ignored", P("E", 1, 4), { kind: "unknown" });
eq("E counts when there are five options", P("E", 1, 5), { kind: "answer", picks: [4] });

// ---- voices ----
const V = (name, lang, extra = {}) => ({ name, lang, voiceURI: extra.uri ?? name, default: !!extra.default });
const voices = [
  V("Albert", "en-US"), V("Samantha (Compact)", "en-US", { default: true, uri: "com.apple.voice.compact.en-US.Samantha" }), V("Ava (Premium)", "en-US", { uri: "com.apple.voice.premium.en-US.Ava" }),
  V("Zoe (Enhanced)", "en-US"), V("Google US English", "en-US"), V("Microsoft Aria Online (Natural) - English (United States)", "en-US"), V("Thomas", "fr-FR"), V("Bad News", "en-US"), V("eSpeak English", "en-US"),
];
const ranked = rankVoices(voices, "en-US").map((v) => v.name);
eq("Premium voice ranks first", ranked[0], "Ava (Premium)");
check("Enhanced, Natural and Google voices rank above compact ones", ["Zoe (Enhanced)", "Microsoft Aria Online (Natural) - English (United States)", "Google US English"].every((n) => ranked.indexOf(n) < ranked.indexOf("Samantha (Compact)")), ranked.join(" > "));
check("novelty voices and other languages are left out", !ranked.includes("Albert") && !ranked.includes("Bad News") && !ranked.includes("Thomas"), ranked.join(", "));
check("Google voice beats an unnamed default", scoreVoice(V("Google US English", "en-US"), "en-US") > scoreVoice(V("Fred", "en-US", { default: true }), "en-US"));
check("same-language region still allowed", rankVoices([V("Google UK English Female", "en-GB")], "en-US").length === 1);
check("Android-style underscore locales work", rankVoices([V("English United States", "en_US")], "en-US").length === 1);

if (failures.length) { console.error("\nFAILED"); failures.forEach((f) => console.error(" -", f)); process.exit(1); }
console.log("\nAll hands-free checks passed.");
