/**
 * Scripted playthrough of the Linux+ lab simulation.
 * Mission 0 must pass in full. Every later mission gets a spot check on its home server.
 * Run from linux-plus/: npm test
 */
import { SERVERS, MISSIONS, makeWorld, execute, passesTask, passesAnswer } from "../linux-plus/src/lab.tsx";

const failures = [];
function check(name, ok, detail) {
  if (!ok) failures.push(name + (detail ? ": " + detail : ""));
  else console.log("ok", name);
}

function attempt(world, mission, step, cmd) {
  if (passesAnswer(mission, step, cmd)) return { ok: true, world, lines: [] };
  const before = structuredClone(world);
  const after = structuredClone(world);
  const res = execute(after, cmd, []);
  return { ok: passesTask(mission, step, before, after, res), world: after, lines: res.lines, meta: res.meta };
}

function stepNamed(mission, short) {
  const i = MISSIONS[mission].tasks.findIndex((t) => t.short === short);
  if (i < 0) throw new Error(`missing task ${mission} ${short}`);
  return i;
}

const n = MISSIONS.reduce((t, m) => t + m.tasks.length, 0);
check("128 tasks", n === 128, String(n));
check("10 missions", MISSIONS.length === 10, String(MISSIONS.length));
check("five servers", SERVERS.length === 5 && SERVERS.every((s) => s.user === "student" && /^203\.0\.113\.(10|20|30|40|50)$/.test(s.ip)));
check("server names", SERVERS.map((s) => s.name).join(",") === "NewYork,Chicago,Charlotte,LosAngeles,Miami");
check("city labels", SERVERS.map((s) => s.city).join(",") === "NY,CHI,CLT,LA,MIA");

const homes = {};
SERVERS.forEach((s) => { homes[s.name] = makeWorld().servers[s.name]; });
check("separate state objects", new Set(Object.values(homes)).size === 5);

let world = makeWorld();
const warm = [
  "ssh student@203.0.113.10",
  "whoami",
  "pwd",
  "ls -la",
  "cd /etc",
  "cd",
  'echo "study ssh" > todo.txt',
  'cp -p "dont look here" "dont look here.bak"',
  "exit",
  "ssh student@203.0.113.20",
];
warm.forEach((cmd, step) => {
  const r = attempt(world, 0, step, cmd);
  world = r.world;
  const detail = r.ok ? "" : (r.lines || []).map((l) => l.kind + " " + l.text).join(" | ");
  check(`warm-up ${step + 1} ${cmd}`, r.ok, detail);
});
check("warm-up ends on Chicago", world.host === "Chicago");
check("todo.txt only on NewYork", world.servers.NewYork.fs["/home/student/todo.txt"]?.content === "study ssh\n" && !world.servers.Chicago.fs["/home/student/todo.txt"] && !world.servers.Miami.fs["/home/student/todo.txt"]);

const old = attempt(makeWorld(), 0, 0, "ssh travis@45.77.77.175");
check("old IP does not log in", !old.ok && old.world.host === null);

const spots = [
  { mission: 1, home: "203.0.113.30", short: "Kernel", cmd: "uname -r", login: true },
  { mission: 2, home: "203.0.113.40", short: "/proc", cmd: "/proc" },
  { mission: 2, home: "203.0.113.40", short: "stat", cmd: "stat notes.txt", login: true },
  { mission: 2, home: "203.0.113.40", short: "rsync", cmd: "rsync -az projects/ student@203.0.113.50:/backup/", login: true },
  { mission: 3, home: "203.0.113.50", short: "ps -u", cmd: "ps -u student", login: true },
  { mission: 4, home: "203.0.113.10", short: "nc", cmd: "nc -vz 203.0.113.20 22", login: true },
  { mission: 5, home: "203.0.113.20", short: "id", cmd: "id", login: true },
  { mission: 6, home: "203.0.113.30", short: "Key", cmd: "ssh-keygen -t rsa -b 4096", login: true },
  { mission: 6, home: "203.0.113.30", short: "Copy key", cmd: "ssh-copy-id student@203.0.113.40", afterKey: true },
  { mission: 7, home: "203.0.113.40", short: "u+x", cmd: "chmod u+x script.sh", login: true },
  { mission: 8, home: "203.0.113.50", short: "pull", cmd: "docker pull debian", login: true },
  { mission: 9, home: "203.0.113.10", short: "free", cmd: "free -h", login: true },
];

let keyWorld = null;
for (const spot of spots) {
  let w = spot.afterKey && keyWorld ? keyWorld : makeWorld();
  if (spot.login) {
    const login = attempt(w, 0, 0, "ssh student@" + spot.home);
    if (login.world.host == null) {
      check(`login for ${spot.short}`, false, "ssh failed");
      continue;
    }
    w = login.world;
  }
  const step = stepNamed(spot.mission, spot.short);
  const r = attempt(w, spot.mission, step, spot.cmd);
  const detail = r.ok ? "" : (r.lines || []).map((l) => l.text).join(" | ");
  check(`m${spot.mission} ${spot.short}: ${spot.cmd}`, r.ok, detail);
  if (spot.short === "Key") keyWorld = r.world;
}

const wrong = makeWorld();
const logged = attempt(wrong, 0, 0, "ssh student@203.0.113.20");
const off = attempt(logged.world, 1, stepNamed(1, "Kernel"), "uname -r");
check("mission 1 rejects Chicago", !off.ok);

if (failures.length) {
  console.error("\nFAILED");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("\nAll playthrough checks passed.");
