const sumEl = document.getElementById("sum-display");
const metaEl = document.getElementById("meta");
const errorEl = document.getElementById("error");
const gridEl = document.getElementById("grid");

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString();
}

function render(data) {
  if (!data.ok) {
    errorEl.hidden = false;
    errorEl.textContent = data.error || "Unknown error";
    sumEl.textContent = "—";
    metaEl.textContent = `Updated ${new Date(data.updatedAt).toLocaleString()}`;
    gridEl.innerHTML = "";
    return;
  }

  errorEl.hidden = true;
  sumEl.textContent = fmt(data.sum);
  const t = new Date(data.updatedAt).toLocaleString();
  metaEl.textContent = data.latestDay
    ? `Latest day with data: ${data.latestDay} · ${fmt(data.latestUnits)} units · refreshed ${t}`
    : `Refreshed ${t}`;

  const rows = data.rows || [];
  gridEl.innerHTML = "";
  const h1 = document.createElement("div");
  h1.className = "grid-head";
  h1.textContent = "Date";
  const h2 = document.createElement("div");
  h2.className = "grid-head cell-num";
  h2.textContent = "Units";
  const h3 = document.createElement("div");
  h3.className = "grid-head cell-num";
  h3.textContent = "Rows";
  gridEl.append(h1, h2, h3);

  for (const r of rows) {
    const d = document.createElement("div");
    d.className = "cell" + (r.missing ? " missing" : "");
    d.textContent = r.date;
    const u = document.createElement("div");
    u.className = "cell cell-num" + (r.missing ? " missing" : "");
    u.textContent = r.missing ? "—" : fmt(r.units);
    const n = document.createElement("div");
    n.className = "cell cell-num missing";
    n.textContent = r.missing ? "n/a" : String(r.rows);
    gridEl.append(d, u, n);
  }
}

window.board.onStats(render);

document.getElementById("refresh").addEventListener("click", () => {
  metaEl.textContent = "Refreshing…";
  window.board.getStats();
});

document.getElementById("config").addEventListener("click", () => {
  window.board.openConfigFolder();
});
