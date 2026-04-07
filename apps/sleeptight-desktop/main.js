import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { loadUnitsForRecentDays } from "./apple-sales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POLL_MS = 5 * 60 * 1000;
const LOOKBACK_DAYS = 14;

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function ensureConfigExample() {
  const p = configPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(p)) {
    const example = {
      ascKeyId: "YOUR_KEY_ID",
      ascIssuerId: "YOUR_ISSUER_UUID",
      ascPrivateKeyPath: "/full/path/to/AuthKey_XXXXX.p8",
      vendorNumber: "YOUR_VENDOR_NUMBER",
      appAppleId: "YOUR_APP_NUMERIC_APPLE_ID",
    };
    fs.writeFileSync(p, JSON.stringify(example, null, 2), "utf8");
  }
}

let mainWindow;
let pollTimer;

async function fetchAndBroadcast() {
  const cfgFile = configPath();
  if (!fs.existsSync(cfgFile)) {
    mainWindow?.webContents.send("stats-update", {
      ok: false,
      error: "No config.json yet — see folder that opens from the button below.",
      rows: [],
      sum: 0,
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  } catch (e) {
    mainWindow?.webContents.send("stats-update", {
      ok: false,
      error: `Invalid config.json: ${e.message}`,
      rows: [],
      sum: 0,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  try {
    const rows = await loadUnitsForRecentDays(cfg, LOOKBACK_DAYS);
    const sum = rows.reduce((s, r) => s + r.units, 0);
    const latest = [...rows].reverse().find((r) => !r.missing && r.units >= 0);
    mainWindow?.webContents.send("stats-update", {
      ok: true,
      error: null,
      rows,
      sum,
      latestDay: latest?.date ?? null,
      latestUnits: latest?.units ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    mainWindow?.webContents.send("stats-update", {
      ok: false,
      error: e.message || String(e),
      rows: [],
      sum: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 640,
    minWidth: 400,
    minHeight: 500,
    title: "SleepTight Board",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0d0d0f",
  });

  mainWindow.webContents.once("did-finish-load", () => {
    void fetchAndBroadcast();
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureConfigExample();
  createWindow();
  pollTimer = setInterval(fetchAndBroadcast, POLL_MS);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (pollTimer) clearInterval(pollTimer);
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-stats", async () => {
  await fetchAndBroadcast();
  return true;
});

ipcMain.handle("open-config-folder", () => {
  shell.openPath(path.dirname(configPath()));
  return true;
});
