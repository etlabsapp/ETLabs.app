import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("board", {
  getStats: () => ipcRenderer.invoke("get-stats"),
  openConfigFolder: () => ipcRenderer.invoke("open-config-folder"),
  onStats: (cb) => {
    ipcRenderer.on("stats-update", (_e, data) => cb(data));
  },
});
